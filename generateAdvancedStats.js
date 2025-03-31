// generateAdvancedStats.js
const mongoose = require("mongoose");
const Match = require("./models/Match");
require("dotenv").config();

const TEAM = process.argv[2] || "Colorado Avalanche";

// Connexion MongoDB avec gestion d'erreur
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ Erreur MongoDB:", err.message);
    process.exit(1);
  });

// Fonction pour normaliser les temps en secondes
const normalizeTime = (timeStr) => {
  if (!timeStr) return 9999;
  const [min, sec] = timeStr.split(":").map(Number);
  return min * 60 + sec;
};

const runStats = async () => {
  try {
    // Recherche des matches pour cette équipe
    const matches = await Match.find({
      $or: [{ homeTeam: TEAM }, { awayTeam: TEAM }],
      status: "FINAL"
    }).sort({ date: 1 });

    if (!matches.length) {
      console.log("❌ Aucun match trouvé pour cette équipe.");
      return;
    }

    console.log(`✅ ${matches.length} matchs trouvés pour ${TEAM}`);

    // Initialisation des objets de statistiques
    const playerStats = {};
    const teamMatchups = {};
    const playerStreaks = {};
    const firstGoalStats = {}; // pour joueur qui marque tôt

    // Traitement de chaque match
    for (const match of matches) {
      const opponent = match.homeTeam === TEAM ? match.awayTeam : match.homeTeam;
      teamMatchups[opponent] = (teamMatchups[opponent] || 0) + 1;
      
      // Traitement des buteurs
      for (const scorer of match.scorers || []) {
        const name = scorer.name;
        
        // Statistiques de but total
        if (!playerStats[name]) {
          playerStats[name] = { goals: 0, assists: 0, matches: 0 };
        }
        playerStats[name].goals += scorer.goals || 0;
        playerStats[name].assists += scorer.assists || 0;
        playerStats[name].matches++;
        
        // Gestion des séries de buts
        if (!playerStreaks[name]) {
          playerStreaks[name] = { current: 0, max: 0 };
        }
        
        if (scorer.goals > 0) {
          playerStreaks[name].current++;
          playerStreaks[name].max = Math.max(playerStreaks[name].current, playerStreaks[name].max);
        } else {
          playerStreaks[name].current = 0;
        }
      }
      
      // Recherche du but le plus tôt
      if (match.goals && Array.isArray(match.goals)) {
        for (const goal of match.goals) {
          // Gestion des différentes structures de noms
          const player = goal.scorer?.fullName || 
                         goal.scorer?.name || 
                         (goal.scorerFirstName && goal.scorerLastName ? 
                          `${goal.scorerFirstName} ${goal.scorerLastName}` : null);
          
          if (player) {
            const time = normalizeTime(goal.timeInPeriod || goal.time);
            if (!firstGoalStats[player] || time < firstGoalStats[player]) {
              firstGoalStats[player] = time;
            }
          }
        }
      }
    }

    // Calcul des statistiques finales
    
    // Meilleur buteur
    const bestScorers = Object.entries(playerStats)
      .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists);
    
    const bestScorer = bestScorers[0];
    
    // Meilleur passeur
    const bestAssists = Object.entries(playerStats)
      .sort((a, b) => b[1].assists - a[1].assists)[0];
    
    // Joueur qui marque le + tôt
    const earliestScorers = Object.entries(firstGoalStats)
      .sort((a, b) => a[1] - b[1]);
    
    const earliestScorer = earliestScorers.length > 0 ? earliestScorers[0] : null;
    
    // Équipe la plus affrontée
    const topOpponents = Object.entries(teamMatchups)
      .sort((a, b) => b[1] - a[1]);
    
    const topOpponent = topOpponents[0];

    // Affichage des résultats
    console.log(`\n📊 Stats avancées pour ${TEAM}`);
    
    console.log(`\n🥇 Meilleur buteur: ${bestScorer[0]} (${bestScorer[1].goals} buts, ${bestScorer[1].assists} passes)`);
    console.log(`\n🎯 Meilleur passeur: ${bestAssists[0]} (${bestAssists[1].assists} passes)`);
    
    console.log(`\n🔥 Joueurs avec série de buts:`);
    Object.entries(playerStreaks)
      .filter(([_, s]) => s.max >= 2)
      .sort((a, b) => b[1].max - a[1].max)
      .forEach(([name, s]) => console.log(`   ${name}: ${s.max} buts consécutifs (actuel: ${s.current})`));
    
    console.log(`\n🔁 Équipes les plus affrontées:`);
    topOpponents.slice(0, 3).forEach(([team, count]) => {
      console.log(`   ${team} (${count} matchs)`);
    });
    
    if (earliestScorer) {
      const min = Math.floor(earliestScorer[1] / 60);
      const sec = earliestScorer[1] % 60;
      console.log(`\n⏱️ Joueur qui marque le plus tôt: ${earliestScorer[0]} (${min}m${sec.toString().padStart(2, '0')}s)`);
    }

    // Efficacité des joueurs (buts par match)
    console.log(`\n⚡ Joueurs les plus efficaces (min. 3 matchs):`);
    Object.entries(playerStats)
      .filter(([_, stats]) => stats.matches >= 3 && stats.goals > 0)
      .sort((a, b) => (b[1].goals / b[1].matches) - (a[1].goals / a[1].matches))
      .slice(0, 5)
      .forEach(([name, stats]) => {
        const efficiency = (stats.goals / stats.matches).toFixed(2);
        console.log(`   ${name}: ${efficiency} buts/match (${stats.goals} buts en ${stats.matches} matchs)`);
      });

  } catch (err) {
    console.error("❌ Erreur lors du calcul des statistiques:", err.message);
  } finally {
    // Fermeture de la connexion dans tous les cas
    await mongoose.connection.close();
    console.log("\n🔌 Connexion MongoDB fermée");
  }
};

// Exécution du script
runStats();