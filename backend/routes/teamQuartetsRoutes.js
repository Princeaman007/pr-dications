// routes/teamQuartetsRoutes.js
const express = require("express");
const router = express.Router();
const { analyzeTeamQuartets } = require("../services/teamQuartetsService");

// Fonction utilitaire pour normaliser les noms d'équipes
const normalizeTeamName = (name) => {
  if (!name || typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ");
};

// Route principale : GET /api/team-quartets?team=Toronto%20Maple%20Leafs
router.get("/", async (req, res) => {
  const { team, minGoals } = req.query;

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

  // Valider le paramètre minGoals s'il est fourni
  let minGoalsValue = 1;
  if (minGoals) {
    minGoalsValue = parseInt(minGoals);
    if (isNaN(minGoalsValue) || minGoalsValue < 1) {
      return res.status(400).json({ 
        error: "Paramètre minGoals invalide", 
        message: "Le nombre minimum de buts doit être un entier positif" 
      });
    }
  }

  try {
    console.log(`🔍 Requête d'analyse des quatuors pour ${normalizedTeam} (minGoals: ${minGoalsValue})`);
    const analysisResult = await analyzeTeamQuartets(normalizedTeam, "20242025", minGoalsValue);

    // Succès
    res.json({
      team: normalizedTeam,
      minGoals: minGoalsValue,
      ...analysisResult
    });
  } catch (err) {
    console.error(
      `❌ Erreur /team-quartets pour "${normalizedTeam}":`,
      err.message
    );

    if (err.name === "ValidationError") {
      return res.status(400).json({ error: "Données invalides" });
    }

    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour obtenir les détails d'un quatuor spécifique
router.get("/quartet-details", async (req, res) => {
  const { team, players } = req.query;

  if (!team || !players) {
    return res.status(400).json({ 
      error: "Paramètres manquants", 
      message: "Les paramètres team et players sont tous requis" 
    });
  }

  // S'assurer que players est un tableau de 4 noms de joueurs
  let playersList;
  try {
    playersList = JSON.parse(players);
    if (!Array.isArray(playersList) || playersList.length !== 4) {
      throw new Error("Format incorrect");
    }
  } catch (err) {
    return res.status(400).json({ 
      error: "Format de paramètre players invalide", 
      message: "players doit être un tableau JSON de 4 noms de joueurs"
    });
  }

  const normalizedTeam = normalizeTeamName(team);
  if (!normalizedTeam) {
    return res
      .status(400)
      .json({ error: "Nom d'équipe invalide après normalisation" });
  }

  try {
    console.log(`🔍 Requête des détails pour le quatuor dans l'équipe ${normalizedTeam}`);
    const analysis = await analyzeTeamQuartets(normalizedTeam);
    
    // Trouver le quatuor spécifique
    // Comme les joueurs sont triés alphabétiquement dans l'analyse, nous devons faire pareil ici
    const sortedPlayers = [...playersList].sort();
    
    const quartet = analysis.quartets.find(q => 
      q.players.length === sortedPlayers.length && 
      q.players.every((p, i) => p === sortedPlayers[i])
    );
    
    if (!quartet) {
      return res.status(404).json({ 
        error: "Quatuor non trouvé", 
        message: `Aucun match trouvé où ces 4 joueurs ont marqué ensemble pour ${normalizedTeam}` 
      });
    }
    
    res.json({
      team: normalizedTeam,
      quartet: {
        players: quartet.players,
        matches: quartet.matches,
        totalGoals: quartet.totalGoals,
        goalsPerMatch: quartet.goalsPerMatch,
        winRate: quartet.winRate,
        matchList: quartet.matchList
      }
    });
  } catch (err) {
    console.error(
      `❌ Erreur /team-quartets/quartet-details:`,
      err.message
    );
    
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;