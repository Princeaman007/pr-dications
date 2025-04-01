const express = require("express");
const router = express.Router();
const Match = require("../models/Match");

// 🔧 Fonction utilitaire
const normalizeTeamName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
};

// ROUTE PRINCIPALE - statistiques générales
router.post("/", async (req, res) => {
  const { teamA, teamB } = req.body;

  if (!teamA || !teamB) {
    return res.status(400).json({ error: "Les deux équipes doivent être fournies." });
  }

  const teamANormalized = normalizeTeamName(teamA);
  const teamBNormalized = normalizeTeamName(teamB);

  if (teamANormalized === '' || teamBNormalized === '') {
    return res.status(400).json({ error: "Les noms d'équipes ne peuvent pas être vides après normalisation." });
  }

  try {
    const matches = await Match.find({
      $or: [
        {
          homeTeam: { $regex: new RegExp(teamANormalized, 'i') },
          awayTeam: { $regex: new RegExp(teamBNormalized, 'i') }
        },
        {
          homeTeam: { $regex: new RegExp(teamBNormalized, 'i') },
          awayTeam: { $regex: new RegExp(teamANormalized, 'i') }
        }
      ]
    }).sort({ date: 1 });

    if (!matches || !matches.length) {
      return res.status(404).json({ message: "Aucune confrontation trouvée." });
    }

    // Statistiques générales
    let teamAWins = 0;
    let teamBWins = 0;
    let draws = 0;
    let teamAGoals = 0;
    let teamBGoals = 0;
    const history = [];

    matches.forEach(match => {
      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;
      const homeTeamLower = match.homeTeam.toLowerCase();
      const isTeamAHome = homeTeamLower.includes(teamANormalized.toLowerCase());

      const teamAScore = isTeamAHome ? homeScore : awayScore;
      const teamBScore = isTeamAHome ? awayScore : homeScore;

      history.push({
        date: match.date,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        score: `${homeScore}-${awayScore}`,
        result:
          teamAScore > teamBScore ? teamANormalized :
          teamBScore > teamAScore ? teamBNormalized : "Match nul"
      });

      teamAGoals += teamAScore;
      teamBGoals += teamBScore;

      if (teamAScore > teamBScore) teamAWins++;
      else if (teamBScore > teamAScore) teamBWins++;
      else draws++;
    });

    // Analyse des buteurs
    const scorersStats = {};
    const duoStats = {};

    for (const match of matches) {
      if (!match.scorers || !Array.isArray(match.scorers)) continue;
      const participants = new Map();

      for (const s of match.scorers) {
        if (!s || !s.name || typeof s.name !== 'string') continue;
        const name = s.name.trim();
        if (name === '') continue;

        if (!scorersStats[name]) {
          scorersStats[name] = { goals: 0, assists: 0, matches: 0 };
        }

        const goals = s.goals ?? 0;
        const assists = s.assists ?? 0;

        scorersStats[name].goals += goals;
        scorersStats[name].assists += assists;
        scorersStats[name].matches += 1;

        participants.set(name, { goals, assists });
      }

      for (const [player1, stats1] of participants.entries()) {
        if (stats1.goals > 0) {
          for (const [player2, stats2] of participants.entries()) {
            if (player1 !== player2 && stats2.assists > 0) {
              const key = `${player1} + ${player2}`;
              if (!duoStats[key]) {
                duoStats[key] = { goalsTogether: 0, matches: 0 };
              }
              duoStats[key].goalsTogether += Math.min(stats1.goals, stats2.assists);
              duoStats[key].matches += 1;
            }
          }
        }
      }
    }

    const topScorers = Object.entries(scorersStats)
      .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists)
      .slice(0, 10)
      .map(([name, stats]) => ({ name, ...stats }));

    const topDuos = Object.entries(duoStats)
      .sort((a, b) => b[1].goalsTogether - a[1].goalsTogether)
      .slice(0, 5)
      .map(([duo, data]) => ({ duo, ...data }));

    const totalMatches = matches.length;
    const avgGoalsPerMatch = totalMatches > 0
      ? ((teamAGoals + teamBGoals) / totalMatches).toFixed(2)
      : "0.00";

    return res.json({
      history,
      stats: {
        teamA: teamANormalized,
        teamB: teamBNormalized,
        totalMatches,
        teamAWins,
        teamBWins,
        draws,
        teamAGoals,
        teamBGoals,
        avgGoalsPerMatch
      },
      topScorers,
      topDuos
    });

  } catch (err) {
    console.error("Erreur route head-to-head:", err.message);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});


// 🔍 NOUVELLE ROUTE DETAILLEE - scorers & duos par match
router.post("/details", async (req, res) => {
  const { teamA, teamB } = req.body;

  if (!teamA || !teamB) {
    return res.status(400).json({ error: "Les deux équipes doivent être fournies." });
  }

  const teamANormalized = normalizeTeamName(teamA);
  const teamBNormalized = normalizeTeamName(teamB);

  try {
    const matches = await Match.find({
      $or: [
        {
          homeTeam: { $regex: new RegExp(teamANormalized, 'i') },
          awayTeam: { $regex: new RegExp(teamBNormalized, 'i') }
        },
        {
          homeTeam: { $regex: new RegExp(teamBNormalized, 'i') },
          awayTeam: { $regex: new RegExp(teamANormalized, 'i') }
        }
      ]
    }).sort({ date: 1 });

    if (!matches.length) {
      return res.status(404).json({ message: "Aucune confrontation trouvée." });
    }

    const matchDetails = [];

    for (const match of matches) {
      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;
      const scorers = Array.isArray(match.scorers) ? match.scorers : [];

      const participants = new Map();
      const duoMap = {};

      for (const s of scorers) {
        const name = s?.name?.trim();
        if (!name) continue;

        const goals = s.goals ?? 0;
        const assists = s.assists ?? 0;

        participants.set(name, { goals, assists });
      }

      for (const [p1, stats1] of participants.entries()) {
        if (stats1.goals > 0) {
          for (const [p2, stats2] of participants.entries()) {
            if (p1 !== p2 && stats2.assists > 0) {
              const key = `${p1} + ${p2}`;
              if (!duoMap[key]) duoMap[key] = 0;
              duoMap[key] += Math.min(stats1.goals, stats2.assists);
            }
          }
        }
      }

      const duos = Object.entries(duoMap).map(([duo, goalsTogether]) => ({
        duo,
        goalsTogether
      }));

      matchDetails.push({
        date: match.date,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        score: `${homeScore}-${awayScore}`,
        scorers: scorers.map(s => ({
          name: s.name,
          goals: s.goals ?? 0,
          assists: s.assists ?? 0
        })),
        duos
      });
    }

    res.json({ matchDetails });

  } catch (err) {
    console.error("❌ ERREUR dans /details:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
