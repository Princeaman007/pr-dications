const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const Match = require("./models/Match");

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ Erreur MongoDB :", err.message);
    process.exit(1);
  });

// 🔁 Nouvelle fonction : récupère les scorers avec goals + assists
const getFullScorers = async (gameId) => {
  try {
    const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`;
    const res = await axios.get(url);

    const stats = res.data.playerByGameStats;
    if (!stats) return [];

    const players = [
      ...(stats.homeTeam?.forwards || []),
      ...(stats.homeTeam?.defense || []),
      ...(stats.awayTeam?.forwards || []),
      ...(stats.awayTeam?.defense || [])
    ];

    const scorers = [];

    for (const player of players) {
      const goals = player.goals || 0;
      const assists = player.assists || 0;

      if (goals > 0 || assists > 0) {
        scorers.push({
          name: `${player.firstName.default} ${player.lastName.default}`,
          goals,
          assists
        });
      }
    }

    return scorers;
  } catch (err) {
    console.error(`❌ Erreur récupération scorers pour game ${gameId}: ${err.message}`);
    return [];
  }
};

// 🔧 Mise à jour des matchs existants
const updateScorers = async () => {
  try {
    const matches = await Match.find({
      $or: [
        { scorers: { $exists: false } },
        { "scorers.0": { $exists: false } }, // vide
        { "scorers.0.goals": { $exists: false } } // ancien format (juste noms)
      ],
      gameId: { $exists: true }
    });

    if (matches.length === 0) {
      console.log("✅ Aucun match à mettre à jour, tout est déjà propre !");
      return;
    }

    console.log(`🔍 ${matches.length} match(s) à enrichir avec les buteurs complets...\n`);

    for (const match of matches) {
      try {
        const scorers = await getFullScorers(match.gameId);

        if (scorers.length > 0) {
          await Match.updateOne(
            { _id: match._id },
            { $set: { scorers } }
          );
          console.log(`✅ ${match.homeTeam} vs ${match.awayTeam} mis à jour avec ${scorers.length} buteurs.`);
        } else {
          console.log(`⚠️ Aucun scorer trouvé pour ${match.homeTeam} vs ${match.awayTeam}`);
        }
      } catch (err) {
        console.error(`💥 Erreur update match ID ${match._id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("❌ Erreur principale :", err.message);
  } finally {
    mongoose.connection.close();
  }
};

updateScorers();
