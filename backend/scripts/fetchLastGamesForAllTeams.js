// fetchLastGamesForAllTeams.js
const mongoose = require("mongoose");
const { getLastFinalGames } = require("./nhlFetcher");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, '..', '.env') });

console.log("Vérification des variables d'environnement :");
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("Répertoire du script:", __dirname);
console.log("Chemin vers .env recherché:", path.resolve(__dirname, '..', '.env'));


// Liste des abréviations d'équipes NHL
const TEAMS = [
  "ANA", // Anaheim Ducks
  "BOS", // Boston Bruins
  "BUF", // Buffalo Sabres
  "CGY", // Calgary Flames
  "CAR", // Carolina Hurricanes
  "CHI", // Chicago Blackhawks
  "COL", // Colorado Avalanche
  "CBJ", // Columbus Blue Jackets
  "DAL", // Dallas Stars
  "DET", // Detroit Red Wings
  "EDM", // Edmonton Oilers
  "FLA", // Florida Panthers
  "LAK", // Los Angeles Kings
  "MIN", // Minnesota Wild
  "MTL", // Montréal Canadiens
  "NSH", // Nashville Predators
  "NJD", // New Jersey Devils
  "NYI", // New York Islanders
  "NYR", // New York Rangers
  "OTT", // Ottawa Senators
  "PHI", // Philadelphia Flyers
  "PIT", // Pittsburgh Penguins
  "SJS", // San Jose Sharks
  "SEA", // Seattle Kraken
  "STL", // St. Louis Blues
  "TBL", // Tampa Bay Lightning
  "TOR", // Toronto Maple Leafs
  "UHC", // ✅ Utah Hockey Club (nouveaux venus)
  "VAN", // Vancouver Canucks
  "VGK", // Vegas Golden Knights
  "WSH", // Washington Capitals
  "WPG"  // Winnipeg Jets
];


// Configuration
const season = "20242025"; // Saison actuelle
const gamesPerTeam = 15;    // 🔥 augmente le nombre de matchs traités
const concurrentTeams = 4;  // Nombre d'équipes à traiter en parallèle

// Utilisez directement la variable après vérification
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("❌ La variable MONGO_URI n'est pas définie dans le fichier .env");
  process.exit(1);
}

// Connexion MongoDB avec la variable vérifiée
mongoose.connect(mongoURI)
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