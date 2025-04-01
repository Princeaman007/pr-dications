const express = require("express");
const router = express.Router();
const Match = require("../models/Match");

router.get("/", async (req, res) => {
  try {
    console.log("🔍 Récupération de la liste des équipes...");
    
    // Récupérer les équipes uniques à partir des matchs
    const matches = await Match.find({}, { homeTeam: 1, awayTeam: 1, _id: 0 });
    
    if (!matches || matches.length === 0) {
      console.log("⚠️ Aucun match trouvé en base de données");
      return res.json([]);
    }
    
    const teamSet = new Set();

    for (const match of matches) {
      if (match.homeTeam) teamSet.add(match.homeTeam);
      if (match.awayTeam) teamSet.add(match.awayTeam);
    }

    // Filtrer les valeurs non valides et trier alphabétiquement
    const teams = Array.from(teamSet)
      .filter(team => team && typeof team === 'string' && team.trim() !== '')
      .sort();
    
    console.log(`✅ ${teams.length} équipes uniques trouvées`);
    
    // Cache-Control pour améliorer les performances (1 heure)
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(teams);
  } catch (err) {
    console.error("❌ Erreur récupération des équipes:", err);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des équipes", 
      message: err.message 
    });
  }
});

module.exports = router;