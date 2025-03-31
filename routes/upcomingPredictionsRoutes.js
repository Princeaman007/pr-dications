// routes/upcomingPredictionsRoutes.js
const express = require("express");
const router = express.Router();
const fetchUpcomingWithPredictions = require("../services/upcomingPredictionService");

router.get("/", async (req, res) => {
  try {
    const result = await fetchUpcomingWithPredictions();
    res.json(result);
  } catch (err) {
    console.error("❌ Erreur API upcoming-predictions:", err);
    res.status(500).json({ error: "Erreur lors de la génération des prédictions" });
  }
});

module.exports = router;
