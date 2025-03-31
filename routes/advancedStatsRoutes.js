const express = require("express");
const router = express.Router();
const getAdvancedStats = require("../services/advancedStatsService");

router.get("/", async (req, res) => {
  const { team } = req.query;
  if (!team) {
    return res.status(400).json({ error: "Équipe manquante" });
  }

  try {
    const stats = await getAdvancedStats(team);
    res.json(stats);
  } catch (err) {
    console.error("Erreur /advanced-stats:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
