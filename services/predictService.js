const Match = require("../models/Match");

// Alias pour normaliser les noms d’équipes
const teamAliases = {
  "Wild": "Minnesota Wild", "MIN": "Minnesota Wild", "Minnesota Wild": "Minnesota Wild",
  "Devils": "New Jersey Devils", "NJD": "New Jersey Devils", "New Jersey Devils": "New Jersey Devils",
  "Predators": "Nashville Predators", "NSH": "Nashville Predators", "Nashville Predators": "Nashville Predators",
  "Flyers": "Philadelphia Flyers", "PHI": "Philadelphia Flyers", "Philadelphia Flyers": "Philadelphia Flyers",
  "Flames": "Calgary Flames", "CGY": "Calgary Flames", "Calgary Flames": "Calgary Flames",
  "Avalanche": "Colorado Avalanche", "COL": "Colorado Avalanche", "Colorado Avalanche": "Colorado Avalanche",
  "Stars": "Dallas Stars", "DAL": "Dallas Stars", "Dallas Stars": "Dallas Stars",
  "Kraken": "Seattle Kraken", "SEA": "Seattle Kraken", "Seattle Kraken": "Seattle Kraken"
};

const teamVariations = {};
Object.entries(teamAliases).forEach(([alias, full]) => {
  if (!teamVariations[full]) teamVariations[full] = new Set();
  teamVariations[full].add(alias);
  teamVariations[full].add(full);
});

const normalizeTeamName = (name) => {
  if (!name) return "Équipe inconnue";
  return teamAliases[name] || name;
};

// 🔮 Prédiction entre deux équipes
const predictScorersBetweenTeams = async (teamA, teamB, limit = 3) => {
  const teamAVars = Array.from(teamVariations[teamA] || [teamA]);
  const teamBVars = Array.from(teamVariations[teamB] || [teamB]);

  const query = {
    $or: [],
    status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
  };

  for (const a of teamAVars) {
    for (const b of teamBVars) {
      query.$or.push({ homeTeam: a, awayTeam: b });
      query.$or.push({ homeTeam: b, awayTeam: a });
    }
  }

  const matches = await Match.find(query).sort({ date: -1 });
// 🔍 DEBUG — Affiche les 10 derniers matchs depuis 2024
const recentMatches = await Match.find({
    date: { $gte: new Date("2024-01-01") }
  }).sort({ date: -1 }).limit(10);
  
  console.log("🎯 Matchs récents trouvés :", recentMatches.map(m => ({
    date: m.date,
    home: m.homeTeam,
    away: m.awayTeam,
    score: `${m.homeScore}-${m.awayScore}`,
    status: m.status
  })));
  

  if (!matches.length) {
    return await predictBasedOnTeamStats(teamA, teamB, limit);
  }

  const playerStats = {}, synergyMap = {};
  const recentWeight = 1.5;

  const latestMatchDate = new Date(Math.max(...matches.map(m => new Date(m.date))));

  matches.forEach(match => {
    const date = new Date(match.date);
    const daysSince = Math.floor((latestMatchDate - date) / (1000 * 60 * 60 * 24));
    const weightFactor = Math.max(0.5, 1 - daysSince / 365) * recentWeight;

    const scorers = match.scorers || [];
    const activeScorers = scorers.filter(s => s?.goals > 0);

    for (const s of scorers) {
      if (!s?.name) continue;
      const name = s.name;
      if (!playerStats[name]) {
        playerStats[name] = { goals: 0, assists: 0, appearances: 0, weightedGoals: 0, weightedAssists: 0 };
      }
      playerStats[name].goals += s.goals || 0;
      playerStats[name].assists += s.assists || 0;
      playerStats[name].appearances++;
      playerStats[name].weightedGoals += (s.goals || 0) * weightFactor;
      playerStats[name].weightedAssists += (s.assists || 0) * weightFactor;
    }

    for (let i = 0; i < activeScorers.length; i++) {
      for (let j = i + 1; j < activeScorers.length; j++) {
        const pair = [activeScorers[i].name, activeScorers[j].name].sort().join("|");
        synergyMap[pair] = (synergyMap[pair] || 0) + weightFactor;
      }
    }
  });

  const teamAGoals = matches.reduce((sum, m) =>
    teamAVars.includes(m.homeTeam) ? sum + m.homeScore : teamAVars.includes(m.awayTeam) ? sum + m.awayScore : sum, 0
  );
  const teamBGoals = matches.reduce((sum, m) =>
    teamBVars.includes(m.homeTeam) ? sum + m.homeScore : teamBVars.includes(m.awayTeam) ? sum + m.awayScore : sum, 0
  );

  const sortedScorers = Object.entries(playerStats)
    .map(([name, s]) => ({
      name,
      score: s.weightedGoals + s.weightedAssists * 0.5,
      goals: s.goals,
      assists: s.assists,
      appearances: s.appearances,
      efficiency: s.appearances > 0 ? s.goals / s.appearances : 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const topSynergy = Object.entries(synergyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([key, count]) => ({
      pair: key.split("|"),
      matchesTogether: Math.round(count * 10) / 10
    }));

  return {
    sortedScorers,
    topSynergy,
    matchCount: matches.length,
    teamAGoals,
    teamBGoals,
    source: "direct"
  };
};

// 📊 Si aucune confrontation directe, prédire à partir des 10 derniers matchs
const predictBasedOnTeamStats = async (teamA, teamB, limit = 3) => {
  const teamAVars = Array.from(teamVariations[teamA] || [teamA]);
  const teamBVars = Array.from(teamVariations[teamB] || [teamB]);

  const getTeamMatches = async (vars) => {
    return Match.find({
      $or: [
        ...vars.map(t => ({ homeTeam: t })),
        ...vars.map(t => ({ awayTeam: t }))
      ],
      status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
    }).sort({ date: -1 }).limit(10);
  };

  const teamAMatches = await getTeamMatches(teamAVars);
  const teamBMatches = await getTeamMatches(teamBVars);

  const buildPlayerMap = (matches, vars) => {
    const map = {};
    for (const match of matches) {
      const isHome = vars.includes(match.homeTeam);
      const scorers = match.scorers || [];
      for (const s of scorers) {
        if (!s?.name) continue;
        const isFromTeam = isHome ? s.team === "home" || !s.team : s.team === "away" || !s.team;
        if (!isFromTeam) continue;

        if (!map[s.name]) map[s.name] = { goals: 0, assists: 0, appearances: 0 };
        map[s.name].goals += s.goals || 0;
        map[s.name].assists += s.assists || 0;
        map[s.name].appearances++;
      }
    }
    return map;
  };

  const teamAStats = buildPlayerMap(teamAMatches, teamAVars);
  const teamBStats = buildPlayerMap(teamBMatches, teamBVars);

  const combineAndSort = (statsA, statsB) => {
    return [...Object.entries(statsA), ...Object.entries(statsB)]
      .map(([name, s]) => ({
        name,
        goals: s.goals,
        assists: s.assists,
        appearances: s.appearances,
        score: s.goals + s.assists * 0.5,
        efficiency: s.appearances > 0 ? s.goals / s.appearances : 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };

  const sortedScorers = combineAndSort(teamAStats, teamBStats);

  const avgGoals = (matches, vars) => {
    return matches.length > 0
      ? matches.reduce((sum, m) =>
        vars.includes(m.homeTeam) ? sum + m.homeScore : vars.includes(m.awayTeam) ? sum + m.awayScore : sum, 0
      ) / matches.length
      : 0;
  };

  return {
    sortedScorers,
    topSynergy: [],
    matchCount: Math.max(teamAMatches.length, teamBMatches.length),
    teamAGoals: Math.round(avgGoals(teamAMatches, teamAVars) * 10) / 10,
    teamBGoals: Math.round(avgGoals(teamBMatches, teamBVars) * 10) / 10,
    source: "individual"
  };
};

module.exports = {
  predictScorersBetweenTeams,
  predictBasedOnTeamStats,
  normalizeTeamName
};
