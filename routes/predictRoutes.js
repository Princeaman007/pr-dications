// routes/predictRoutes.js
const express = require("express");
const router = express.Router();
const { predictScorersBetweenTeams, normalizeTeamName } = require("../services/predictService");

router.get("/", async (req, res) => {
  const { teamA, teamB } = req.query;

  if (!teamA || !teamB) {
    return res.status(400).json({ 
      error: "Paramètres manquants", 
      message: "Les paramètres teamA et teamB sont requis" 
    });
  }

  try {
    console.log(`🔮 Demande de prédiction pour ${teamA} vs ${teamB}`);
    
    // Normaliser les noms d'équipe
    const normalizedTeamA = normalizeTeamName(teamA);
    const normalizedTeamB = normalizeTeamName(teamB);
    
    // Si l'équipe n'a pas été reconnue, avertir l'utilisateur
    if (normalizedTeamA === "Équipe inconnue" || normalizedTeamB === "Équipe inconnue") {
      console.warn(`⚠️ Équipe(s) non reconnue(s): ${teamA} et/ou ${teamB}`);
    }
    
    console.log(`📊 Génération de prédiction pour ${normalizedTeamA} vs ${normalizedTeamB}`);
    const prediction = await predictScorersBetweenTeams(normalizedTeamA, normalizedTeamB);
    
    // Ajouter des métadonnées à la réponse
    const response = {
      teams: {
        teamA: normalizedTeamA,
        teamB: normalizedTeamB,
        originalTeamA: teamA,
        originalTeamB: teamB
      },
      timestamp: new Date().toISOString(),
      ...prediction
    };
    
    console.log(`✅ Prédiction générée avec succès (source: ${prediction.source})`);
    res.json(response);
  } catch (err) {
    console.error("❌ Erreur API prédiction:", err);
    res.status(500).json({ 
      error: "Erreur lors de la génération de la prédiction", 
      message: err.message 
    });
  }
});

// Nouvelle route pour vérifier la validité d'une équipe
router.get("/validate-team", (req, res) => {
  const { team } = req.query;
  
  if (!team) {
    return res.status(400).json({ error: "Le paramètre 'team' est requis" });
  }
  
  const normalized = normalizeTeamName(team);
  const isValid = normalized !== "Équipe inconnue";
  
  res.json({
    original: team,
    normalized,
    isValid
  });
});

module.exports = router;