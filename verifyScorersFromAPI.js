const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const Match = require("./models/Match");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ Erreur MongoDB :", err.message);
    process.exit(1);
  });

const getScorersFromAPI = async (gameId) => {
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
    console.error(`❌ Erreur pour gameId ${gameId}: ${err.message}`);
    return [];
  }
};

const verifyScorers = async () => {
  try {
    const matches = await Match.find({ gameId: { $exists: true } });

    if (matches.length === 0) {
      console.log("⚠️ Aucun match avec gameId trouvé.");
      return;
    }

    for (const match of matches) {
      const scorers = await getScorersFromAPI(match.gameId);

      console.log(`📅 Match: ${match.date} | ${match.homeTeam} vs ${match.awayTeam}`);
      console.log(`🆔 gameId: ${match.gameId}`);
      if (scorers.length === 0) {
        console.log("⚠️ Aucun scorer trouvé pour ce match.");
      } else {
        console.log("🎯 Scorers:");
        scorers.forEach((s, i) => {
          console.log(`  ${i + 1}. ${s.name} - ${s.goals} G / ${s.assists} A`);
        });
      }
      console.log("----------------------------------------------------\n");
    }
  } catch (err) {
    console.error("❌ Erreur globale :", err.message);
  } finally {
    mongoose.connection.close();
  }
};

verifyScorers();
