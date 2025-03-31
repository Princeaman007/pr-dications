// routes/headToHeadRoutes.js
const express = require("express");
const router = express.Router();
const Match = require("../models/Match");

// 🔧 Fonction utilitaire
const normalizeTeamName = (name) => name.trim().replace(/\s+/g, ' ');

router.post("/", async (req, res) => {
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

    // Statistiques générales
    let teamAWins = 0;
    let teamBWins = 0;
    let draws = 0;
    let teamAGoals = 0;
    let teamBGoals = 0;
    const history = [];

    matches.forEach(match => {
      const isTeamAHome = match.homeTeam.includes(teamANormalized);
      const teamAScore = isTeamAHome ? match.homeScore : match.awayScore;
      const teamBScore = isTeamAHome ? match.awayScore : match.homeScore;

      history.push({
        date: match.date,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        score: `${match.homeScore}-${match.awayScore}`,
        result:
          teamAScore > teamBScore ? teamANormalized :
          teamBScore > teamAScore ? teamBNormalized : "Draw"
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
      if (!match.scorers || !match.scorers.length) continue;

      const participants = new Map();

      for (const s of match.scorers) {
        if (!s.name || typeof s.name !== 'string') continue;
        const name = s.name.trim();

        if (!scorersStats[name]) {
          scorersStats[name] = { goals: 0, assists: 0, matches: 0 };
        }

        scorersStats[name].goals += s.goals || 0;
        scorersStats[name].assists += s.assists || 0;
        scorersStats[name].matches += 1;

        participants.set(name, {
          goals: s.goals || 0,
          assists: s.assists || 0
        });
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

    return res.json({
      history,
      stats: {
        teamA: teamANormalized,
        teamB: teamBNormalized,
        teamAWins,
        teamBWins,
        draws,
        teamAGoals,
        teamBGoals,
        avgGoalsPerMatch: ((teamAGoals + teamBGoals) / matches.length).toFixed(2)
      },
      topScorers,
      topDuos
    });

  } catch (err) {
    console.error("Erreur route head-to-head:", err.message);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
