// routes/scorersRoutes.js
const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const { getScorersFromAPI } = require("../services/scorerService");

// Vérifie tous les matches en BDD
router.get("/verify-all", async (req, res) => {
  try {
    const matches = await Match.find({ gameId: { $exists: true } });
    const result = [];

    for (const match of matches) {
      const scorers = await getScorersFromAPI(match.gameId);

      result.push({
        gameId: match.gameId,
        date: match.date,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        scorers
      });
    }

    res.json(result);
  } catch (err) {
    console.error("❌ Erreur route scorers/verify-all:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Vérifie un match spécifique via gameId
router.get("/:gameId", async (req, res) => {
  const { gameId } = req.params;
  try {
    const scorers = await getScorersFromAPI(gameId);
    res.json({ gameId, scorers });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des scorers." });
  }
});

module.exports = router;
