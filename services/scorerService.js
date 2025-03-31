// services/scorerService.js
const axios = require("axios");
const Match = require("../models/Match");

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

    const scorers = players
      .filter(p => (p.goals || 0) > 0 || (p.assists || 0) > 0)
      .map(p => ({
        name: `${p.firstName?.default || ""} ${p.lastName?.default || ""}`.trim(),
        goals: p.goals || 0,
        assists: p.assists || 0
      }));

    return scorers;
  } catch (err) {
    console.error(`❌ Erreur pour gameId ${gameId}: ${err.message}`);
    return [];
  }
};

module.exports = { getScorersFromAPI };
