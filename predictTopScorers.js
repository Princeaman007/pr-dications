// predictTopScorers.js
const mongoose = require("mongoose");
const Match = require("./models/Match");
require("dotenv").config();

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ Erreur MongoDB:", err.message);
    process.exit(1);
  });

/**
 * Prédit les buteurs probables pour un match entre deux équipes
 * @param {string} teamA - Nom de la première équipe
 * @param {string} teamB - Nom de la deuxième équipe
 * @param {number} limit - Nombre de buteurs à afficher
 */
const predictTopScorers = async (teamA, teamB, limit = 2) => {
  try {
    console.log(`🔍 Recherche des matchs entre ${teamA} et ${teamB}...`);
    
    // Recherche des confrontations précédentes
    const matches = await Match.find({
      $or: [
        { homeTeam: teamA, awayTeam: teamB },
        { homeTeam: teamB, awayTeam: teamA }
      ],
      status: "FINAL"
    }).sort({ date: -1 }); // Tri par date décroissante pour donner plus de poids aux matchs récents
    
    if (!matches.length) {
      console.log("❌ Aucune confrontation trouvée entre ces deux équipes.");
      return;
    }
    
    console.log(`✅ ${matches.length} confrontation(s) trouvée(s)`);
    
    // Statistiques des joueurs
    const playerStats = {}; // { "Player Name": { goals: X, assists: Y, appearances: Z } }
    const synergyMap = {};  // { "Player A|Player B": count }
    const recentWeight = 1.5; // Poids plus important pour les matchs récents
    
    // Traitement des matchs, en donnant plus de poids aux matchs récents
    matches.forEach((match, index) => {
      // Calculer le poids en fonction de la récence (1.0 pour les plus anciens, jusqu'à recentWeight pour les plus récents)
      const matchWeight = 1.0 + (recentWeight - 1.0) * (index / Math.max(1, matches.length - 1));
      
      const scorers = match.scorers || [];
      const activeScorers = scorers.filter(s => s.goals > 0);
      
      // Mise à jour des statistiques individuelles
      for (const scorer of scorers) {
        const name = scorer.name;
        
        if (!playerStats[name]) {
          playerStats[name] = { goals: 0, assists: 0, appearances: 0, weightedGoals: 0, weightedAssists: 0 };
        }
        
        playerStats[name].goals += scorer.goals || 0;
        playerStats[name].assists += scorer.assists || 0;
        playerStats[name].appearances += 1;
        playerStats[name].weightedGoals += (scorer.goals || 0) * matchWeight;
        playerStats[name].weightedAssists += (scorer.assists || 0) * matchWeight;
      }
      
      // Analyse des synergies entre buteurs
      for (let i = 0; i < activeScorers.length; i++) {
        for (let j = i + 1; j < activeScorers.length; j++) {
          const pair = [activeScorers[i].name, activeScorers[j].name].sort();
          const key = `${pair[0]}|${pair[1]}`;
          synergyMap[key] = (synergyMap[key] || 0) + matchWeight; // Pondérer également les synergies
        }
      }
    });
    
    // Calcul d'un score composite pour chaque joueur (goals + 0.5*assists) avec pondération pour la récence
    const sortedScorers = Object.entries(playerStats)
      .map(([name, stats]) => ({
        name,
        // Score pondéré en fonction de la récence des matchs
        score: stats.weightedGoals + stats.weightedAssists * 0.5,
        // Score brut pour référence
        rawScore: stats.goals + stats.assists * 0.5,
        // Autres statistiques
        ...stats,
        // Efficacité (buts par match)
        efficiency: stats.goals / stats.appearances
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    // Identification des meilleures synergies entre joueurs
    const topPairs = Object.entries(synergyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, count]) => ({
        pair: key.split("|"),
        matchesTogether: Math.round(count * 10) / 10 // Arrondir pour l'affichage
      }));
    
    // Affichage des résultats
    console.log(`\n🔮 Prédiction des buteurs probables pour ${teamA} vs ${teamB}:`);
    
    sortedScorers.forEach((p, i) => {
      const efficiency = (p.efficiency).toFixed(2);
      console.log(` ${i + 1}. ${p.name} — ${p.goals} buts, ${p.assists} assists en ${p.appearances} match(s) (${efficiency} buts/match)`);
    });
    
    if (topPairs.length > 0) {
      console.log("\n🤝 Meilleures synergies de buteurs :");
      topPairs.forEach(p => {
        console.log(` - ${p.pair[0]} + ${p.pair[1]} → ${p.matchesTogether} match(s) avec buts ensemble`);
      });
    }
    
    // Statistiques supplémentaires sur les matchs
    const teamAGoals = matches.reduce((sum, match) => 
      sum + (match.homeTeam === teamA ? match.homeScore : match.awayScore), 0);
    
    const teamBGoals = matches.reduce((sum, match) => 
      sum + (match.homeTeam === teamB ? match.homeScore : match.awayScore), 0);
    
    console.log(`\n📊 Statistiques des confrontations:`);
    console.log(` - Total des buts: ${teamA} (${teamAGoals}) - ${teamB} (${teamBGoals})`);
    console.log(` - Moyenne de buts par match: ${((teamAGoals + teamBGoals) / matches.length).toFixed(1)}`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de la prédiction: ${error.message}`);
  } finally {
    // Fermeture de la connexion dans tous les cas
    await mongoose.connection.close();
    console.log("\n🔌 Connexion MongoDB fermée");
  }
};

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("❌ Usage : node predictTopScorers.js \"Équipe A\" \"Équipe B\" [nombre de buteurs]");
  process.exit(1);
}

// Exécution de la fonction principale
const limit = args.length > 2 ? parseInt(args[2]) : 2;
predictTopScorers(args[0], args[1], limit);