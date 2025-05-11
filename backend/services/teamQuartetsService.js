// services/teamQuartetsService.js
const Match = require("../models/Match");

/**
 * Analyse les quatuors de joueurs qui marquent ensemble pour une équipe spécifique
 * @param {string} teamName - Nom de l'équipe à analyser
 * @param {string} season - Saison à analyser (par défaut: "20242025")
 * @param {number} minGoals - Nombre minimum de buts par joueur (par défaut: 1)
 * @returns {Object} Statistiques des quatuors de joueurs
 */
const analyzeTeamQuartets = async (teamName, season = "20242025", minGoals = 1) => {
  try {
    console.log(`📊 Analyse des quatuors pour ${teamName} (saison ${season})`);
    
    if (!teamName) {
      console.error("❌ Aucune équipe spécifiée");
      throw new Error("Nom d'équipe requis");
    }
    
    // Récupérer tous les matchs de l'équipe
    const matches = await Match.find({
      $or: [{ homeTeam: teamName }, { awayTeam: teamName }],
      status: { $in: ["FINAL", "OFFICIAL", "OFF", "7", "F"] }
    }).sort({ date: -1 });

    if (!matches.length) {
      console.warn(`⚠️ Aucun match trouvé pour ${teamName}`);
      return { 
        message: `Aucun match trouvé pour ${teamName}.`,
        quartets: [],
        matches: []
      };
    }

    console.log(`✅ ${matches.length} matchs trouvés pour ${teamName}`);

    // Statistiques des quatuors
    const quartetStats = {};
    // Matchs avec des quatuors
    const matchesWithQuartets = [];
    
    // Pour chaque match, analyser les quartets de buteurs
    for (const match of matches) {
      try {
        const isHome = match.homeTeam === teamName;
        const teamSide = isHome ? "home" : "away";
        const opponent = isHome ? match.awayTeam : match.homeTeam;
        
        // Filtrer les marqueurs de l'équipe analysée
        const teamScorers = (match.scorers || []).filter(scorer => {
          // Si l'information d'équipe est disponible, l'utiliser
          if (scorer.team) {
            return scorer.team === teamSide;
          }
          
          // Sinon, supposer que les buteurs sont de l'équipe (approximation)
          return true;
        });
        
        // Ne considérer que les joueurs qui ont marqué au moins minGoals but(s)
        const significantScorers = teamScorers.filter(s => s && s.name && s.goals >= minGoals);
        
        // Matchs avec au moins 4 buteurs différents
        if (significantScorers.length >= 4) {
          // Quatuors identifiés dans ce match
          const matchQuartets = [];
          
          // Générer toutes les combinaisons de 4 joueurs
          for (let i = 0; i < significantScorers.length; i++) {
            for (let j = i + 1; j < significantScorers.length; j++) {
              for (let k = j + 1; k < significantScorers.length; k++) {
                for (let l = k + 1; l < significantScorers.length; l++) {
                  const player1 = significantScorers[i];
                  const player2 = significantScorers[j];
                  const player3 = significantScorers[k];
                  const player4 = significantScorers[l];
                  
                  // Créer une clé unique pour ce quartet (triée alphabétiquement)
                  const players = [player1.name, player2.name, player3.name, player4.name].sort();
                  const quartetKey = players.join('|||');
                  
                  // Initialiser les stats du quartet si nécessaire
                  if (!quartetStats[quartetKey]) {
                    quartetStats[quartetKey] = {
                      players,
                      matches: 0,
                      totalGoals: 0,
                      victories: 0,
                      opponents: {},
                      matchList: []
                    };
                  }
                  
                  // Incrémenter le compteur de matchs pour ce quartet
                  quartetStats[quartetKey].matches++;
                  
                  // Ajouter les buts marqués ensemble
                  const goalsInMatch = player1.goals + player2.goals + player3.goals + player4.goals;
                  quartetStats[quartetKey].totalGoals += goalsInMatch;
                  
                  // Vérifier si ce match a été une victoire
                  const isVictory = (isHome && match.homeScore > match.awayScore) || 
                                  (!isHome && match.awayScore > match.homeScore);
                  
                  if (isVictory) {
                    quartetStats[quartetKey].victories++;
                  }
                  
                  // Enregistrer l'adversaire
                  if (!quartetStats[quartetKey].opponents[opponent]) {
                    quartetStats[quartetKey].opponents[opponent] = 0;
                  }
                  quartetStats[quartetKey].opponents[opponent]++;
                  
                  // Ajouter ce match à la liste des matchs du quartet
                  quartetStats[quartetKey].matchList.push({
                    date: match.date,
                    opponent,
                    isHome,
                    score: isHome ? `${match.homeScore}-${match.awayScore}` : `${match.awayScore}-${match.homeScore}`,
                    win: isVictory
                  });
                  
                  // Ajouter ce quartet aux quartets du match
                  matchQuartets.push({
                    players,
                    goals: goalsInMatch
                  });
                }
              }
            }
          }
          
          // Ajouter ce match à la liste des matchs avec des quartets
          if (matchQuartets.length > 0) {
            matchesWithQuartets.push({
              date: match.date,
              opponent,
              isHome,
              score: isHome ? `${match.homeScore}-${match.awayScore}` : `${match.awayScore}-${match.homeScore}`,
              scorers: teamScorers.map(s => ({
                name: s.name,
                goals: s.goals,
                assists: s.assists
              })),
              quartets: matchQuartets
            });
          }
        }
      } catch (matchErr) {
        console.warn(`⚠️ Erreur traitement match: ${matchErr.message}`);
      }
    }
    
    // Convertir les statistiques en tableau et trier par nombre de matchs
    const sortedQuartets = Object.values(quartetStats)
      .map(quartet => {
        // Convertir la map d'adversaires en tableau trié
        const sortedOpponents = Object.entries(quartet.opponents)
          .map(([opponent, count]) => ({ opponent, count }))
          .sort((a, b) => b.count - a.count);
        
        // Calculer le taux de victoire
        const winRate = quartet.matches > 0 ? (quartet.victories / quartet.matches) * 100 : 0;
        
        return {
          ...quartet,
          winRate: parseFloat(winRate.toFixed(1)),
          opponents: sortedOpponents,
          goalsPerMatch: quartet.matches > 0 ? parseFloat((quartet.totalGoals / quartet.matches).toFixed(2)) : 0
        };
      })
      .sort((a, b) => b.matches - a.matches);
    
    console.log(`✅ ${sortedQuartets.length} quatuors analysés pour ${teamName}`);
    
    return {
      team: teamName,
      season,
      matches: matches.length,
      quartets: sortedQuartets,
      matchesWithQuartets: matchesWithQuartets.sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  } catch (error) {
    console.error(`❌ Erreur analyse quatuors: ${error.message}`);
    throw error;
  }
};

module.exports = {
  analyzeTeamQuartets
};