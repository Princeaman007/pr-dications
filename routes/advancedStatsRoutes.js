// routes/advancedStatsRoutes.js
const express = require("express");
const router = express.Router();
const getAdvancedStats = require("../services/advancedStatsService");

// Fonction utilitaire pour normaliser les noms d'équipes
const normalizeTeamName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
};

router.get("/", async (req, res) => {
  const { team } = req.query;
  
  // Validation améliorée de l'entrée
  if (!team) {
    return res.status(400).json({ error: "Équipe manquante" });
  }
  
  const normalizedTeam = normalizeTeamName(team);
  if (!normalizedTeam) {
    return res.status(400).json({ error: "Nom d'équipe invalide après normalisation" });
  }

  try {
    const stats = await getAdvancedStats(normalizedTeam);
    
    // Vérifier que le service a bien retourné des données
    if (!stats) {
      return res.status(404).json({ error: "Aucune statistique trouvée pour cette équipe" });
    }
    
    // Ajouter le nom de l'équipe normalisé dans la réponse
    res.json({
      team: normalizedTeam,
      ...stats
    });
    
  } catch (err) {
    // Journalisation améliorée avec le nom de l'équipe pour faciliter le débogage
    console.error(`Erreur /advanced-stats pour l'équipe "${normalizedTeam}":`, err.message);
    
    // Personnaliser le message d'erreur en fonction du type d'erreur si possible
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: "Données invalides" });
    } else if (err.name === 'DocumentNotFoundError') {
      return res.status(404).json({ error: "Équipe non trouvée" });
    }
    
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;