// cleanDuplicates.js
const mongoose = require("mongoose");
const path = require("path");

// Utiliser la même approche que dans votre script fetchLastGamesForAllTeams.js
require("dotenv").config({ path: path.resolve(__dirname, '..', '.env') });

// Afficher des informations de débogage
console.log("Vérification des variables d'environnement :");
console.log("MONGO_URI:", process.env.MONGO_URI ? "[défini]" : "[non défini]");
console.log("Répertoire du script:", __dirname);
console.log("Chemin vers .env recherché:", path.resolve(__dirname, '..', '.env'));

// Vérifier l'URI MongoDB
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("❌ La variable MONGO_URI n'est pas définie dans le fichier .env");
  process.exit(1);
}

// Correction du chemin pour accéder au modèle Match
const Match = require('../models/Match');

// Connexion MongoDB avec la variable vérifiée
mongoose.connect(mongoURI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

const cleanDuplicates = async () => {
  try {
    console.log('🔍 Recherche des doublons...');
    
    // Étape 1: Récupérer tous les matches
    const allMatches = await Match.find().sort({ date: 1 });
    console.log(`📊 Nombre total de matches: ${allMatches.length}`);
    
    // Étape 2: Identifier les doublons par gameId
    const matchesById = new Map();
    const duplicateIds = [];
    const noGameIdMatches = [];
    
    allMatches.forEach(match => {
      // Si le match n'a pas de gameId, on le signale
      if (!match.gameId) {
        noGameIdMatches.push(match._id);
        return;
      }
      
      // Si on a déjà vu ce gameId, c'est un doublon
      if (matchesById.has(match.gameId)) {
        duplicateIds.push(match._id);
      } else {
        matchesById.set(match.gameId, match._id);
      }
    });
    
    console.log(`⚠️ ${duplicateIds.length} doublons trouvés`);
    console.log(`⚠️ ${noGameIdMatches.length} matches sans gameId trouvés`);
    
    // Étape 3: Supprimer les doublons si nécessaire
    if (duplicateIds.length > 0) {
      console.log('🗑️ Suppression des doublons...');
      const result = await Match.deleteMany({ _id: { $in: duplicateIds } });
      console.log(`✅ ${result.deletedCount} doublons supprimés`);
    }
    
    // Étape 4 (optionnelle): Gérer les matches sans gameId
    if (noGameIdMatches.length > 0) {
      console.log('⚠️ Attention: certains matches n\'ont pas de gameId');
      console.log('   Vous devriez vérifier ces matches manuellement.');
      
      // Afficher quelques exemples
      const examples = await Match.find({ _id: { $in: noGameIdMatches.slice(0, 3) } });
      console.log('Exemples de matches sans gameId:');
      examples.forEach(match => {
        console.log(`   ${match.date}: ${match.awayTeam} @ ${match.homeTeam} (${match.awayScore}-${match.homeScore})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Connexion fermée');
  }
};

cleanDuplicates();