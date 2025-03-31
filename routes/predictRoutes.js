// routes/predictRoutes.js
const express = require("express");
const router = express.Router();
const { predictScorersBetweenTeams } = require("../services/predictService");

router.get("/", async (req, res) => {
  const { teamA, teamB } = req.query;

  if (!teamA || !teamB) {
    return res.status(400).json({ error: "teamA et teamB sont requis" });
  }

  try {
    const prediction = await predictScorersBetweenTeams(teamA, teamB);
    res.json(prediction);
  } catch (err) {
    console.error("❌ Erreur API:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
