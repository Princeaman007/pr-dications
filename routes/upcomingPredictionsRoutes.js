// routes/upcomingPredictionsRoutes.js
const express = require("express");
const router = express.Router();
const fetchUpcomingWithPredictions = require("../services/upcomingPredictionService");

router.get("/", async (req, res) => {
  try {
    console.log("🔍 Récupération des prédictions pour les matchs à venir...");
    const result = await fetchUpcomingWithPredictions();
    
    // Vérifier si le résultat est vide
    if (Object.keys(result).length === 0) {
      console.log("⚠️ Aucun match à venir trouvé");
      return res.json({ message: "Aucun match à venir trouvé" });
    }
    
    console.log(`✅ ${Object.keys(result).length} jours de matchs trouvés avec prédictions`);
    res.json(result);
  } catch (err) {
    console.error("❌ Erreur API upcoming-predictions:", err);
    res.status(500).json({ 
      error: "Erreur lors de la génération des prédictions",
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = router;