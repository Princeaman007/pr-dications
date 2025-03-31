const axios = require("axios");
const Match = require("../models/Match");
const { predictScorersBetweenTeams } = require("./predictService");


// Alias pour correspondre les noms courts aux noms complets et vice-versa
const teamAliases = {
  "Wild": "Minnesota Wild",
  "Devils": "New Jersey Devils",
  "Predators": "Nashville Predators",
  "Flyers": "Philadelphia Flyers",
  "Flames": "Calgary Flames",
  "Avalanche": "Colorado Avalanche",
  "Stars": "Dallas Stars",
  "Kraken": "Seattle Kraken",
  "MIN": "Minnesota Wild",
  "NJD": "New Jersey Devils",
  "NSH": "Nashville Predators",
  "PHI": "Philadelphia Flyers",
  "CGY": "Calgary Flames",
  "COL": "Colorado Avalanche",
  "DAL": "Dallas Stars",
  "SEA": "Seattle Kraken",
  "Minnesota Wild": "Minnesota Wild",
  "New Jersey Devils": "New Jersey Devils",
  "Nashville Predators": "Nashville Predators",
  "Philadelphia Flyers": "Philadelphia Flyers",
  "Calgary Flames": "Calgary Flames",
  "Colorado Avalanche": "Colorado Avalanche",
  "Dallas Stars": "Dallas Stars",
  "Seattle Kraken": "Seattle Kraken"
};

const teamVariations = {};
Object.entries(teamAliases).forEach(([alias, fullName]) => {
  if (!teamVariations[fullName]) teamVariations[fullName] = [];
  teamVariations[fullName].push(alias);
  teamVariations[fullName].push(fullName);
});

const normalizeTeamName = (name) => {
  if (!name) return "Équipe inconnue";
  return teamAliases[name] || name;
};

const getTeamName = (team) => {
  if (!team) return "Équipe inconnue";

  if (team?.name?.default) return team.name.default.trim();
  if (team?.placeName?.default && team?.teamName?.default)
    return `${team.placeName.default} ${team.teamName.default}`.trim();
  if (team?.placeName?.default && team?.commonName?.default)
    return `${team.placeName.default} ${team.commonName.default}`.trim();
  if (team?.fullName) return team.fullName.trim();
  if (team?.triCode) return team.triCode.trim();

  return "Équipe inconnue";
};

const fetchUpcomingGames = async () => {
  try {
    console.log("🔍 Récupération des matchs à venir...");
    const url = "https://api-web.nhle.com/v1/score/now";
    const res = await axios.get(url);
    const games = res.data.games || [];
    const upcomingGames = games.filter((g) =>
      ["FUT", "PRE", "WARMUP"].includes(g.gameState)
    );
    console.log(`✅ ${upcomingGames.length} matchs à venir trouvés.`);
    return upcomingGames;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des matchs: ${error.message}`);
    return [];
  }
};

const fetchUpcomingWithPredictions = async () => {
  const upcoming = await fetchUpcomingGames();
  if (upcoming.length === 0) return {};

  const gamesByDate = {};

  for (const g of upcoming) {
    if (!g.startTimeUTC || !g.homeTeam || !g.awayTeam) continue;

    const date = g.startTimeUTC.split("T")[0];
    const home = normalizeTeamName(getTeamName(g.homeTeam));
    const away = normalizeTeamName(getTeamName(g.awayTeam));
    const time = g.startTimeUTC.split("T")[1].substring(0, 5);
    const gameState = g.gameState;

    console.log(`🧠 Prédiction pour ${away} @ ${home}`);

    let prediction = null;
    try {
      prediction = await predictScorersBetweenTeams(home, away);
    } catch (err) {
      console.warn(`⚠️ Erreur prédiction ${home} vs ${away}:`, err.message);
    }

    if (!gamesByDate[date]) gamesByDate[date] = [];
    gamesByDate[date].push({
      home,
      away,
      time,
      prediction: prediction || null,
      gameState,
    });
  }

  return gamesByDate;
};

module.exports = fetchUpcomingWithPredictions;
