// routes/teamDuosRoutes.js
const express = require("express");
const router = express.Router();
const { analyzeTeamDuos } = require("../services/teamDuosService");

// Fonction utilitaire pour normaliser les noms d'équipes (similaire aux autres routes)
const normalizeTeamName = (name) => {
  if (!name || typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ");
};

// Route principale : GET /api/team-duos?team=Toronto%20Maple%20Leafs
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
    console.log(`🔍 Requête d'analyse des duos pour ${normalizedTeam}`);
    const analysisResult = await analyzeTeamDuos(normalizedTeam);

    // Succès
    res.json({
      team: normalizedTeam,
      ...analysisResult
    });
  } catch (err) {
    console.error(
      `❌ Erreur /team-duos pour "${normalizedTeam}":`,
      err.message
    );

    if (err.name === "ValidationError") {
      return res.status(400).json({ error: "Données invalides" });
    }

    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour les matchs spécifiques où un duo a joué
router.get("/duo-matches", async (req, res) => {
  const { team, player1, player2 } = req.query;

  if (!team || !player1 || !player2) {
    return res.status(400).json({ 
      error: "Paramètres manquants", 
      message: "Les paramètres team, player1 et player2 sont tous requis" 
    });
  }

  const normalizedTeam = normalizeTeamName(team);
  if (!normalizedTeam) {
    return res
      .status(400)
      .json({ error: "Nom d'équipe invalide après normalisation" });
  }

  try {
    console.log(`🔍 Requête des matchs pour le duo ${player1} & ${player2} (${normalizedTeam})`);
    const analysis = await analyzeTeamDuos(normalizedTeam);
    
    // Trouver le duo spécifique
    const duo = analysis.duos.find(d => 
      d.players.includes(player1) && d.players.includes(player2)
    );
    
    if (!duo) {
      return res.status(404).json({ 
        error: "Duo non trouvé", 
        message: `Aucun match trouvé où ${player1} et ${player2} ont marqué ensemble pour ${normalizedTeam}` 
      });
    }
    
    res.json({
      team: normalizedTeam,
      duo: {
        players: duo.players,
        matches: duo.matches,
        totalGoals: duo.totalGoals,
        winRate: duo.winRate,
        matchList: duo.matchList
      }
    });
  } catch (err) {
    console.error(
      `❌ Erreur /team-duos/duo-matches:`,
      err.message
    );
    
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;