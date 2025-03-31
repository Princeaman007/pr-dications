const mongoose = require("mongoose");
const Match = require("./models/Match");
require("dotenv").config();

// Récupération des arguments en ligne de commande avec gestion des guillemets
const teamA = process.argv[2];
const teamB = process.argv[3];

if (!teamA || !teamB) {
  console.log("❌ Usage : node compareConfrontation.js \"Équipe A\" \"Équipe B\"");
  process.exit(1);
}

// Fonction pour nettoyer/normaliser les noms d'équipe (enlève les espaces en trop, uniformise la casse)
const normalizeTeamName = (name) => {
  return name.trim().replace(/\s+/g, ' ');
};

// Formater les noms des équipes
const teamANormalized = normalizeTeamName(teamA);
const teamBNormalized = normalizeTeamName(teamB);

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB error :", err.message);
    process.exit(1);
  });

const runAnalysis = async () => {
  try {
    console.log(`\n🔍 Analyse des confrontations entre "${teamANormalized}" et "${teamBNormalized}"\n`);
    
    // Recherche des matchs avec gestion flexible des noms d'équipes
    const matches = await Match.find({
      $or: [
        { 
          homeTeam: { $regex: new RegExp(teamANormalized, 'i') }, 
          awayTeam: { $regex: new RegExp(teamBNormalized, 'i') }
        },
        { 
          homeTeam: { $regex: new RegExp(teamBNormalized, 'i') }, 
          awayTeam: { $regex: new RegExp(teamANormalized, 'i') }
        }
      ]
    }).sort({ date: 1 }); // Triés par date pour une meilleure analyse chronologique

    if (matches.length === 0) {
      console.log("❌ Aucune confrontation trouvée.");
      return;
    }

    console.log(`📊 Confrontations trouvées : ${matches.length}\n`);
    
    // Afficher l'historique des matchs
    console.log("📆 Historique des confrontations :");
    matches.forEach(match => {
      const date = new Date(match.date).toLocaleDateString('fr-FR');
      const isTeamAHome = match.homeTeam.includes(teamANormalized);
      const score = `${match.homeScore}-${match.awayScore}`;
      const result = isTeamAHome 
        ? (match.homeScore > match.awayScore ? `${teamANormalized} gagne` : 
           match.homeScore < match.awayScore ? `${teamBNormalized} gagne` : 'Match nul')
        : (match.homeScore > match.awayScore ? `${teamBNormalized} gagne` : 
           match.homeScore < match.awayScore ? `${teamANormalized} gagne` : 'Match nul');
      
      console.log(`- ${date} : ${match.homeTeam} vs ${match.awayTeam} (${score}) → ${result}`);
    });
    console.log("");

    // Stats générales
    let teamAWins = 0;
    let teamBWins = 0;
    let draws = 0;
    let teamAGoals = 0;
    let teamBGoals = 0;

    matches.forEach(match => {
      const isTeamAHome = match.homeTeam.includes(teamANormalized);
      const teamAScore = isTeamAHome ? match.homeScore : match.awayScore;
      const teamBScore = isTeamAHome ? match.awayScore : match.homeScore;
      
      teamAGoals += teamAScore;
      teamBGoals += teamBScore;
      
      if (teamAScore > teamBScore) teamAWins++;
      else if (teamBScore > teamAScore) teamBWins++;
      else draws++;
    });

    console.log("📈 Statistiques globales :");
    console.log(`- Victoires ${teamANormalized} : ${teamAWins}`);
    console.log(`- Victoires ${teamBNormalized} : ${teamBWins}`);
    console.log(`- Matchs nuls : ${draws}`);
    console.log(`- Buts marqués par ${teamANormalized} : ${teamAGoals}`);
    console.log(`- Buts marqués par ${teamBNormalized} : ${teamBGoals}`);
    console.log(`- Moyenne de buts par match : ${((teamAGoals + teamBGoals) / matches.length).toFixed(2)}\n`);

    // Analyse des buteurs
    const scorersStats = {};
    const duoStats = {};

    for (const match of matches) {
      // Vérifier si le match a des buteurs
      if (!match.scorers || match.scorers.length === 0) {
        console.log(`⚠️ Match du ${new Date(match.date).toLocaleDateString('fr-FR')} sans données de buteurs`);
        continue;
      }

      const participants = new Map(); // Pour ce match : { name => { goals, assists } }
      
      for (const s of match.scorers) {
        // Vérifier si le nom est valide
        if (!s.name || typeof s.name !== 'string') {
          console.log(`⚠️ Buteur avec nom invalide trouvé: ${JSON.stringify(s)}`);
          continue;
        }

        // Normaliser le nom du buteur
        const name = s.name.trim();
        
        if (!scorersStats[name]) {
          scorersStats[name] = { goals: 0, assists: 0, matches: 0 };
        }
        
        scorersStats[name].goals += s.goals || 0;
        scorersStats[name].assists += s.assists || 0;
        scorersStats[name].matches += 1;
        
        // Enregistrer temporairement pour analyse de duos
        participants.set(name, {
          goals: s.goals || 0,
          assists: s.assists || 0
        });
      }

      // Analyse des duos buteur + passeur dans ce match
      for (const [player1, stats1] of participants.entries()) {
        if (stats1.goals > 0) {
          for (const [player2, stats2] of participants.entries()) {
            if (player1 !== player2 && stats2.assists > 0) {
              const key = `${player1} + ${player2}`;
              if (!duoStats[key]) {
                duoStats[key] = { goalsTogether: 0, matches: 0 };
              }
              duoStats[key].goalsTogether += Math.min(stats1.goals, stats2.assists); // approximation
              duoStats[key].matches += 1;
            }
          }
        }
      }
    }

    // Classement des buteurs
    const topScorers = Object.entries(scorersStats)
      .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists)
      .slice(0, 10);
    
    console.log("🎯 Top buteurs dans ces confrontations :");
    if (topScorers.length === 0) {
      console.log("Aucun buteur trouvé.");
    } else {
      topScorers.forEach(([name, stats]) => {
        console.log(`- ${name} : ${stats.goals} buts, ${stats.assists} assists en ${stats.matches} matchs`);
      });
    }

    // Classement des duos
    const topDuos = Object.entries(duoStats)
      .sort((a, b) => b[1].goalsTogether - a[1].goalsTogether)
      .slice(0, 5);
    
    console.log("\n🤝 Duos les plus fréquents (buteur + passeur) :");
    if (topDuos.length === 0) {
      console.log("Aucune combinaison détectée.");
    } else {
      topDuos.forEach(([combo, data]) => {
        console.log(`- ${combo} → ${data.goalsTogether} buts ensemble (sur ${data.matches} matchs)`);
      });
    }

  } catch (err) {
    console.error("❌ Erreur analyse :", err.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Connexion MongoDB fermée");
  }
};

runAnalysis();