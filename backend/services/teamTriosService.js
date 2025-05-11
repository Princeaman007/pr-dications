// services/teamTriosService.js
const Match = require("../models/Match");

/**
 * Analyse les trios de joueurs qui marquent ensemble pour une équipe spécifique
 * @param {string} teamName - Nom de l'équipe à analyser
 * @param {string} season - Saison à analyser (par défaut: "20242025")
 * @param {number} minGoals - Nombre minimum de buts par joueur (par défaut: 1)
 * @returns {Object} Statistiques des trios de joueurs
 */
const analyzeTeamTrios = async (teamName, season = "20242025", minGoals = 1) => {
  try {
    console.log(`📊 Analyse des trios pour ${teamName} (saison ${season})`);
    
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
        trios: [],
        matches: []
      };
    }

    console.log(`✅ ${matches.length} matchs trouvés pour ${teamName}`);

    // Statistiques des trios
    const trioStats = {};
    // Matchs avec des trios
    const matchesWithTrios = [];
    
    // Pour chaque match, analyser les trios de buteurs
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
        
        // Matchs avec au moins 3 buteurs différents
        if (significantScorers.length >= 3) {
          // Trios identifiés dans ce match
          const matchTrios = [];
          
          // Générer toutes les combinaisons de 3 joueurs
          for (let i = 0; i < significantScorers.length; i++) {
            for (let j = i + 1; j < significantScorers.length; j++) {
              for (let k = j + 1; k < significantScorers.length; k++) {
                const player1 = significantScorers[i];
                const player2 = significantScorers[j];
                const player3 = significantScorers[k];
                
                // Créer une clé unique pour ce trio (triée alphabétiquement)
                const players = [player1.name, player2.name, player3.name].sort();
                const trioKey = players.join('|||');
                
                // Initialiser les stats du trio si nécessaire
                if (!trioStats[trioKey]) {
                  trioStats[trioKey] = {
                    players,
                    matches: 0,
                    totalGoals: 0,
                    victories: 0,
                    opponents: {},
                    matchList: []
                  };
                }
                
                // Incrémenter le compteur de matchs pour ce trio
                trioStats[trioKey].matches++;
                
                // Ajouter les buts marqués ensemble
                const goalsInMatch = player1.goals + player2.goals + player3.goals;
                trioStats[trioKey].totalGoals += goalsInMatch;
                
                // Vérifier si ce match a été une victoire
                const isVictory = (isHome && match.homeScore > match.awayScore) || 
                                (!isHome && match.awayScore > match.homeScore);
                
                if (isVictory) {
                  trioStats[trioKey].victories++;
                }
                
                // Enregistrer l'adversaire
                if (!trioStats[trioKey].opponents[opponent]) {
                  trioStats[trioKey].opponents[opponent] = 0;
                }
                trioStats[trioKey].opponents[opponent]++;
                
                // Ajouter ce match à la liste des matchs du trio
                trioStats[trioKey].matchList.push({
                  date: match.date,
                  opponent,
                  isHome,
                  score: isHome ? `${match.homeScore}-${match.awayScore}` : `${match.awayScore}-${match.homeScore}`,
                  win: isVictory
                });
                
                // Ajouter ce trio aux trios du match
                matchTrios.push({
                  players,
                  goals: goalsInMatch
                });
              }
            }
          }
          
          // Ajouter ce match à la liste des matchs avec des trios
          if (matchTrios.length > 0) {
            matchesWithTrios.push({
              date: match.date,
              opponent,
              isHome,
              score: isHome ? `${match.homeScore}-${match.awayScore}` : `${match.awayScore}-${match.homeScore}`,
              scorers: teamScorers.map(s => ({
                name: s.name,
                goals: s.goals,
                assists: s.assists
              })),
              trios: matchTrios
            });
          }
        }
      } catch (matchErr) {
        console.warn(`⚠️ Erreur traitement match: ${matchErr.message}`);
      }
    }
    
    // Convertir les statistiques en tableau et trier par nombre de matchs
    const sortedTrios = Object.values(trioStats)
      .map(trio => {
        // Convertir la map d'adversaires en tableau trié
        const sortedOpponents = Object.entries(trio.opponents)
          .map(([opponent, count]) => ({ opponent, count }))
          .sort((a, b) => b.count - a.count);
        
        // Calculer le taux de victoire
        const winRate = trio.matches > 0 ? (trio.victories / trio.matches) * 100 : 0;
        
        return {
          ...trio,
          winRate: parseFloat(winRate.toFixed(1)),
          opponents: sortedOpponents,
          goalsPerMatch: trio.matches > 0 ? parseFloat((trio.totalGoals / trio.matches).toFixed(2)) : 0
        };
      })
      .sort((a, b) => b.matches - a.matches);
    
    console.log(`✅ ${sortedTrios.length} trios analysés pour ${teamName}`);
    
    return {
      team: teamName,
      season,
      matches: matches.length,
      trios: sortedTrios,
      matchesWithTrios: matchesWithTrios.sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  } catch (error) {
    console.error(`❌ Erreur analyse trios: ${error.message}`);
    throw error;
  }
};

module.exports = {
  analyzeTeamTrios
};