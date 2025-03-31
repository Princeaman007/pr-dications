const mongoose = require("mongoose");
const Match = require("./models/Match");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB error :", err.message);
    process.exit(1);
  });

const run = async () => {
  try {
    const matches = await Match.find({}, { homeTeam: 1, awayTeam: 1, _id: 0 });
    const confrontationSet = new Set();
    
    for (const match of matches) {
      // Vérification que homeTeam et awayTeam existent
      if (!match.homeTeam || !match.awayTeam) continue;
      
      // Clé standardisée : ordre alphabétique pour éviter les doublons
      const teams = [match.homeTeam, match.awayTeam].sort();
      const key = `${teams[0]}|||${teams[1]}`; // triple pipe pour éviter les erreurs de split
      confrontationSet.add(key);
    }
    
    const uniqueConfrontations = [...confrontationSet].map(pair => 
      pair.split("|||")
    );
    
    console.log(`📊 Confrontations uniques trouvées : ${uniqueConfrontations.length}\n`);
    
    uniqueConfrontations.forEach(([team1, team2], i) => {
      console.log(`${i + 1}. ${team1} vs ${team2}`);
    });
    
    await mongoose.connection.close();
    console.log("\n🔌 Connexion MongoDB fermée");
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    await mongoose.connection.close();
    process.exit(1); // Ajout d'un code de sortie en cas d'erreur
  }
};

run();