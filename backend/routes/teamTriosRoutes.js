// routes/teamTriosRoutes.js
const express = require("express");
const router = express.Router();
const { analyzeTeamTrios } = require("../services/teamTriosService");

// Fonction utilitaire pour normaliser les noms d'équipes
const normalizeTeamName = (name) => {
  if (!name || typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ");
};

// Route principale : GET /api/team-trios?team=Toronto%20Maple%20Leafs
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
    console.log(`🔍 Requête d'analyse des trios pour ${normalizedTeam} (minGoals: ${minGoalsValue})`);
    const analysisResult = await analyzeTeamTrios(normalizedTeam, "20242025", minGoalsValue);

    // Succès
    res.json({
      team: normalizedTeam,
      minGoals: minGoalsValue,
      ...analysisResult
    });
  } catch (err) {
    console.error(
      `❌ Erreur /team-trios pour "${normalizedTeam}":`,
      err.message
    );

    if (err.name === "ValidationError") {
      return res.status(400).json({ error: "Données invalides" });
    }

    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour obtenir les détails d'un trio spécifique
router.get("/trio-details", async (req, res) => {
  const { team, players } = req.query;

  if (!team || !players) {
    return res.status(400).json({ 
      error: "Paramètres manquants", 
      message: "Les paramètres team et players sont tous requis" 
    });
  }

  // S'assurer que players est un tableau de 3 noms de joueurs
  let playersList;
  try {
    playersList = JSON.parse(players);
    if (!Array.isArray(playersList) || playersList.length !== 3) {
      throw new Error("Format incorrect");
    }
  } catch (err) {
    return res.status(400).json({ 
      error: "Format de paramètre players invalide", 
      message: "players doit être un tableau JSON de 3 noms de joueurs"
    });
  }

  const normalizedTeam = normalizeTeamName(team);
  if (!normalizedTeam) {
    return res
      .status(400)
      .json({ error: "Nom d'équipe invalide après normalisation" });
  }

  try {
    console.log(`🔍 Requête des détails pour le trio dans l'équipe ${normalizedTeam}`);
    const analysis = await analyzeTeamTrios(normalizedTeam);
    
    // Trouver le trio spécifique
    // Comme les joueurs sont triés alphabétiquement dans l'analyse, nous devons faire pareil ici
    const sortedPlayers = [...playersList].sort();
    
    const trio = analysis.trios.find(t => 
      t.players.length === sortedPlayers.length && 
      t.players.every((p, i) => p === sortedPlayers[i])
    );
    
    if (!trio) {
      return res.status(404).json({ 
        error: "Trio non trouvé", 
        message: `Aucun match trouvé où ces 3 joueurs ont marqué ensemble pour ${normalizedTeam}` 
      });
    }
    
    res.json({
      team: normalizedTeam,
      trio: {
        players: trio.players,
        matches: trio.matches,
        totalGoals: trio.totalGoals,
        goalsPerMatch: trio.goalsPerMatch,
        winRate: trio.winRate,
        matchList: trio.matchList
      }
    });
  } catch (err) {
    console.error(
      `❌ Erreur /team-trios/trio-details:`,
      err.message
    );
    
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;