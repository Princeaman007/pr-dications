const express = require("express");
const router = express.Router();
const generateAdvancedStats = require("../services/advancedStatsService");

// Fonction utilitaire pour normaliser les noms d'équipes
const normalizeTeamName = (name) => {
  if (!name || typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ");
};

// Route : /api/advanced-stats?team=TOR
router.get("/", async (req, res) => {
  const { team } = req.query;

  // Vérifier que l'équipe est bien fournie
  if (!team) {
    return res.status(400).json({ error: "Équipe manquante" });
  }

  const normalizedTeam = normalizeTeamName(team);
  if (!normalizedTeam) {
    return res
      .status(400)
      .json({ error: "Nom d'équipe invalide après normalisation" });
  }

  try {
    const stats = await generateAdvancedStats(normalizedTeam);

    // Aucun résultat trouvé
    if (!stats) {
      return res
        .status(404)
        .json({ error: "Aucune statistique trouvée pour cette équipe" });
    }

    // Succès
    res.json({
      team: normalizedTeam,
      ...stats,
    });
  } catch (err) {
    console.error(
      `❌ Erreur /advanced-stats pour "${normalizedTeam}":`,
      err.message
    );

    if (err.name === "ValidationError") {
      return res.status(400).json({ error: "Données invalides" });
    }

    if (err.name === "DocumentNotFoundError") {
      return res.status(404).json({ error: "Équipe non trouvée" });
    }

    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
