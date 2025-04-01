// routes/confrontationsRoutes.js
const express = require("express");
const router = express.Router();
const Match = require("../models/Match");

// Fonction utilitaire pour normaliser les noms d'équipes
const normalizeTeamName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
};

router.get("/", async (req, res) => {
  try {
    const matches = await Match.find({}, { homeTeam: 1, awayTeam: 1, _id: 0 });
    
    if (!matches || !Array.isArray(matches)) {
      return res.status(500).json({ error: "Format de données invalide" });
    }
    
    const confrontationSet = new Set();
    const invalidMatches = [];

    for (const match of matches) {
      // Vérifier que les propriétés homeTeam et awayTeam existent et sont valides
      const homeTeam = normalizeTeamName(match.homeTeam);
      const awayTeam = normalizeTeamName(match.awayTeam);
      
      if (!homeTeam || !awayTeam) {
        invalidMatches.push(match);
        continue;
      }
      
      // Triez les équipes pour garantir la cohérence (indépendant de l'ordre)
      const teams = [homeTeam, awayTeam].sort();
      const key = `${teams[0]}|||${teams[1]}`;
      confrontationSet.add(key);
    }

    // Journaliser le nombre de matchs invalides trouvés
    if (invalidMatches.length > 0) {
      console.warn(`⚠️ ${invalidMatches.length} matchs avec des équipes invalides ont été ignorés`);
    }

    const uniqueConfrontations = [...confrontationSet]
      .map(pair => {
        const [team1, team2] = pair.split("|||");
        return { team1, team2 };
      })
      .sort((a, b) => a.team1.localeCompare(b.team1) || a.team2.localeCompare(b.team2));

    res.json({
      total: uniqueConfrontations.length,
      confrontations: uniqueConfrontations
    });
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des confrontations:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;