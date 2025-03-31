// routes/confrontationsRoutes.js
const express = require("express");
const router = express.Router();
const Match = require("../models/Match");

router.get("/", async (req, res) => {
  try {
    const matches = await Match.find({}, { homeTeam: 1, awayTeam: 1, _id: 0 });
    const confrontationSet = new Set();

    for (const match of matches) {
      if (!match.homeTeam || !match.awayTeam) continue;
      const teams = [match.homeTeam, match.awayTeam].sort();
      const key = `${teams[0]}|||${teams[1]}`;
      confrontationSet.add(key);
    }

    const uniqueConfrontations = [...confrontationSet].map(pair =>
      pair.split("|||")
    );

    res.json({
      total: uniqueConfrontations.length,
      confrontations: uniqueConfrontations.map(([team1, team2]) => ({
        team1,
        team2
      }))
    });
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des confrontations:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
