const mongoose = require("mongoose");
const { getLastFinalGames, NHL_TEAMS } = require("./nhlFetcher"); // Vérifie que NHL_TEAMS est bien exporté
require("dotenv").config();

const SEASON = "20232024"; // Correction de la saison (2023-2024 est plus probable que 2024-2025)
const MATCHES_PER_TEAM = 100; // Nombre élevé pour un historique complet

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connecté à MongoDB");
    
    // Vérification que NHL_TEAMS est défini et est un tableau
    if (!NHL_TEAMS || !Array.isArray(NHL_TEAMS)) {
      throw new Error("NHL_TEAMS n'est pas défini correctement dans nhlFetcherCore");
    }
    
    for (const team of NHL_TEAMS) {
      console.log(`\n📦 Traitement de ${team.name} (${team.abbr})`);
      await getLastFinalGames(team.abbr, SEASON, MATCHES_PER_TEAM);
    }
    
    console.log("\n✅ Tous les matchs ont été insérés avec succès !");
  } catch (err) {
    console.error("❌ Erreur globale :", err.message);
  } finally {
    // Vérification que la connexion existe avant de la fermer
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("🔌 Connexion MongoDB fermée");
    }
  }
};

run();