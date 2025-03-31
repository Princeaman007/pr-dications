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

// Alias pour correspondre les noms courts aux noms complets et vice-versa
const teamAliases = {
  // Noms courts vers noms complets
  "Wild": "Minnesota Wild",
  "Devils": "New Jersey Devils",
  "Predators": "Nashville Predators",
  "Flyers": "Philadelphia Flyers",
  "Flames": "Calgary Flames",
  "Avalanche": "Colorado Avalanche",
  "Stars": "Dallas Stars",
  "Kraken": "Seattle Kraken",
  
  // Abréviations vers noms complets 
  "MIN": "Minnesota Wild",
  "NJD": "New Jersey Devils",
  "NSH": "Nashville Predators",
  "PHI": "Philadelphia Flyers",
  "CGY": "Calgary Flames",
  "COL": "Colorado Avalanche",
  "DAL": "Dallas Stars",
  "SEA": "Seattle Kraken",
  
  // Ajout des noms complets vers eux-mêmes pour normalisation cohérente
  "Minnesota Wild": "Minnesota Wild",
  "New Jersey Devils": "New Jersey Devils",
  "Nashville Predators": "Nashville Predators",
  "Philadelphia Flyers": "Philadelphia Flyers",
  "Calgary Flames": "Calgary Flames",
  "Colorado Avalanche": "Colorado Avalanche",
  "Dallas Stars": "Dallas Stars",
  "Seattle Kraken": "Seattle Kraken"
  // Ajouter d'autres équipes au besoin
};

// Table de correspondance inverse pour les requêtes de recherche
const teamVariations = {};
Object.entries(teamAliases).forEach(([alias, fullName]) => {
  if (!teamVariations[fullName]) teamVariations[fullName] = [];
  teamVariations[fullName].push(alias);
  // Ajouter également le nom complet
  teamVariations[fullName].push(fullName);
});

const normalizeTeamName = (name) => {
  if (!name) return "Équipe inconnue";
  return teamAliases[name] || name;
};

const fetchUpcomingGames = async () => {
  try {
    console.log("🔍 Récupération des matchs à venir...");
    const url = "https://api-web.nhle.com/v1/score/now";
    const res = await axios.get(url);
    const games = res.data.games || [];
    const upcomingGames = games.filter(g => ["FUT", "PRE", "WARMUP"].includes(g.gameState));
    console.log(`✅ ${upcomingGames.length} matchs à venir trouvés.`);
    return upcomingGames;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des matchs: ${error.message}`);
    return [];
  }
};

const predictScorersBetweenTeams = async (teamA, teamB, limit = 3) => {
  try {
    // Obtenir toutes les variations des noms d'équipe pour la recherche
    const teamAVariations = teamVariations[teamA] || [teamA];
    const teamBVariations = teamVariations[teamB] || [teamB];
    
    // Construire la requête avec toutes les variations possibles
    const query = {
      $or: [],
      status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
    };
    
    // Ajouter toutes les combinaisons possibles de noms d'équipe à la requête
    for (const a of teamAVariations) {
      for (const b of teamBVariations) {
        query.$or.push({ homeTeam: a, awayTeam: b });
        query.$or.push({ homeTeam: b, awayTeam: a });
      }
    }

    console.log(`   🔍 Recherche de matchs entre ${teamA} et ${teamB} (${teamAVariations.length * teamBVariations.length * 2} combinaisons)`);
    
    const matches = await Match.find(query).sort({ date: -1 });

    console.log(`   📊 ${matches.length} matchs trouvés dans l'historique`);
    
    if (!matches.length) {
      // Tentative de récupération des statistiques individuelles des équipes
      return await predictBasedOnTeamStats(teamA, teamB);
    }

    const playerStats = {};
    const synergyMap = {};
    const recentWeight = 1.5;
    
    // Vérifier si nous avons des dates valides
    const validDates = matches.filter(m => m.date).map(m => new Date(m.date));
    
    if (validDates.length === 0) {
      console.log("   ⚠️ Aucune date valide trouvée dans les matchs");
      return null;
    }
    
    const latestMatchDate = new Date(Math.max(...validDates.map(d => d.getTime())));

    matches.forEach((match) => {
      if (!match.date) return;
      
      const matchDate = new Date(match.date);
      if (isNaN(matchDate.getTime())) return;
      
      const daysSince = Math.min(365, Math.floor((latestMatchDate - matchDate) / (1000 * 60 * 60 * 24)));
      const weightFactor = Math.max(0.5, 1 - (daysSince / 365)) * recentWeight;

      const scorers = match.scorers || [];
      const activeScorers = scorers.filter(s => s && s.goals > 0);

      for (const scorer of scorers) {
        if (!scorer || !scorer.name) continue;
        
        const name = scorer.name;
        if (!playerStats[name]) {
          playerStats[name] = { 
            goals: 0, 
            assists: 0, 
            appearances: 0, 
            weightedGoals: 0, 
            weightedAssists: 0,
            team: scorer.team // Stocker l'équipe du joueur si disponible
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

      for (let i = 0; i < activeScorers.length; i++) {
        for (let j = i + 1; j < activeScorers.length; j++) {
          if (!activeScorers[i].name || !activeScorers[j].name) continue;
          
          const pair = [activeScorers[i].name, activeScorers[j].name].sort();
          const key = `${pair[0]}|${pair[1]}`;
          synergyMap[key] = (synergyMap[key] || 0) + weightFactor;
        }
      }
    });

    // Calculer les buts pour chaque équipe en tenant compte de toutes les variations de noms
    const isTeamA = (team) => teamAVariations.includes(team);
    const isTeamB = (team) => teamBVariations.includes(team);
    
    let teamAGoals = 0;
    let teamBGoals = 0;
    
    matches.forEach(match => {
      if (isTeamA(match.homeTeam)) {
        teamAGoals += (match.homeScore || 0);
      } else if (isTeamB(match.homeTeam)) {
        teamBGoals += (match.homeScore || 0);
      }
      
      if (isTeamA(match.awayTeam)) {
        teamAGoals += (match.awayScore || 0);
      } else if (isTeamB(match.awayTeam)) {
        teamBGoals += (match.awayScore || 0);
      }
    });

    if (Object.keys(playerStats).length === 0) {
      console.log("   ⚠️ Aucune statistique de joueur trouvée");
      return await predictBasedOnTeamStats(teamA, teamB);
    }

    const sortedScorers = Object.entries(playerStats)
      .map(([name, stats]) => ({
        name,
        score: stats.weightedGoals + stats.weightedAssists * 0.5,
        rawScore: stats.goals + stats.assists * 0.5,
        ...stats,
        efficiency: stats.appearances > 0 ? stats.goals / stats.appearances : 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const topSynergy = Object.entries(synergyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([key, count]) => ({
        pair: key.split("|"),
        matchesTogether: Math.round(count * 10) / 10
      }));

    return {
      sortedScorers,
      topSynergy: topSynergy.length > 0 ? topSynergy : [],
      matchCount: matches.length,
      teamAGoals,
      teamBGoals,
      source: "direct"
    };
  } catch (error) {
    console.error(`❌ Erreur lors de la prédiction ${teamA} vs ${teamB}: ${error.message}`);
    console.error(error.stack);
    return null;
  }
};

// Nouvelle fonction pour prédire basée sur les statistiques individuelles des équipes
const predictBasedOnTeamStats = async (teamA, teamB, limit = 3) => {
  try {
    console.log(`   🔄 Utilisation des statistiques individuelles des équipes (pas d'historique direct)`);
    
    // Obtenir les variations pour les équipes
    const teamAVariations = teamVariations[teamA] || [teamA];
    const teamBVariations = teamVariations[teamB] || [teamB];
    
    // Récupérer les derniers matchs pour l'équipe A
    const teamAMatches = await Match.find({
      $or: [
        ...teamAVariations.map(team => ({ homeTeam: team })),
        ...teamAVariations.map(team => ({ awayTeam: team }))
      ],
      status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
    }).sort({ date: -1 }).limit(10);
    
    // Récupérer les derniers matchs pour l'équipe B
    const teamBMatches = await Match.find({
      $or: [
        ...teamBVariations.map(team => ({ homeTeam: team })),
        ...teamBVariations.map(team => ({ awayTeam: team }))
      ],
      status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
    }).sort({ date: -1 }).limit(10);
    
    console.log(`   📊 Statistiques récentes trouvées: ${teamA} (${teamAMatches.length} matchs), ${teamB} (${teamBMatches.length} matchs)`);
    
    if (teamAMatches.length === 0 && teamBMatches.length === 0) {
      return null;
    }
    
    // Analyser les statistiques des joueurs de l'équipe A
    const teamAPlayers = {};
    teamAMatches.forEach(match => {
      const isHome = teamAVariations.some(team => team === match.homeTeam);
      const scorers = match.scorers || [];
      
      scorers.forEach(scorer => {
        if (!scorer || !scorer.name) return;
        
        // Vérifier si le joueur appartient à l'équipe A
        const isTeamAPlayer = isHome ? 
          (scorer.team === 'home' || !scorer.team) : 
          (scorer.team === 'away' || !scorer.team);
          
        if (!isTeamAPlayer) return;
        
        if (!teamAPlayers[scorer.name]) {
          teamAPlayers[scorer.name] = { goals: 0, assists: 0, appearances: 0 };
        }
        
        teamAPlayers[scorer.name].goals += (scorer.goals || 0);
        teamAPlayers[scorer.name].assists += (scorer.assists || 0);
        teamAPlayers[scorer.name].appearances++;
      });
    });
    
    // Analyser les statistiques des joueurs de l'équipe B
    const teamBPlayers = {};
    teamBMatches.forEach(match => {
      const isHome = teamBVariations.some(team => team === match.homeTeam);
      const scorers = match.scorers || [];
      
      scorers.forEach(scorer => {
        if (!scorer || !scorer.name) return;
        
        // Vérifier si le joueur appartient à l'équipe B
        const isTeamBPlayer = isHome ? 
          (scorer.team === 'home' || !scorer.team) : 
          (scorer.team === 'away' || !scorer.team);
          
        if (!isTeamBPlayer) return;
        
        if (!teamBPlayers[scorer.name]) {
          teamBPlayers[scorer.name] = { goals: 0, assists: 0, appearances: 0 };
        }
        
        teamBPlayers[scorer.name].goals += (scorer.goals || 0);
        teamBPlayers[scorer.name].assists += (scorer.assists || 0);
        teamBPlayers[scorer.name].appearances++;
      });
    });
    
    // Trier les joueurs de l'équipe A par buts marqués
    const sortedTeamAPlayers = Object.entries(teamAPlayers)
      .map(([name, stats]) => ({
        name,
        ...stats,
        efficiency: stats.appearances > 0 ? stats.goals / stats.appearances : 0,
        score: stats.goals + stats.assists * 0.5
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
      
    // Trier les joueurs de l'équipe B par buts marqués
    const sortedTeamBPlayers = Object.entries(teamBPlayers)
      .map(([name, stats]) => ({
        name,
        ...stats,
        efficiency: stats.appearances > 0 ? stats.goals / stats.appearances : 0,
        score: stats.goals + stats.assists * 0.5
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
      
    // Combiner les meilleurs joueurs des deux équipes
    const sortedScorers = [...sortedTeamAPlayers, ...sortedTeamBPlayers]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
      
    // Calculer la moyenne de buts pour chaque équipe
    const teamAAvgGoals = teamAMatches.length > 0 ? 
      teamAMatches.reduce((sum, match) => {
        const isHome = teamAVariations.some(team => team === match.homeTeam);
        return sum + (isHome ? (match.homeScore || 0) : (match.awayScore || 0));
      }, 0) / teamAMatches.length : 0;
      
    const teamBAvgGoals = teamBMatches.length > 0 ? 
      teamBMatches.reduce((sum, match) => {
        const isHome = teamBVariations.some(team => team === match.homeTeam);
        return sum + (isHome ? (match.homeScore || 0) : (match.awayScore || 0));
      }, 0) / teamBMatches.length : 0;
    
    return {
      sortedScorers,
      topSynergy: [], // Pas de données de synergie disponibles
      matchCount: Math.max(teamAMatches.length, teamBMatches.length),
      teamAGoals: Math.round(teamAAvgGoals * 10) / 10,
      teamBGoals: Math.round(teamBAvgGoals * 10) / 10,
      source: "individual" // Indiquer que les prédictions sont basées sur les statistiques individuelles
    };
  } catch (error) {
    console.error(`❌ Erreur lors de la prédiction alternative ${teamA} vs ${teamB}: ${error.message}`);
    console.error(error.stack);
    return null;
  }
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

const run = async () => {
  try {
    const upcoming = await fetchUpcomingGames();
    if (upcoming.length === 0) {
      console.log("❌ Aucun match à venir n'a été trouvé.");
      return;
    }

    const gamesByDate = {};
    for (const g of upcoming) {
      if (!g.startTimeUTC) continue;

      const date = g.startTimeUTC.split("T")[0];
      const homeTeam = normalizeTeamName(getTeamName(g.homeTeam));
      const awayTeam = normalizeTeamName(getTeamName(g.awayTeam));
      const timeStr = g.startTimeUTC.split("T")[1].substring(0, 5);

      if (!gamesByDate[date]) gamesByDate[date] = [];
      gamesByDate[date].push({ home: homeTeam, away: awayTeam, time: timeStr, gameState: g.gameState });
    }

    const dates = Object.keys(gamesByDate).sort();

    for (const date of dates) {
      console.log(`\n📅 Matchs prévus pour le ${date}`);

      for (const game of gamesByDate[date]) {
        const { home, away, time, gameState } = game;
        console.log(`\n🏒 ${time} - ${away} @ ${home} (${gameState})`);

        const prediction = await predictScorersBetweenTeams(home, away);

        if (!prediction) {
          console.log("   ❌ Pas de données historiques suffisantes.");
          continue;
        }

        const { matchCount, teamAGoals, teamBGoals, source } = prediction;

        if (source === "direct") {
          console.log(`   📊 Historique direct: ${matchCount} matchs, score global ${home} ${teamAGoals}-${teamBGoals} ${away}`);
        } else {
          console.log(`   📊 Basé sur forme récente (${matchCount} derniers matchs): moyenne de buts ${home} ${teamAGoals}-${teamBGoals} ${away}`);
        }
        
        if (prediction.sortedScorers.length > 0) {
          console.log("   🔮 Buteurs probables:");
          prediction.sortedScorers.forEach((p, i) => {
            const efficiency = (p.efficiency).toFixed(2);
            console.log(`     ${i + 1}. ${p.name} — ${p.goals} buts, ${p.assists} assists (${efficiency} buts/match)`);
          });
        } else {
          console.log("   ⚠️ Aucune statistique de buteur disponible");
        }

        if (prediction.topSynergy && prediction.topSynergy.length) {
          const s = prediction.topSynergy[0];
          console.log(`   🤝 Duo: ${s.pair[0]} + ${s.pair[1]} (${s.matchesTogether} matchs avec buts ensemble)`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Erreur générale: ${error.message}`);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Connexion MongoDB fermée");
  }
};

run();