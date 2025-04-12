// nhlFetcherCore.js
const axios = require("axios");
const mongoose = require("mongoose");
const Match = require("../models/Match");


const NHL_TEAMS = [
  { name: "Anaheim Ducks", abbr: "ANA" },
  { name: "Boston Bruins", abbr: "BOS" },
  { name: "Buffalo Sabres", abbr: "BUF" },
  { name: "Calgary Flames", abbr: "CGY" },
  { name: "Carolina Hurricanes", abbr: "CAR" },
  { name: "Chicago Blackhawks", abbr: "CHI" },
  { name: "Colorado Avalanche", abbr: "COL" },
  { name: "Columbus Blue Jackets", abbr: "CBJ" },
  { name: "Dallas Stars", abbr: "DAL" },
  { name: "Detroit Red Wings", abbr: "DET" },
  { name: "Edmonton Oilers", abbr: "EDM" },
  { name: "Florida Panthers", abbr: "FLA" },
  { name: "Los Angeles Kings", abbr: "LAK" },
  { name: "Minnesota Wild", abbr: "MIN" },
  { name: "Montréal Canadiens", abbr: "MTL" },
  { name: "Nashville Predators", abbr: "NSH" },
  { name: "New Jersey Devils", abbr: "NJD" },
  { name: "New York Islanders", abbr: "NYI" },
  { name: "New York Rangers", abbr: "NYR" },
  { name: "Ottawa Senators", abbr: "OTT" },
  { name: "Philadelphia Flyers", abbr: "PHI" },
  { name: "Pittsburgh Penguins", abbr: "PIT" },
  { name: "San Jose Sharks", abbr: "SJS" },
  { name: "Seattle Kraken", abbr: "SEA" },
  { name: "St. Louis Blues", abbr: "STL" },
  { name: "Tampa Bay Lightning", abbr: "TBL" },
  { name: "Toronto Maple Leafs", abbr: "TOR" },
  { name: "Utah Hockey Club", abbr: "UHC" }, // ✅ Ex-Arizona Coyotes
  { name: "Vancouver Canucks", abbr: "VAN" },
  { name: "Vegas Golden Knights", abbr: "VGK" },
  { name: "Washington Capitals", abbr: "WSH" },
  { name: "Winnipeg Jets", abbr: "WPG" }
];
// Constantes pour les états de jeux
const FINAL_GAME_STATES = ["FINAL", "OFFICIAL", "OFF", "7", "F"];

// Fonction de débogage pour analyser la réponse de l'API
const analyzeAPIResponse = async (teamAbbr, season) => {
  try {
    const url = `https://api-web.nhle.com/v1/club-schedule-season/${teamAbbr}/${season}`;
    console.log(`🔍 Analyse de l'API: ${url}`);

    const response = await axios.get(url);
    const games = response.data?.games || [];

    console.log(`📊 Nombre total de matchs reçus: ${games.length}`);

    if (games.length > 0) {
      // Analyser les types de jeu et états de jeu
      const gameTypes = new Set();
      const gameStates = new Set();

      games.forEach(g => {
        gameTypes.add(g.gameType);
        gameStates.add(g.gameState);
      });

      console.log(`🏒 Types de jeu trouvés: ${[...gameTypes].join(', ')}`);
      console.log(`🚦 États de jeu trouvés: ${[...gameStates].join(', ')}`);

      // Afficher les 5 derniers matchs pour analyse
      console.log(`\n📋 Détails des 5 derniers matchs:`);
      games.slice(-5).forEach((g, i) => {
        console.log(`Match ${i + 1}: ${g.gameDate} - Type: ${g.gameType} - État: ${g.gameState}`);
        console.log(`   ${g.awayTeam.placeName?.default} ${g.awayTeam.commonName?.default} @ ${g.homeTeam.placeName?.default} ${g.homeTeam.commonName?.default}`);
      });
    } else {
      console.log("❌ Aucun match trouvé dans la réponse de l'API.");
    }

    return games;
  } catch (err) {
    console.error(`❌ Erreur lors de l'analyse de l'API: ${err.message}`);
    return [];
  }
};

// Fonction utilitaire pour extraire un nom de joueur valide sous forme de chaîne
const extractPlayerName = (player) => {
  // Si nous avons déjà un nom en chaîne de caractères
  if (typeof player.name === 'string') {
    return player.name;
  }

  // Si le nom est un objet avec une propriété default
  if (typeof player.name === 'object' && player.name && player.name.default) {
    return player.name.default;
  }

  // Si nous avons firstName et lastName comme objets
  if (player.firstName && player.lastName) {
    if (typeof player.firstName === 'object' && player.firstName.default &&
      typeof player.lastName === 'object' && player.lastName.default) {
      return `${player.firstName.default} ${player.lastName.default}`;
    }

    // Si firstName et lastName sont des chaînes
    if (typeof player.firstName === 'string' && typeof player.lastName === 'string') {
      return `${player.firstName} ${player.lastName}`;
    }
  }

  // Si nous avons un fullName
  if (typeof player.fullName === 'string') {
    return player.fullName;
  }

  // Dernier recours, utiliser l'ID
  return `Joueur #${player.playerId || player.id || 'inconnu'}`;
};

// Extraire les marqueurs depuis la section scoring
const extractScorersFromScoring = (scoring) => {
  try {
    const scorersMap = new Map(); // Utiliser une Map pour éviter les doublons

    // Parcourir chaque période
    for (const period of scoring) {
      if (!period.goals || !Array.isArray(period.goals)) continue;

      // Parcourir chaque but
      for (const goal of period.goals) {
        if (!goal.scoringPlayerId) continue;

        // Récupérer les informations du buteur
        let scorerName = "";
        if (goal.firstName && goal.lastName) {
          if (typeof goal.firstName === 'object' && goal.firstName.default) {
            scorerName = `${goal.firstName.default} ${goal.lastName.default}`;
          } else {
            scorerName = `${goal.firstName} ${goal.lastName}`;
          }
        } else {
          scorerName = `Joueur #${goal.scoringPlayerId}`;
        }

        // Mise à jour du compteur pour ce joueur
        if (!scorersMap.has(goal.scoringPlayerId)) {
          scorersMap.set(goal.scoringPlayerId, {
            name: scorerName,
            goals: 1,
            assists: 0
          });
        } else {
          const scorer = scorersMap.get(goal.scoringPlayerId);
          scorer.goals += 1;
        }

        // Ajouter les assistants
        if (goal.assists && Array.isArray(goal.assists)) {
          for (const assist of goal.assists) {
            if (!assist.playerId) continue;

            let assistName = "";
            if (assist.firstName && assist.lastName) {
              if (typeof assist.firstName === 'object' && assist.firstName.default) {
                assistName = `${assist.firstName.default} ${assist.lastName.default}`;
              } else {
                assistName = `${assist.firstName} ${assist.lastName}`;
              }
            } else {
              assistName = `Joueur #${assist.playerId}`;
            }

            if (!scorersMap.has(assist.playerId)) {
              scorersMap.set(assist.playerId, {
                name: assistName,
                goals: 0,
                assists: 1
              });
            } else {
              const scorer = scorersMap.get(assist.playerId);
              scorer.assists += 1;
            }
          }
        }
      }
    }

    // Convertir la Map en array
    const scorers = Array.from(scorersMap.values());
    console.log(`✅ Trouvé ${scorers.length} marqueurs depuis scoring`);
    return scorers;
  } catch (err) {
    console.error("❌ Erreur lors de l'extraction des marqueurs depuis scoring:", err.message);
    return [];
  }
};

// Extraire les marqueurs depuis playerByGameStats
const extractScorersFromStats = (stats) => {
  try {
    if (!stats) return [];

    const players = [];

    // Collecter les joueurs de l'équipe à domicile
    if (stats.homeTeam) {
      if (Array.isArray(stats.homeTeam.forwards)) players.push(...stats.homeTeam.forwards);
      if (Array.isArray(stats.homeTeam.defense)) players.push(...stats.homeTeam.defense);
      if (Array.isArray(stats.homeTeam.goalies)) players.push(...stats.homeTeam.goalies);
    }

    // Collecter les joueurs de l'équipe visiteuse
    if (stats.awayTeam) {
      if (Array.isArray(stats.awayTeam.forwards)) players.push(...stats.awayTeam.forwards);
      if (Array.isArray(stats.awayTeam.defense)) players.push(...stats.awayTeam.defense);
      if (Array.isArray(stats.awayTeam.goalies)) players.push(...stats.awayTeam.goalies);
    }

    console.log(`👥 Nombre total de joueurs trouvés: ${players.length}`);

    const scorers = [];

    for (const player of players) {
      const goals = player.goals || 0;
      const assists = player.assists || 0;

      if (goals > 0 || assists > 0) {
        // Extraire correctement le nom du joueur selon sa structure
        const playerName = extractPlayerName(player);

        scorers.push({
          name: playerName,
          goals,
          assists
        });
      }
    }

    console.log(`✅ Trouvé ${scorers.length} marqueurs depuis playerByGameStats`);
    return scorers;
  } catch (err) {
    console.error("❌ Erreur lors de l'extraction des marqueurs depuis playerByGameStats:", err.message);
    return [];
  }
};

// Extraire les marqueurs depuis playerBoxScore
const extractScorersFromPlayerBoxScore = (boxScore) => {
  try {
    const scorers = [];

    // Vérifier si nous avons des joueurs
    if (!boxScore.homeTeam || !boxScore.awayTeam) return [];

    const homeTeamPlayers = [
      ...(boxScore.homeTeam.forwards || []),
      ...(boxScore.homeTeam.defense || []),
      ...(boxScore.homeTeam.goalies || [])
    ];

    const awayTeamPlayers = [
      ...(boxScore.awayTeam.forwards || []),
      ...(boxScore.awayTeam.defense || []),
      ...(boxScore.awayTeam.goalies || [])
    ];

    const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];

    for (const player of allPlayers) {
      const goals = player.goals || 0;
      const assists = player.assists || 0;

      if (goals > 0 || assists > 0) {
        let playerName = extractPlayerName(player);

        scorers.push({
          name: playerName,
          goals,
          assists
        });
      }
    }

    console.log(`✅ Trouvé ${scorers.length} marqueurs depuis playerBoxScore`);
    return scorers;
  } catch (err) {
    console.error("❌ Erreur lors de l'extraction des marqueurs depuis playerBoxScore:", err.message);
    return [];
  }
};

// Extraire les marqueurs depuis un tableau de joueurs
const extractScorersFromPlayersArray = (players) => {
  try {
    const scorers = [];

    for (const player of players) {
      const goals = player.goals || player.stat?.goals || 0;
      const assists = player.assists || player.stat?.assists || 0;

      if (goals > 0 || assists > 0) {
        let playerName = extractPlayerName(player);

        scorers.push({
          name: playerName,
          goals,
          assists
        });
      }
    }

    console.log(`✅ Trouvé ${scorers.length} marqueurs depuis tableau de joueurs`);
    return scorers;
  } catch (err) {
    console.error("❌ Erreur lors de l'extraction des marqueurs depuis tableau de joueurs:", err.message);
    return [];
  }
};

// Fonction pour récupérer les données de boxscore à partir d'un ID de match
const getBoxscore = async (gameId) => {
  try {
    const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`;
    const res = await axios.get(url);

    // Vérifier la structure pour s'assurer que nous accédons aux bonnes propriétés
    if (res.data.homeTeam && typeof res.data.homeTeam.score === 'number' &&
      res.data.awayTeam && typeof res.data.awayTeam.score === 'number') {
      return {
        homeScore: res.data.homeTeam.score,
        awayScore: res.data.awayTeam.score
      };
    }

    // Essayer une structure alternative
    if (res.data.linescore && res.data.linescore.teams) {
      return {
        homeScore: res.data.linescore.teams.home.goals || 0,
        awayScore: res.data.linescore.teams.away.goals || 0
      };
    }

    // Si aucune structure valide n'est trouvée
    console.warn(`⚠️ Structure de score non standard pour ${gameId}`);
    return { homeScore: 0, awayScore: 0 };
  } catch (err) {
    console.error(`❌ Erreur boxscore pour ${gameId} :`, err.message);
    return { homeScore: 0, awayScore: 0 };
  }
};

// Fonction pour récupérer les buteurs d'un match
const getScorersFromGame = async (gameId) => {
  try {
    const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`;
    console.log(`📡 Requête boxscore pour le match ${gameId}`);

    const response = await axios.get(url);

    // Vérifier différentes structures de données disponibles
    if (response.data.scoring && Array.isArray(response.data.scoring)) {
      console.log("✅ Structure scoring trouvée");
      return extractScorersFromScoring(response.data.scoring);
    }

    if (response.data.playerByGameStats) {
      console.log("✅ Structure playerByGameStats trouvée");
      return extractScorersFromStats(response.data.playerByGameStats);
    }

    if (response.data.playerBoxScore) {
      console.log("✅ Structure playerBoxScore trouvée");
      return extractScorersFromPlayerBoxScore(response.data.playerBoxScore);
    }

    if (response.data.homeTeam && response.data.homeTeam.players) {
      console.log("✅ Structure homeTeam.players trouvée");

      const players = [
        ...(response.data.homeTeam.players || []),
        ...(response.data.awayTeam?.players || [])
      ];

      return extractScorersFromPlayersArray(players);
    }

    console.log("⚠️ Aucune structure connue trouvée pour les marqueurs");
    return [];
  } catch (err) {
    console.error(`❌ Erreur récupération scorers pour ${gameId} : ${err.message}`);
    return [];
  }
};

// Fonction principale pour obtenir les derniers matchs terminés
const getLastFinalGames = async (teamAbbr, season = "20242025", limit = 5) => {
  try {
    const url = `https://api-web.nhle.com/v1/club-schedule-season/${teamAbbr}/${season}`;
    console.log(`📡 Récupération des matchs pour ${teamAbbr}...`);
    const response = await axios.get(url);
    const games = response.data?.games || [];

    if (!games.length) {
      console.log("❌ Aucun match trouvé.");
      return;
    }

    // Inclure tous les matchs sauf ceux en FUTUR (FUT)
    const filteredGames = games.filter(g => g.gameState !== "FUT");

    const recentGames = filteredGames.slice(-limit);
    console.log(`🎮 Traitement de ${recentGames.length} matchs récents`);

    const gamePromises = recentGames.map(async (game) => {
      const homeTeam = `${game.homeTeam.placeName?.default ?? ''} ${game.homeTeam.commonName?.default ?? ''}`.trim();
      const awayTeam = `${game.awayTeam.placeName?.default ?? ''} ${game.awayTeam.commonName?.default ?? ''}`.trim();

      console.log(`🏒 ${awayTeam} @ ${homeTeam} (${game.id})`);

      const exists = await Match.findOne({ gameId: game.id.toString() });

      if (exists) {
        console.log(`⚠️ Match ${awayTeam} @ ${homeTeam} (ID: ${game.id}) déjà existant.`);
        return;
      }

      const [scorers, boxscore] = await Promise.all([
        getScorersFromGame(game.id),
        getBoxscore(game.id)
      ]);

      const matchData = {
        gameId: game.id.toString(),
        date: game.gameDate.substring(0, 10),
        homeTeam,
        awayTeam,
        homeScore: boxscore.homeScore,
        awayScore: boxscore.awayScore,
        status: game.gameState,
        scorers
      };

      await Match.create(matchData);
      console.log(`✅ Match ajouté: ${homeTeam} vs ${awayTeam} (${scorers.length} buteurs)`);
    });

    await Promise.all(gamePromises);
  } catch (err) {
    console.error("❌ Erreur dans getLastFinalGames:", err.message);
  }
};

module.exports = {
  getLastFinalGames,
  analyzeAPIResponse,
  getScorersFromGame,
  getBoxscore,
  NHL_TEAMS
};