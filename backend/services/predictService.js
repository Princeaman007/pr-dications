const Match = require("../models/Match");

// Alias pour normaliser les noms d'équipes (inchangé)
const teamAliases = {
  "Wild": "Minnesota Wild", "MIN": "Minnesota Wild", "Minnesota Wild": "Minnesota Wild",
  "Devils": "New Jersey Devils", "NJD": "New Jersey Devils", "New Jersey Devils": "New Jersey Devils",
  "Predators": "Nashville Predators", "NSH": "Nashville Predators", "Nashville Predators": "Nashville Predators",
  "Flyers": "Philadelphia Flyers", "PHI": "Philadelphia Flyers", "Philadelphia Flyers": "Philadelphia Flyers",
  "Flames": "Calgary Flames", "CGY": "Calgary Flames", "Calgary Flames": "Calgary Flames",
  "Avalanche": "Colorado Avalanche", "COL": "Colorado Avalanche", "Colorado Avalanche": "Colorado Avalanche",
  "Stars": "Dallas Stars", "DAL": "Dallas Stars", "Dallas Stars": "Dallas Stars",
  "Kraken": "Seattle Kraken", "SEA": "Seattle Kraken", "Seattle Kraken": "Seattle Kraken"
};

const teamVariations = {};
Object.entries(teamAliases).forEach(([alias, full]) => {
  if (!teamVariations[full]) teamVariations[full] = new Set();
  teamVariations[full].add(alias);
  teamVariations[full].add(full);
});

const normalizeTeamName = (name) => {
  if (!name) return "Équipe inconnue";
  return teamAliases[name] || name;
};

// 🔮 Prédiction entre deux équipes avec analyse approfondie des duos
const predictScorersBetweenTeams = async (teamA, teamB, limit = 3) => {
  try {
    console.log(`🔮 Prédiction de buteurs pour ${teamA} vs ${teamB}`);
    
    // Normaliser les noms d'équipe pour s'assurer qu'ils correspondent aux alias
    const normalizedTeamA = normalizeTeamName(teamA);
    const normalizedTeamB = normalizeTeamName(teamB);
    
    const teamAVars = Array.from(teamVariations[normalizedTeamA] || [normalizedTeamA]);
    const teamBVars = Array.from(teamVariations[normalizedTeamB] || [normalizedTeamB]);

    const query = {
      $or: [],
      status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
    };

    for (const a of teamAVars) {
      for (const b of teamBVars) {
        query.$or.push({ homeTeam: a, awayTeam: b });
        query.$or.push({ homeTeam: b, awayTeam: a });
      }
    }

    const matches = await Match.find(query).sort({ date: -1 });
    console.log(`📊 ${matches.length} confrontations directes trouvées entre ${teamA} et ${teamB}`);

    // Rechercher aussi les matchs récents des deux équipes (pour comparer les tendances récentes)
    const recentTeamAMatches = await findRecentMatches(teamAVars, 5);
    const recentTeamBMatches = await findRecentMatches(teamBVars, 5);
    
    console.log(`📊 Matchs récents: ${recentTeamAMatches.length} pour ${teamA}, ${recentTeamBMatches.length} pour ${teamB}`);

    if (!matches.length) {
      console.log(`⚠️ Aucune confrontation directe, utilisation des stats individuelles`);
      return await predictBasedOnTeamStats(normalizedTeamA, normalizedTeamB, limit);
    }

    // 🔄 Analyse des statistiques et tendances
    const stats = analyzeMatches(matches, teamAVars, teamBVars);
    
    // 🤝 Analyse approfondie des duos
    const enhancedDuoAnalysis = analyzeDuos(matches, teamAVars, teamBVars);
    
    // 📈 Intégrer les tendances récentes pour affiner les prédictions
    integrateRecentTrends(stats, recentTeamAMatches, recentTeamBMatches, teamAVars, teamBVars);
    
    // ✨ Sortie des buteurs potentiels
    const sortedScorers = generateScorerPredictions(stats, limit);
    
    // 🤼 Sortie des duos synergiques
    const topSynergy = generateSynergyPredictions(enhancedDuoAnalysis);

    console.log(`✅ Prédiction basée sur ${matches.length} confrontations directes`);
    console.log(`📈 Buteurs potentiels:`, sortedScorers.map(s => `${s.name} (${s.goals}G, ${s.assists}A)`));
    console.log(`🤝 Duos prédits:`, topSynergy.map(d => `${d.pair.join(' + ')} (${d.score.toFixed(2)})`));

    return {
      sortedScorers,
      topSynergy,
      matchCount: matches.length,
      teamAGoals: stats.teamAGoals,
      teamBGoals: stats.teamBGoals,
      source: "direct"
    };
  } catch (error) {
    console.error(`❌ Erreur lors de la prédiction: ${error.message}`);
    // Retourner une prédiction vide en cas d'erreur
    return {
      sortedScorers: [],
      topSynergy: [],
      matchCount: 0,
      teamAGoals: 0,
      teamBGoals: 0,
      source: "error"
    };
  }
};

// 🔍 Récupérer les matchs récents pour une équipe
const findRecentMatches = async (teamVariations, limit = 5) => {
  try {
    const query = {
      $or: [
        ...teamVariations.map(t => ({ homeTeam: t })),
        ...teamVariations.map(t => ({ awayTeam: t }))
      ],
      status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
    };
    
    return await Match.find(query).sort({ date: -1 }).limit(limit);
  } catch (err) {
    console.error(`❌ Erreur récupération matchs récents: ${err.message}`);
    return [];
  }
};

// 📊 Analyse des matchs pour extraire les statistiques et tendances
const analyzeMatches = (matches, teamAVars, teamBVars) => {
  const playerStats = {};
  const duoAppearances = {};
  const duoSynergy = {};
  const scoringPatterns = {}; // Nouveaux patterns de score
  
  // Déterminer la date du match le plus récent
  const latestMatchDate = new Date(Math.max(...matches.map(m => new Date(m.date || 0).getTime())));
  const recentWeight = 1.5; // Poids pour les matchs récents
  
  let teamAGoals = 0;
  let teamBGoals = 0;
  
  matches.forEach(match => {
    try {
      // Calculer le poids du match (plus récent = plus important)
      const date = new Date(match.date || 0);
      const daysSince = Math.floor((latestMatchDate - date) / (1000 * 60 * 60 * 24));
      const weightFactor = Math.max(0.5, 1 - daysSince / 365) * recentWeight;
      
      // Déterminer quelle équipe est quelle
      const isTeamAHome = teamAVars.includes(match.homeTeam);
      const homeTeam = isTeamAHome ? "teamA" : "teamB";
      const awayTeam = isTeamAHome ? "teamB" : "teamA";
      
      // Compter les buts
      if (match.homeScore !== undefined && match.awayScore !== undefined) {
        if (isTeamAHome) {
          teamAGoals += match.homeScore;
          teamBGoals += match.awayScore;
        } else {
          teamAGoals += match.awayScore;
          teamBGoals += match.homeScore;
        }
        
        // Enregistrer le pattern de score (pour analyse des tendances)
        const pattern = `${match.homeScore}-${match.awayScore}`;
        scoringPatterns[pattern] = (scoringPatterns[pattern] || 0) + 1;
      }
      
      // Analyser les buteurs
      const scorers = match.scorers || [];
      const activeScorers = scorers.filter(s => s && s.goals > 0);
      const scorersByTeam = {
        teamA: [],
        teamB: []
      };
      
      // Classer les buteurs par équipe pour l'analyse des duos
      for (const s of scorers) {
        if (!s?.name) continue;
        
        // Déterminer l'équipe du joueur
        let playerTeam = "unknown";
        if (s.team === "home") {
          playerTeam = homeTeam;
        } else if (s.team === "away") {
          playerTeam = awayTeam;
        } else {
          // Si pas d'info, tenter de deviner en fonction du match
          const goalsForTeamA = isTeamAHome ? match.homeScore : match.awayScore;
          const goalTotal = (match.homeScore || 0) + (match.awayScore || 0);
          
          // Si l'équipe A a marqué la plupart des buts, probablement de l'équipe A
          if (goalsForTeamA > 0 && goalsForTeamA > (goalTotal / 2)) {
            playerTeam = "teamA";
          } else {
            playerTeam = "teamB";
          }
        }
        
        // Enregistrer le buteur dans son équipe pour l'analyse des duos
        if (playerTeam === "teamA" || playerTeam === "teamB") {
          scorersByTeam[playerTeam].push(s);
        }
        
        // Ajouter aux statistiques du joueur
        const name = s.name;
        if (!playerStats[name]) {
          playerStats[name] = { 
            goals: 0, 
            assists: 0, 
            appearances: 0, 
            weightedGoals: 0, 
            weightedAssists: 0,
            team: playerTeam
          };
        }
        
        playerStats[name].goals += s.goals || 0;
        playerStats[name].assists += s.assists || 0;
        playerStats[name].appearances++;
        playerStats[name].weightedGoals += (s.goals || 0) * weightFactor;
        playerStats[name].weightedAssists += (s.assists || 0) * weightFactor;
      }
      
      // Analyse des duos au sein de chaque équipe
      for (const team of ["teamA", "teamB"]) {
        const teamScorers = scorersByTeam[team];
        
        // Analyser les duos au sein de l'équipe
        for (let i = 0; i < teamScorers.length; i++) {
          for (let j = i + 1; j < teamScorers.length; j++) {
            const player1 = teamScorers[i];
            const player2 = teamScorers[j];
            
            if (!player1?.name || !player2?.name) continue;
            
            // Créer une clé pour le duo, triée par ordre alphabétique
            const pair = [player1.name, player2.name].sort().join("|");
            
            // Compter les apparitions ensemble
            if (!duoAppearances[pair]) {
              duoAppearances[pair] = { count: 0, team, weightedCount: 0 };
            }
            duoAppearances[pair].count += 1;
            duoAppearances[pair].weightedCount += weightFactor;
            
            // Si les deux ont marqué, mesurer leur synergie
            if ((player1.goals > 0 && player2.assists > 0) || 
                (player2.goals > 0 && player1.assists > 0)) {
              
              if (!duoSynergy[pair]) {
                duoSynergy[pair] = { score: 0, team, matches: new Set() };
              }
              
              // Calculer un score de synergie basé sur les buts et passes
              const synergyScore = Math.min(
                player1.goals + player2.assists,
                player2.goals + player1.assists
              ) * weightFactor;
              
              duoSynergy[pair].score += synergyScore;
              duoSynergy[pair].matches.add(match._id.toString());
            }
          }
        }
      }
      
    } catch (matchErr) {
      console.warn(`⚠️ Erreur lors du traitement du match:`, matchErr.message);
    }
  });
  
  return {
    playerStats,
    duoAppearances,
    duoSynergy,
    scoringPatterns,
    teamAGoals,
    teamBGoals,
    matchCount: matches.length
  };
};

// 🤝 Analyse approfondie des duos
const analyzeDuos = (matches, teamAVars, teamBVars) => {
  const duoStats = {}; // Statistiques détaillées des duos
  const duoMatchups = {}; // Duos qui apparaissent spécifiquement contre certaines équipes
  const latestMatchDate = new Date(Math.max(...matches.map(m => new Date(m.date || 0).getTime())));
  
  matches.forEach(match => {
    try {
      // Calculer le poids du match (plus récent = plus important)
      const date = new Date(match.date || 0);
      const daysSince = Math.floor((latestMatchDate - date) / (1000 * 60 * 60 * 24));
      const weightFactor = Math.max(0.5, 1 - daysSince / 365) * 1.5;
      
      // Déterminer quelle équipe est quelle
      const isTeamAHome = teamAVars.includes(match.homeTeam);
      const homeTeam = isTeamAHome ? "teamA" : "teamB";
      const awayTeam = isTeamAHome ? "teamB" : "teamA";
      const opponent = isTeamAHome ? match.awayTeam : match.homeTeam;
      
      const teamAPlayers = [];
      const teamBPlayers = [];
      
      // Classer les joueurs par équipe
      const scorers = match.scorers || [];
      for (const s of scorers) {
        if (!s?.name) continue;
        
        // Déterminer l'équipe du joueur
        let playerTeam = null;
        if (s.team === "home") {
          playerTeam = homeTeam;
        } else if (s.team === "away") {
          playerTeam = awayTeam;
        } else {
          // Si pas d'info, tenter de deviner en fonction du match
          // (logique simplifiée ici, pourrait être plus sophistiquée)
          playerTeam = Math.random() < 0.5 ? "teamA" : "teamB";
        }
        
        if (playerTeam === "teamA") {
          teamAPlayers.push(s);
        } else if (playerTeam === "teamB") {
          teamBPlayers.push(s);
        }
      }
      
      // Analyser les duos pour chaque équipe
      for (const team of ["teamA", "teamB"]) {
        const players = team === "teamA" ? teamAPlayers : teamBPlayers;
        const activeScorers = players.filter(p => p.goals > 0);
        
        // Créer des duos à partir des joueurs actifs
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const player1 = players[i];
            const player2 = players[j];
            
            if (!player1?.name || !player2?.name) continue;
            
            // On ne s'intéresse qu'aux duos où au moins un a marqué
            if (player1.goals === 0 && player2.goals === 0) continue;
            
            const pairKey = [player1.name, player2.name].sort().join("|");
            
            // Initialiser les stats du duo
            if (!duoStats[pairKey]) {
              duoStats[pairKey] = {
                appearances: 0,
                goalsTogether: 0,
                assistsTogether: 0,
                combinedPoints: 0,
                weightedScore: 0,
                team,
                lastMatchDate: null,
                players: [player1.name, player2.name]
              };
            }
            
            // Mise à jour des statistiques
            const stats = duoStats[pairKey];
            stats.appearances += 1;
            stats.goalsTogether += (player1.goals || 0) + (player2.goals || 0);
            stats.assistsTogether += (player1.assists || 0) + (player2.assists || 0);
            stats.combinedPoints += 
              (player1.goals || 0) + (player1.assists || 0) + 
              (player2.goals || 0) + (player2.assists || 0);
            
            // Score pondéré (favorise les matchs récents)
            const duoImpact = 
              (player1.goals || 0) + (player1.assists || 0) * 0.8 + 
              (player2.goals || 0) + (player2.assists || 0) * 0.8;
              
            stats.weightedScore += duoImpact * weightFactor;
            
            // Tracker les duos contre des équipes spécifiques
            if (!duoMatchups[pairKey]) {
              duoMatchups[pairKey] = {};
            }
            
            if (!duoMatchups[pairKey][opponent]) {
              duoMatchups[pairKey][opponent] = {
                count: 0,
                goals: 0, 
                assists: 0,
                teamVictories: 0
              };
            }
            
            duoMatchups[pairKey][opponent].count += 1;
            duoMatchups[pairKey][opponent].goals += 
              (player1.goals || 0) + (player2.goals || 0);
            duoMatchups[pairKey][opponent].assists += 
              (player1.assists || 0) + (player2.assists || 0);
              
            // Vérifier si l'équipe a gagné ce match
            const teamWon = 
              (team === "teamA" && isTeamAHome && match.homeScore > match.awayScore) ||
              (team === "teamA" && !isTeamAHome && match.awayScore > match.homeScore) ||
              (team === "teamB" && !isTeamAHome && match.homeScore > match.awayScore) ||
              (team === "teamB" && isTeamAHome && match.awayScore > match.homeScore);
              
            if (teamWon) {
              duoMatchups[pairKey][opponent].teamVictories += 1;
            }
            
            // Mettre à jour la date du dernier match
            if (!stats.lastMatchDate || date > new Date(stats.lastMatchDate)) {
              stats.lastMatchDate = date;
            }
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ Erreur analyse duo:`, err.message);
    }
  });
  
  return { duoStats, duoMatchups };
};

// 📈 Intégrer les tendances récentes pour affiner les prédictions
const integrateRecentTrends = (stats, recentTeamAMatches, recentTeamBMatches, teamAVars, teamBVars) => {
  // Analyser les tendances récentes de chaque équipe
  const recentAStats = analyzeRecentTeamMatches(recentTeamAMatches, teamAVars, "teamA");
  const recentBStats = analyzeRecentTeamMatches(recentTeamBMatches, teamBVars, "teamB");
  
  // Intégrer les tendances récentes dans les prédictions des joueurs
  for (const [name, player] of Object.entries(stats.playerStats)) {
    // Chercher le joueur dans les tendances récentes
    const recentStats = 
      player.team === "teamA" && recentAStats.players[name] ? recentAStats.players[name] :
      player.team === "teamB" && recentBStats.players[name] ? recentBStats.players[name] :
      null;
      
    // Si le joueur a des stats récentes, les intégrer
    if (recentStats) {
      // Augmenter le poids si le joueur est en bonne forme récente
      const recentForm = (recentStats.goals + recentStats.assists * 0.5) / Math.max(1, recentStats.appearances);
      const formBonus = recentForm > 0.5 ? 1.3 : recentForm > 0.25 ? 1.1 : 1.0;
      
      player.weightedGoals *= formBonus;
      player.weightedAssists *= formBonus;
      
      // Ajouter une indication de forme récente
      player.recentForm = recentForm;
      player.formTrend = recentStats.goals > 0 ? "hot" : 
                         recentStats.assists > 0 ? "active" : "cold";
    }
  }
};

// 📊 Analyser les matchs récents d'une équipe
const analyzeRecentTeamMatches = (matches, teamVars, teamType) => {
  const players = {};
  const goalsScored = 0;
  const goalsConceded = 0;
  
  matches.forEach(match => {
    try {
      const isTeamHome = teamVars.includes(match.homeTeam);
      const teamScore = isTeamHome ? match.homeScore : match.awayScore;
      const opponentScore = isTeamHome ? match.awayScore : match.homeScore;
      
      if (teamScore !== undefined && opponentScore !== undefined) {
        goalsScored += teamScore;
        goalsConceded += opponentScore;
      }
      
      // Analyser les buteurs
      const scorers = match.scorers || [];
      for (const s of scorers) {
        if (!s?.name) continue;
        
        // Déterminer si le joueur est de cette équipe
        let isTeamPlayer = false;
        if (s.team === "home") {
          isTeamPlayer = isTeamHome;
        } else if (s.team === "away") {
          isTeamPlayer = !isTeamHome;
        } else {
          // Si pas d'info d'équipe, supposer qu'il est de l'équipe
          isTeamPlayer = true;
        }
        
        if (isTeamPlayer) {
          if (!players[s.name]) {
            players[s.name] = { goals: 0, assists: 0, appearances: 0 };
          }
          
          players[s.name].goals += s.goals || 0;
          players[s.name].assists += s.assists || 0;
          players[s.name].appearances += 1;
        }
      }
    } catch (err) {
      console.warn(`⚠️ Erreur analyse tendances récentes:`, err.message);
    }
  });
  
  return { 
    players, 
    goalsScored, 
    goalsConceded, 
    avgGoals: matches.length > 0 ? goalsScored / matches.length : 0
  };
};

// ✨ Génération des prédictions de buteurs
const generateScorerPredictions = (stats, limit) => {
  return Object.entries(stats.playerStats)
    .map(([name, s]) => ({
      name,
      score: s.weightedGoals + s.weightedAssists * 0.5,
      goals: s.goals,
      assists: s.assists,
      appearances: s.appearances,
      efficiency: s.appearances > 0 ? s.goals / s.appearances : 0,
      team: s.team,
      formTrend: s.formTrend || "neutral"
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// 🤼 Génération des prédictions de duos synergiques
const generateSynergyPredictions = (duoAnalysis) => {
  // Extraire et traiter les duos les plus prometteurs
  const synergyScores = [];
  
  // Parcourir tous les duos analysés
  for (const [key, stats] of Object.entries(duoAnalysis.duoStats)) {
    // Ignorer les duos avec peu d'apparitions
    if (stats.appearances < 2) continue;
    
    // Calculer un score composite pour la prédiction
    const baseScore = stats.weightedScore;
    
    // Bonus pour les duos qui jouent bien ensemble
    const synergyBonus = (stats.goalsTogether / stats.appearances) * 1.5;
    
    // Bonus pour les duos récents (matchs dans les 30 derniers jours)
    const recencyBonus = stats.lastMatchDate && 
                        (new Date() - new Date(stats.lastMatchDate)) < 30 * 24 * 60 * 60 * 1000 
                        ? 1.2 : 1.0;
    
    // Vérifier si ce duo a bien joué contre l'équipe adverse
    let matchupBonus = 1.0;
    const matchups = duoAnalysis.duoMatchups[key];
    if (matchups) {
      // Parcourir tous les adversaires contre lesquels ce duo a joué
      Object.entries(matchups).forEach(([opponent, matchupStats]) => {
        if (matchupStats.count > 0) {
          // Meilleur bonus contre les mêmes adversaires
          matchupBonus = Math.max(
            matchupBonus, 
            ((matchupStats.goals * 1.5 + matchupStats.assists) / matchupStats.count) * 
              (matchupStats.teamVictories > 0 ? 1.3 : 1.0)
          );
        }
      });
    }
    
    // Score final
    const finalScore = baseScore * synergyBonus * recencyBonus * matchupBonus;
    
    synergyScores.push({
      pair: stats.players,
      score: finalScore,
      appearances: stats.appearances,
      goalsTogether: stats.goalsTogether,
      matchesTogether: stats.appearances,
      team: stats.team
    });
  }
  
  // Trier et renvoyer les meilleurs duos
  return synergyScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
};

// 📊 Si aucune confrontation directe, prédire à partir des 10 derniers matchs
const predictBasedOnTeamStats = async (teamA, teamB, limit = 3) => {
  try {
    const teamAVars = Array.from(teamVariations[teamA] || [teamA]);
    const teamBVars = Array.from(teamVariations[teamB] || [teamB]);

    const getTeamMatches = async (vars) => {
      return Match.find({
        $or: [
          ...vars.map(t => ({ homeTeam: t })),
          ...vars.map(t => ({ awayTeam: t }))
        ],
        status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
      }).sort({ date: -1 }).limit(10);
    };

    const teamAMatches = await getTeamMatches(teamAVars);
    const teamBMatches = await getTeamMatches(teamBVars);

    console.log(`📊 Statistiques basées sur ${teamAMatches.length} matchs de ${teamA} et ${teamBMatches.length} matchs de ${teamB}`);

    // Analyser les matchs de chaque équipe
    const teamAStats = analyzeRecentTeamMatches(teamAMatches, teamAVars, "teamA");
    const teamBStats = analyzeRecentTeamMatches(teamBMatches, teamBVars, "teamB");
    
    // Analyser les duos de chaque équipe
    const teamADuos = analyzeDuos(teamAMatches, teamAVars, []);
    const teamBDuos = analyzeDuos(teamBMatches, teamBVars, []);
    
    // Construire une prédiction combinée
    const sortedScorers = combinePlayerPredictions(teamAStats.players, teamBStats.players, limit);
    
    // Combiner les duos des deux équipes
    const topSynergy = combineDuoPredictions(teamADuos, teamBDuos);

    const teamAAvgGoals = Math.round(teamAStats.avgGoals * 10) / 10;
    const teamBAvgGoals = Math.round(teamBStats.avgGoals * 10) / 10;

    console.log(`✅ Prédiction basée sur les stats individuelles`);
    console.log(`📈 Moyenne de buts: ${teamA}: ${teamAAvgGoals}, ${teamB}: ${teamBAvgGoals}`);
    console.log(`📈 Buteurs potentiels:`, sortedScorers.map(s => `${s.name} (${s.goals}G, ${s.assists}A)`));

    return {
      sortedScorers,
      topSynergy,
      matchCount: Math.max(teamAMatches.length, teamBMatches.length),
      teamAGoals: teamAAvgGoals,
      teamBGoals: teamBAvgGoals,
      source: "individual"
    };
  } catch (error) {
    console.error(`❌ Erreur lors de la prédiction individuelle: ${error.message}`);
    return {
      sortedScorers: [],
      topSynergy: [],
      matchCount: 0,
      teamAGoals: 0,
      teamBGoals: 0,
      source: "error"
    };
  }
};

// Combiner les prédictions de joueurs des deux équipes
const combinePlayerPredictions = (playersA, playersB, limit) => {
  const allPlayers = [];
  
  // Ajouter les joueurs de l'équipe A
  Object.entries(playersA).forEach(([name, stats]) => {
    allPlayers.push({
      name,
      score: stats.goals + stats.assists * 0.5,
      goals: stats.goals,
      assists: stats.assists,
      appearances: stats.appearances,
      efficiency: stats.appearances > 0 ? stats.goals / stats.appearances : 0,
      team: "teamA"
    });
  });
  
  // Ajouter les joueurs de l'équipe B
  Object.entries(playersB).forEach(([name, stats]) => {
    allPlayers.push({
      name,
      score: stats.goals + stats.assists * 0.5,
      goals: stats.goals,
      assists: stats.assists,
      appearances: stats.appearances,
      efficiency: stats.appearances > 0 ? stats.goals / stats.appearances : 0,
      team: "teamB"
    });
  });
  
  // Trier et limiter
  return allPlayers
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// Combiner les prédictions de duos des deux équipes
const combineDuoPredictions = (duosA, duosB) => {
  const allDuos = [];
  
  // Traiter les duos de l'équipe A
  for (const [key, stats] of Object.entries(duosA.duoStats)) {
    if (stats.appearances < 2) continue;
    
    allDuos.push({
      pair: stats.players,
      score: stats.weightedScore,
      appearances: stats.appearances,
      goalsTogether: stats.goalsTogether,
      matchesTogether: stats.appearances,
      team: "teamA"
    });
  }
  
  // Traiter les duos de l'équipe B
  for (const [key, stats] of Object.entries(duosB.duoStats)) {
    if (stats.appearances < 2) continue;
    
    allDuos.push({
      pair: stats.players,
      score: stats.weightedScore,
      appearances: stats.appearances,
      goalsTogether: stats.goalsTogether,
      matchesTogether: stats.appearances,
      team: "teamB"
    });
  }
  
  // Trier et limiter
  return allDuos
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
};

module.exports = {
  predictScorersBetweenTeams,
  predictBasedOnTeamStats,
  normalizeTeamName
};