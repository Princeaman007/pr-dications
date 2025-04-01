// services/advancedStatsService.js
const Match = require("../models/Match");

// convertit mm:ss → secondes
const normalizeTime = (timeStr) => {
  if (!timeStr) return 9999;
  try {
    const [min, sec] = timeStr.split(":").map(Number);
    if (isNaN(min) || isNaN(sec)) return 9999;
    return min * 60 + sec;
  } catch (error) {
    console.warn(`⚠️ Erreur lors de la conversion du temps "${timeStr}": ${error.message}`);
    return 9999;
  }
};

const generateAdvancedStats = async (TEAM) => {
  try {
    console.log(`📊 Génération des statistiques avancées pour ${TEAM}`);
    
    if (!TEAM) {
      console.error("❌ Aucune équipe spécifiée");
      return { message: "Aucune équipe spécifiée." };
    }
    
    const matches = await Match.find({
      $or: [{ homeTeam: TEAM }, { awayTeam: TEAM }],
      status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
    });

    if (!matches.length) {
      console.warn(`⚠️ Aucun match trouvé pour ${TEAM}`);
      return { message: `Aucun match trouvé pour ${TEAM}.` };
    }

    console.log(`✅ ${matches.length} matchs trouvés pour ${TEAM}`);

    const playerStats = {}, teamMatchups = {}, playerStreaks = {}, firstGoalStats = {};
    const teamGoals = { for: 0, against: 0 };

    for (const match of matches) {
      try {
        const isHome = match.homeTeam === TEAM;
        const opponent = isHome ? match.awayTeam : match.homeTeam;
        teamMatchups[opponent] = (teamMatchups[opponent] || 0) + 1;

        // Calculer les buts pour/contre
        if (match.homeScore !== undefined && match.awayScore !== undefined) {
          const goalsFor = isHome ? match.homeScore : match.awayScore;
          const goalsAgainst = isHome ? match.awayScore : match.homeScore;
          teamGoals.for += goalsFor;
          teamGoals.against += goalsAgainst;
        }

        // Traiter les buteurs et assistants
        for (const s of match.scorers || []) {
          if (!s || !s.name) continue;
          
          const name = s.name;
          const isTeamPlayer = !s.team || 
                              (isHome && s.team === "home") ||
                              (!isHome && s.team === "away");
          
          // Ne compter que les joueurs de l'équipe spécifiée
          if (!isTeamPlayer) continue;

          if (!playerStats[name]) playerStats[name] = { 
            goals: 0, 
            assists: 0, 
            matches: 0,
            points: 0
          };
          
          playerStats[name].goals += s.goals || 0;
          playerStats[name].assists += s.assists || 0;
          playerStats[name].matches++;
          playerStats[name].points = playerStats[name].goals + playerStats[name].assists;

          if (!playerStreaks[name]) playerStreaks[name] = { current: 0, max: 0 };

          if (s.goals > 0) {
            playerStreaks[name].current++;
            playerStreaks[name].max = Math.max(playerStreaks[name].max, playerStreaks[name].current);
          } else {
            playerStreaks[name].current = 0;
          }
        }

        // Traiter les buts individuels pour statistiques de timing
        for (const goal of match.goals || []) {
          try {
            // Vérifier si le but est pour l'équipe analysée
            const isGoalForTeam = (isHome && goal.teamCode === match.homeTeamCode) ||
                                (!isHome && goal.teamCode === match.awayTeamCode);
            
            if (!isGoalForTeam) continue;
            
            const name =
              goal?.scorer?.fullName || goal?.scorer?.name ||
              (goal?.scorerFirstName && goal?.scorerLastName
                ? `${goal.scorerFirstName} ${goal.scorerLastName}`
                : null);

            if (name) {
              const time = normalizeTime(goal.timeInPeriod || goal.time);
              if (!firstGoalStats[name] || time < firstGoalStats[name]) {
                firstGoalStats[name] = time;
              }
            }
          } catch (goalErr) {
            console.warn(`⚠️ Erreur lors du traitement d'un but: ${goalErr.message}`);
          }
        }
      } catch (matchErr) {
        console.warn(`⚠️ Erreur lors du traitement du match: ${matchErr.message}`);
      }
    }

    // Calculer les moyennes de buts par match
    const gamesPlayed = matches.length;
    const goalsForAvg = gamesPlayed > 0 ? +(teamGoals.for / gamesPlayed).toFixed(2) : 0;
    const goalsAgainstAvg = gamesPlayed > 0 ? +(teamGoals.against / gamesPlayed).toFixed(2) : 0;

    // Meilleurs buteurs
    const bestScorers = Object.entries(playerStats)
      .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists);
    const bestScorer = bestScorers.length > 0 ? bestScorers[0] : null;

    // Meilleurs passeurs
    const bestAssists = Object.entries(playerStats)
      .sort((a, b) => b[1].assists - a[1].assists);
    const topAssist = bestAssists.length > 0 ? bestAssists[0] : null;

    // Meilleurs pointeurs (buts + passes)
    const bestPoints = Object.entries(playerStats)
      .sort((a, b) => b[1].points - a[1].points);
    const topPoints = bestPoints.length > 0 ? bestPoints[0] : null;

    // Buteurs les plus rapides
    const earliestScorers = Object.entries(firstGoalStats).sort((a, b) => a[1] - b[1]);
    const earliestScorer = earliestScorers.length > 0 ? {
      name: earliestScorers[0][0],
      seconds: earliestScorers[0][1],
      timeFormatted: `${Math.floor(earliestScorers[0][1] / 60)}:${String(earliestScorers[0][1] % 60).padStart(2, '0')}`
    } : null;

    // Adversaires les plus fréquents
    const topOpponents = Object.entries(teamMatchups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([team, count]) => ({ team, count }));

    // Meilleures séries de buts consécutifs
    const topStreaks = Object.entries(playerStreaks)
      .sort((a, b) => b[1].max - a[1].max)
      .slice(0, 5)
      .map(([name, streaks]) => ({ name, max: streaks.max, current: streaks.current }));

    // Efficacité (buts par match)
    const efficiency = Object.entries(playerStats)
      .filter(([_, s]) => s.matches >= 3 && s.goals > 0)
      .map(([name, s]) => ({
        name,
        goals: s.goals,
        matches: s.matches,
        efficiency: +(s.goals / s.matches).toFixed(2)
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5);

    console.log(`✅ Statistiques générées avec succès pour ${TEAM}`);

    return {
      team: TEAM,
      gamesPlayed,
      goals: teamGoals,
      goalsForAvg,
      goalsAgainstAvg,
      bestScorer,
      topPoints,
      topAssist,
      earliestScorer,
      topOpponents,
      topStreaks,
      efficiency
    };
  } catch (error) {
    console.error(`❌ Erreur lors de la génération des statistiques: ${error.message}`);
    return { 
      message: "Erreur lors de la génération des statistiques.", 
      error: error.message 
    };
  }
};

module.exports = generateAdvancedStats;