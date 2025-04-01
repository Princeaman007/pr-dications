// services/scorerService.js
const axios = require("axios");
const Match = require("../models/Match");

const getScorersFromAPI = async (gameId) => {
  try {
    console.log(`🏒 Récupération des buteurs pour le match #${gameId}`);
    const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`;
    const res = await axios.get(url);

    const stats = res.data.playerByGameStats;
    if (!stats) {
      console.warn(`⚠️ Aucune statistique disponible pour le match #${gameId}`);
      return [];
    }

    // Récupérer tous les joueurs (y compris les gardiens pour être complet)
    const players = [
      ...(stats.homeTeam?.forwards || []),
      ...(stats.homeTeam?.defense || []),
      ...(stats.homeTeam?.goalies || []),
      ...(stats.awayTeam?.forwards || []),
      ...(stats.awayTeam?.defense || []),
      ...(stats.awayTeam?.goalies || [])
    ];

    // Filtrer pour ne garder que les joueurs avec des buts ou des passes décisives
    const scorers = players
      .filter(p => (p.goals || 0) > 0 || (p.assists || 0) > 0)
      .map(p => ({
        name: `${p.firstName?.default || ""} ${p.lastName?.default || ""}`.trim(),
        goals: p.goals || 0,
        assists: p.assists || 0,
        points: (p.goals || 0) + (p.assists || 0),
        team: p.teamAbbrev || "", // Ajout de l'équipe du joueur
        position: p.positionCode || "" // Ajout de la position du joueur
      }));

    // Trier par nombre de points (buts + passes)
    scorers.sort((a, b) => b.points - a.points);

    console.log(`✅ ${scorers.length} buteurs/passeurs trouvés pour le match #${gameId}`);
    
    // Log détaillé des buteurs pour débogage
    if (scorers.length > 0) {
      scorers.forEach(s => {
        console.log(`- ${s.name}: ${s.goals} but(s), ${s.assists} passe(s) (${s.team}, ${s.position})`);
      });
    }

    return scorers;
  } catch (err) {
    console.error(`❌ Erreur pour gameId ${gameId}: ${err.message}`);
    if (err.response) {
      console.error("Détails de la réponse:", {
        status: err.response.status,
        statusText: err.response.statusText,
        url: err.response.config.url
      });
    }
    return [];
  }
};

module.exports = { getScorersFromAPI };