// predictUpcoming.js
const axios = require("axios");
const mongoose = require("mongoose");
const Match = require("./models/Match");
require("dotenv").config();

// Connexion MongoDB avec gestion d'erreur
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ Erreur MongoDB:", err.message);
    process.exit(1);
  });

/**
 * Récupère les matchs à venir depuis l'API NHL
 * @returns {Array} Liste des matchs à venir
 */
const fetchUpcomingGames = async () => {
  try {
    console.log("🔍 Récupération des matchs à venir...");
    const url = "https://api-web.nhle.com/v1/score/now";
    const res = await axios.get(url);
    const games = res.data.games || [];
    
    // Ne garder que les matchs à venir (scheduled, warmup, preview...)
    const upcomingGames = games.filter(g => ["FUT", "PRE", "WARMUP"].includes(g.gameState));
    
    console.log(`✅ ${upcomingGames.length} matchs à venir trouvés.`);
    return upcomingGames;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des matchs: ${error.message}`);
    return [];
  }
};

/**
 * Prédit les buteurs probables pour un match entre deux équipes
 * @param {string} teamA - Nom de la première équipe
 * @param {string} teamB - Nom de la deuxième équipe
 * @param {number} limit - Nombre de buteurs à prédire
 * @returns {Object|null} Prédiction des buteurs ou null si pas assez de données
 */
const predictScorersBetweenTeams = async (teamA, teamB, limit = 3) => {
  try {
    // Recherche des confrontations précédentes
    const matches = await Match.find({
      $or: [
        { homeTeam: teamA, awayTeam: teamB },
        { homeTeam: teamB, awayTeam: teamA }
      ],
      status: { $in: ["FINAL", "OFF", "OFFICIAL", "F"] }
    }).sort({ date: -1 });
    
    
    if (!matches.length) return null;
    
    const playerStats = {};
    const synergyMap = {};
    const recentWeight = 1.5; // Poids plus important pour les matchs récents
    
    // Récupère la date du match le plus récent
    const latestMatchDate = new Date(Math.max(...matches.map(m => new Date(m.date))));
    
    // Traitement des matchs en tenant compte de la récence
    matches.forEach((match, index) => {
      const matchDate = new Date(match.date);
      // Différence en jours, maximum 365 jours
      const daysSince = Math.min(365, Math.floor((latestMatchDate - matchDate) / (1000 * 60 * 60 * 24)));
      // Facteur de pondération: diminue avec l'ancienneté
      const weightFactor = Math.max(0.5, 1 - (daysSince / 365)) * recentWeight;
      
      const scorers = match.scorers || [];
      const activeScorers = scorers.filter(s => s.goals > 0);
      
      // Calcul des statistiques des joueurs
      for (const scorer of scorers) {
        const name = scorer.name;
        if (!playerStats[name]) {
          playerStats[name] = { 
            goals: 0, 
            assists: 0, 
            appearances: 0,
            weightedGoals: 0,
            weightedAssists: 0
          };
        }
        
        const goals = scorer.goals || 0;
        const assists = scorer.assists || 0;
        
        playerStats[name].goals += goals;
        playerStats[name].assists += assists;
        playerStats[name].appearances++;
        playerStats[name].weightedGoals += goals * weightFactor;
        playerStats[name].weightedAssists += assists * weightFactor;
      }
      
      // Analyse des synergies
      for (let i = 0; i < activeScorers.length; i++) {
        for (let j = i + 1; j < activeScorers.length; j++) {
          const pair = [activeScorers[i].name, activeScorers[j].name].sort();
          const key = `${pair[0]}|${pair[1]}`;
          synergyMap[key] = (synergyMap[key] || 0) + weightFactor;
        }
      }
    });
    
    // Calcul du score global pour chaque équipe
    const teamAGoals = matches.reduce((sum, match) => 
      sum + (match.homeTeam === teamA ? match.homeScore : match.awayScore), 0);
    
    const teamBGoals = matches.reduce((sum, match) => 
      sum + (match.homeTeam === teamB ? match.homeScore : match.awayScore), 0);
    
    // Tri des meilleurs buteurs avec pondération
    const sortedScorers = Object.entries(playerStats)
      .map(([name, stats]) => ({
        name,
        score: stats.weightedGoals + stats.weightedAssists * 0.5,
        rawScore: stats.goals + stats.assists * 0.5,
        ...stats,
        efficiency: stats.goals / stats.appearances
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    // Meilleures synergies
    const topSynergy = Object.entries(synergyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([key, count]) => ({
        pair: key.split("|"),
        matchesTogether: Math.round(count * 10) / 10
      }));
    
    return { 
      sortedScorers, 
      topSynergy,
      matchCount: matches.length,
      teamAGoals,
      teamBGoals
    };
  } catch (error) {
    console.error(`❌ Erreur lors de la prédiction ${teamA} vs ${teamB}: ${error.message}`);
    return null;
  }
};

/**
 * Extrait le nom complet d'une équipe à partir des données de l'API
 * @param {Object} team - Objet équipe de l'API
 * @returns {string} Nom complet de l'équipe
 */
const getTeamName = (team) => {
  // Essayer différentes structures possibles
  if (team?.name?.default) {
    return team.name.default.trim();
  }
  
  if (team?.placeName?.default && team?.teamName?.default) {
    return `${team.placeName.default} ${team.teamName.default}`.trim();
  }
  
  if (team?.placeName?.default && team?.commonName?.default) {
    return `${team.placeName.default} ${team.commonName.default}`.trim();
  }
  
  if (team?.fullName) {
    return team.fullName.trim();
  }
  
  if (team?.triCode) {
    return team.triCode.trim();
  }
  
  return "Équipe inconnue";
};

/**
 * Fonction principale d'exécution
 */
const run = async () => {
  try {
    // Récupération des matchs à venir
    const upcoming = await fetchUpcomingGames();
    
    if (upcoming.length === 0) {
      console.log("❌ Aucun match à venir n'a été trouvé.");
      return;
    }
    
    // Pour déboguer la structure des données
    if (upcoming.length > 0) {
      console.log("🔍 Structure d'un match à titre d'exemple :");
      console.log(JSON.stringify(upcoming[0], null, 2).substring(0, 500) + '...');
    }
    
    // Organisation des matchs par date
    const gamesByDate = {};
    
    for (const g of upcoming) {
      if (!g.startTimeUTC) continue;
      
      const date = g.startTimeUTC.split("T")[0];
      const homeTeam = getTeamName(g.homeTeam);
      const awayTeam = getTeamName(g.awayTeam);
      
      // Extraction de l'heure du match pour l'affichage
      const timeStr = g.startTimeUTC.split("T")[1].substring(0, 5);
      
      if (!gamesByDate[date]) gamesByDate[date] = [];
      
      gamesByDate[date].push({ 
        home: homeTeam, 
        away: awayTeam, 
        time: timeStr,
        gameState: g.gameState
      });
    }
    
    // Parcours des matchs par date
    const dates = Object.keys(gamesByDate).sort(); // Tri des dates
    
    for (const date of dates) {
      console.log(`\n📅 Matchs prévus pour le ${date}`);
      
      // Traitement des matchs de cette date
      for (const game of gamesByDate[date]) {
        const { home, away, time, gameState } = game;
        console.log(`\n🏒 ${time} - ${away} @ ${home} (${gameState})`);
        
        // Obtention des prédictions
        const prediction = await predictScorersBetweenTeams(home, away);
        
        if (!prediction) {
          console.log("   ❌ Pas de données historiques suffisantes.");
          continue;
        }
        
        const { matchCount, teamAGoals, teamBGoals } = prediction;
        
        // Affichage du contexte historique
        console.log(`   📊 Historique: ${matchCount} matchs, score global ${home} ${teamAGoals}-${teamBGoals} ${away}`);
        
        // Affichage des buteurs prévus
        console.log("   🔮 Buteurs probables:");
        prediction.sortedScorers.forEach((p, i) => {
          const efficiency = (p.efficiency).toFixed(2);
          console.log(`     ${i + 1}. ${p.name} — ${p.goals} buts, ${p.assists} assists (${efficiency} buts/match)`);
        });
        
        // Affichage de la synergie
        if (prediction.topSynergy.length) {
          const s = prediction.topSynergy[0];
          console.log(`   🤝 Duo: ${s.pair[0]} + ${s.pair[1]} (${s.matchesTogether} matchs avec buts ensemble)`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Erreur générale: ${error.message}`);
  } finally {
    // Fermeture de la connexion dans tous les cas
    await mongoose.connection.close();
    console.log("\n🔌 Connexion MongoDB fermée");
  }
};

// Exécution du script
run();