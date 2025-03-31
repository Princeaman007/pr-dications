const express = require("express");
const router = express.Router();
const Match = require("../models/Match");

router.get("/", async (req, res) => {
  try {
    const matches = await Match.find({}, { homeTeam: 1, awayTeam: 1, _id: 0 });
    const teamSet = new Set();

    for (const match of matches) {
      if (match.homeTeam) teamSet.add(match.homeTeam);
      if (match.awayTeam) teamSet.add(match.awayTeam);
    }

    const teams = Array.from(teamSet).sort();
    res.json(teams);
  } catch (err) {
    console.error("❌ Erreur récupération des équipes:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
