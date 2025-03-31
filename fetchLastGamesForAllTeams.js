// fetchLastGamesForAllTeams.js
const mongoose = require("mongoose");
const { getLastFinalGames } = require("./nhlFetcher");
require("dotenv").config();

// Liste des abréviations d'équipes NHL
const TEAMS = [
  "ANA", "ARI", "BOS", "BUF", "CGY", "CAR", "CHI", "COL", "CBJ", "DAL",
  "DET", "EDM", "FLA", "LAK", "MIN", "MTL", "NSH", "NJD", "NYI", "NYR",
  "OTT", "PHI", "PIT", "SJS", "SEA", "STL", "TBL", "TOR", "VAN", "VGK", "WSH", "WPG"
  // Ajoute "UHC" si tu veux Utah aussi
];

// Configuration
const season = "20242025"; // Saison actuelle
const gamesPerTeam = 15;    // 🔥 augmente le nombre de matchs traités
const concurrentTeams = 4;  // Nombre d'équipes à traiter en parallèle

// Connexion MongoDB avec gestion d'erreur
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

/**
 * Divise un tableau en groupes de taille spécifiée
 * @param {Array} array - Tableau à diviser
 * @param {number} size - Taille des groupes
 * @returns {Array} Tableau de groupes
 */
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Fonction principale d'exécution
 */
const run = async () => {
  try {
    console.log(`🚀 Démarrage de la récupération des ${gamesPerTeam} derniers matchs pour chaque équipe`);
    console.log(`⏱️ Traitement de ${concurrentTeams} équipes en parallèle`);
    
    // Diviser les équipes en groupes pour les traiter en parallèle
    const teamGroups = chunkArray(TEAMS, concurrentTeams);
    
    // Compteur pour suivre la progression
    let processedTeams = 0;
    const totalTeams = TEAMS.length;
    
    // Traiter chaque groupe d'équipes
    for (const teamGroup of teamGroups) {
      // Créer un tableau de promesses pour le traitement parallèle
      const promises = teamGroup.map(abbr => {
        return (async () => {
          try {
            console.log(`\n📦 Traitement de l'équipe ${abbr}...`);
            await getLastFinalGames(abbr, season, gamesPerTeam);
            processedTeams++;
            console.log(`✅ ${abbr} terminé (${processedTeams}/${totalTeams})`);
          } catch (err) {
            console.error(`❌ Erreur pour l'équipe ${abbr}: ${err.message}`);
          }
        })();
      });
      
      // Attendre que toutes les équipes du groupe soient traitées
      await Promise.all(promises);
      console.log(`\n🔄 Groupe d'équipes terminé (${processedTeams}/${totalTeams})`);
    }
    
    console.log(`\n✅ Toutes les équipes ont été traitées avec succès!`);
  } catch (error) {
    console.error(`❌ Erreur globale lors du traitement des équipes: ${error.message}`);
    process.exit(1);
  } finally {
    // S'assurer que la connexion MongoDB est toujours fermée
    await mongoose.connection.close();
    console.log("\n🔌 Connexion MongoDB fermée");
  }
};

// Exécution du script
run();