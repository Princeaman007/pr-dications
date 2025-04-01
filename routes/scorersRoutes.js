// routes/scorersRoutes.js
const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const { getScorersFromAPI } = require("../services/scorerService");

// Vérifie tous les matches en BDD
router.get("/verify-all", async (req, res) => {
  try {
    console.log("🔍 Vérification de tous les buteurs des matchs en BDD...");
    
    // Trouver tous les matchs avec un gameId
    const matches = await Match.find({ gameId: { $exists: true, $ne: null } });
    
    if (!matches || matches.length === 0) {
      console.log("⚠️ Aucun match avec gameId trouvé en base de données");
      return res.json({ message: "Aucun match trouvé avec un gameId valide", matches: [] });
    }
    
    console.log(`✅ ${matches.length} matchs trouvés avec gameId`);
    const result = [];
    let processedCount = 0;

    // Pour chaque match, récupérer les buteurs via l'API
    for (const match of matches) {
      try {
        console.log(`🏒 Récupération des buteurs pour le match #${match.gameId} (${match.homeTeam} vs ${match.awayTeam})`);
        const scorers = await getScorersFromAPI(match.gameId);
        
        result.push({
          gameId: match.gameId,
          date: match.date,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          status: match.status,
          scorers,
          scorersCount: scorers.length
        });
        
        processedCount++;
        console.log(`✅ Progression: ${processedCount}/${matches.length} matchs traités`);
      } catch (matchErr) {
        console.error(`❌ Erreur pour le match #${match.gameId}:`, matchErr.message);
        result.push({
          gameId: match.gameId,
          date: match.date,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          status: match.status,
          error: matchErr.message,
          scorers: []
        });
      }
    }

    console.log(`✅ Vérification terminée. ${processedCount}/${matches.length} matchs traités avec succès`);
    res.json({
      total: matches.length,
      processed: processedCount,
      matches: result
    });
  } catch (err) {
    console.error("❌ Erreur route scorers/verify-all:", err);
    res.status(500).json({ 
      error: "Erreur lors de la vérification des buteurs", 
      message: err.message 
    });
  }
});

// Vérifie un match spécifique via gameId
router.get("/:gameId", async (req, res) => {
  const { gameId } = req.params;
  
  if (!gameId || isNaN(parseInt(gameId))) {
    return res.status(400).json({ error: "ID de match invalide" });
  }
  
  try {
    console.log(`🔍 Récupération des buteurs pour le match #${gameId}`);
    
    // Trouver le match en BDD pour afficher des infos supplémentaires
    const matchInfo = await Match.findOne({ gameId: parseInt(gameId) });
    
    const scorers = await getScorersFromAPI(gameId);
    
    const result = {
      gameId,
      matchInfo: matchInfo ? {
        date: matchInfo.date,
        homeTeam: matchInfo.homeTeam,
        awayTeam: matchInfo.awayTeam,
        homeScore: matchInfo.homeScore,
        awayScore: matchInfo.awayScore,
        status: matchInfo.status
      } : null,
      scorersCount: scorers.length,
      scorers
    };
    
    console.log(`✅ ${scorers.length} buteurs trouvés pour le match #${gameId}`);
    res.json(result);
  } catch (err) {
    console.error(`❌ Erreur route scorers/${gameId}:`, err);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des buteurs", 
      message: err.message 
    });
  }
});

module.exports = router;