// predictAllConfrontations.js
const mongoose = require("mongoose");
const Match = require("./models/Match");
require("dotenv").config();

// Connexion MongoDB avec gestion d'erreur
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ Erreur MongoDB:", err.message);
    process.exit(1);
  });

/**
 * Normalise une paire d'équipes pour créer une clé unique
 * @param {string} teamA - Première équipe
 * @param {string} teamB - Deuxième équipe
 * @returns {string} Clé normalisée pour la paire d'équipes
 */
const normalizePair = (teamA, teamB) => {
  return [teamA, teamB].sort().join("|#|");
};

/**
 * Exécute les prédictions pour toutes les confrontations possibles
 */
const runPredictionForAll = async () => {
  try {
    console.log("🔍 Récupération des matchs terminés...");
    const matches = await Match.find({ status: "FINAL" });
    console.log(`✅ ${matches.length} matchs trouvés.`);
    
    // Regrouper les matchs par paires d'équipes
    const pairMap = {}; // { "teamA|#|teamB": [matches...] }
    for (const match of matches) {
      const key = normalizePair(match.homeTeam, match.awayTeam);
      if (!pairMap[key]) pairMap[key] = [];
      pairMap[key].push(match);
    }
    
    console.log(`📊 Analyse de ${Object.keys(pairMap).length} confrontations différentes...`);
    
    // Tableau pour stocker les résultats avant affichage
    const results = [];
    
    // Traiter chaque paire d'équipes
    for (const key of Object.keys(pairMap)) {
      const matchList = pairMap[key];
      const [teamA, teamB] = key.split("|#|");
      
      // Vérifier qu'il y a au moins 2 matchs pour que l'analyse soit pertinente
      if (matchList.length < 2) {
        continue; // Passer à la confrontation suivante
      }
      
      const playerStats = {};
      const synergyMap = {};
      
      // Calculer la date du match le plus récent
      const latestMatchDate = new Date(Math.max(...matchList.map(m => new Date(m.date))));
      
      // Pondération basée sur la récence
      for (const match of matchList) {
        const matchDate = new Date(match.date);
        // Différence en jours, maximum 365 jours
        const daysSince = Math.min(365, Math.floor((latestMatchDate - matchDate) / (1000 * 60 * 60 * 24)));
        // Facteur de pondération: 1.0 pour match récent, diminue avec l'ancienneté
        const weightFactor = Math.max(0.5, 1 - (daysSince / 365));
        
        const scorers = match.scorers || [];
        const activeScorers = scorers.filter(s => s.goals > 0);
        
        // Mise à jour des statistiques des joueurs
        for (const scorer of scorers) {
          const name = scorer.name;
          if (!playerStats[name]) {
            playerStats[name] = { goals: 0, assists: 0, appearances: 0, weightedScore: 0 };
          }
          
          const goals = scorer.goals || 0;
          const assists = scorer.assists || 0;
          
          playerStats[name].goals += goals;
          playerStats[name].assists += assists;
          playerStats[name].appearances++;
          playerStats[name].weightedScore += (goals + assists * 0.5) * weightFactor;
        }
        
        // Analyse des synergies entre buteurs
        for (let i = 0; i < activeScorers.length; i++) {
          for (let j = i + 1; j < activeScorers.length; j++) {
            const pair = [activeScorers[i].name, activeScorers[j].name].sort();
            const duoKey = `${pair[0]}|${pair[1]}`;
            synergyMap[duoKey] = (synergyMap[duoKey] || 0) + weightFactor;
          }
        }
      }
      
      // Calculer le score total de buts pour chaque équipe
      const teamAGoals = matchList.reduce((sum, match) => 
        sum + (match.homeTeam === teamA ? match.homeScore : match.awayScore), 0);
      
      const teamBGoals = matchList.reduce((sum, match) => 
        sum + (match.homeTeam === teamB ? match.homeScore : match.awayScore), 0);
      
      // Trier les buteurs par score pondéré
      const sortedScorers = Object.entries(playerStats)
        .map(([name, stats]) => ({
          name,
          weightedScore: stats.weightedScore,
          rawScore: stats.goals + stats.assists * 0.5,
          ...stats
        }))
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .slice(0, 3);
      
      // Trouver les meilleures synergies
      const topPairs = Object.entries(synergyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1)
        .map(([key, count]) => ({
          pair: key.split("|"),
          matchesTogether: Math.round(count * 10) / 10
        }));
      
      // Stocker les résultats pour cette confrontation
      results.push({
        teamA,
        teamB,
        matchCount: matchList.length,
        teamAGoals,
        teamBGoals,
        topScorers: sortedScorers,
        synergy: topPairs.length > 0 ? topPairs[0] : null
      });
    }
    
    // Trier les résultats par nombre de matchs (confrontations les plus fréquentes d'abord)
    results.sort((a, b) => b.matchCount - a.matchCount);
    
    // Afficher les résultats
    for (const result of results) {
      console.log(`\n📊 ${result.teamA} vs ${result.teamB} (${result.matchCount} matchs)`);
      console.log(` Score global: ${result.teamA} ${result.teamAGoals}-${result.teamBGoals} ${result.teamB}`);
      
      if (result.topScorers.length > 0) {
        console.log(` Meilleurs buteurs:`);
        result.topScorers.forEach((p, i) => {
          const efficiency = (p.goals / p.appearances).toFixed(2);
          console.log(`  ${i + 1}. ${p.name} — ${p.goals} buts, ${p.assists} assists (${efficiency} buts/match)`);
        });
      }
      
      if (result.synergy) {
        const p = result.synergy;
        console.log(` 🤝 Duo: ${p.pair[0]} + ${p.pair[1]} (${p.matchesTogether} matchs avec buts ensemble)`);
      }
    }
    
    console.log(`\n✅ Analyse terminée pour ${results.length} confrontations.`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse: ${error.message}`);
  } finally {
    // Fermeture de la connexion dans tous les cas
    await mongoose.connection.close();
    console.log("\n🔌 Connexion MongoDB fermée");
  }
};

// Exécution du script
runPredictionForAll();