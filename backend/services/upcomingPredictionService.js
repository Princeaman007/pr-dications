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

// Fonction pour obtenir la date locale à partir d'une date UTC
// Retourne la date au format YYYY-MM-DD dans le fuseau horaire local
const getLocalDate = (utcDateString) => {
  const date = new Date(utcDateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Fonction pour formater l'heure locale à partir d'une date UTC
const getLocalTime = (utcDateString) => {
  const date = new Date(utcDateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Fonction utilitaire pour obtenir les dates des prochains jours au format YYYY-MM-DD
const getNextDays = (numberOfDays) => {
  const dates = [];
  for (let i = 0; i < numberOfDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
};

const fetchUpcomingGames = async () => {
  try {
    console.log("🔍 Récupération des matchs à venir...");
    
    // Récupérer les matchs pour les 10 prochains jours
    const upcomingDates = getNextDays(10);
    let allGames = [];
    
    // Récupérer les matchs pour chaque jour
    for (const dateStr of upcomingDates) {
      try {
        const url = `https://api-web.nhle.com/v1/schedule/${dateStr}`;
        console.log(`📅 Récupération des matchs pour ${dateStr}`);
        
        const response = await axios.get(url);
        
        // Extraire les matchs selon la structure de réponse
        let gamesForDay = [];
        if (response.data?.gameWeek && response.data.gameWeek.length > 0) {
          gamesForDay = response.data.gameWeek[0].games || [];
        }
        
        console.log(`✅ ${gamesForDay.length} matchs trouvés pour ${dateStr}`);
        allGames = [...allGames, ...gamesForDay];
      } catch (dayError) {
        console.warn(`⚠️ Erreur pour ${dateStr}: ${dayError.message}`);
      }
    }
    
    // Ne garder que les matchs à venir
    const now = new Date();
    const excludedStates = ["FINAL", "OFF"]; // États des matchs terminés
    
    const upcomingGames = allGames.filter(game => {
      // Exclure les matchs terminés
      if (excludedStates.includes(game.gameState)) {
        return false;
      }
      
      // Vérifier si le match est dans le futur
      if (game.startTimeUTC) {
        const gameDate = new Date(game.startTimeUTC);
        return gameDate >= now || ["LIVE", "CRIT"].includes(game.gameState);
      }
      
      return false;
    });
    
    // Trier les matchs par date
    upcomingGames.sort((a, b) => {
      if (a.startTimeUTC && b.startTimeUTC) {
        return new Date(a.startTimeUTC) - new Date(b.startTimeUTC);
      }
      return 0;
    });
    
    // Dédupliquer les matchs
    const uniqueGames = [];
    const gameIds = new Set();
    
    for (const game of upcomingGames) {
      // Créer un identifiant unique basé sur les équipes et l'heure
      const homeTeam = getTeamName(game.homeTeam);
      const awayTeam = getTeamName(game.awayTeam);
      const gameId = `${game.startTimeUTC}-${homeTeam}-${awayTeam}`;
      
      if (!gameIds.has(gameId)) {
        // Pour chaque match, ajouter la date locale au format YYYY-MM-DD 
        // Cette date sera utilisée pour le regroupement dans le calendrier
        if (game.startTimeUTC) {
          game.localDate = getLocalDate(game.startTimeUTC);
          game.localTime = getLocalTime(game.startTimeUTC);
        }
        
        gameIds.add(gameId);
        uniqueGames.push(game);
      }
    }
    
    console.log(`✅ ${uniqueGames.length} matchs à venir uniques trouvés.`);
    
    // Afficher les matchs avec les dates locales pour débogage
    if (uniqueGames.length > 0) {
      console.log("Matchs à venir (date et heure locales):");
      uniqueGames.forEach(g => {
        if (g.startTimeUTC) {
          console.log(`- ${g.localDate} à ${g.localTime}: ${getTeamName(g.awayTeam)} @ ${getTeamName(g.homeTeam)} (${g.gameState})`);
        }
      });
    }
    
    return uniqueGames;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des matchs: ${error.message}`);
    if (error.response) {
      console.error("Détails de la réponse:", {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });
    }
    return [];
  }
};

const fetchUpcomingWithPredictions = async () => {
  const upcoming = await fetchUpcomingGames();
  if (upcoming.length === 0) return {};

  const gamesByDate = {};

  for (const g of upcoming) {
    if (!g.startTimeUTC || !g.homeTeam || !g.awayTeam) continue;

    // Utiliser la date locale (fuseau horaire de l'utilisateur) comme clé
    // plutôt que la date UTC
    const date = g.localDate; // Définie précédemment dans fetchUpcomingGames
    const time = g.localTime; // Heure locale également définie précédemment
    
    const home = normalizeTeamName(getTeamName(g.homeTeam));
    const away = normalizeTeamName(getTeamName(g.awayTeam));
    const gameState = g.gameState;

    console.log(`🧠 Prédiction pour ${away} @ ${home} le ${date}`);

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

  // Trier les jours par ordre chronologique
  const sortedGamesByDate = {};
  Object.keys(gamesByDate)
    .sort()
    .forEach(date => {
      sortedGamesByDate[date] = gamesByDate[date];
    });

  return sortedGamesByDate;
};

module.exports = fetchUpcomingWithPredictions;