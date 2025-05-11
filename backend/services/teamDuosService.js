// services/teamDuosService.js
const Match = require("../models/Match");

/**
 * Analyse les duos de joueurs qui marquent ensemble pour une équipe spécifique
 * @param {string} teamName - Nom de l'équipe à analyser
 * @param {string} season - Saison à analyser (par défaut: "20242025")
 * @returns {Object} Statistiques des duos de joueurs
 */
const analyzeTeamDuos = async (teamName, season = "20242025") => {
  try {
    console.log(`📊 Analyse des duos pour ${teamName} (saison ${season})`);
    
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
        duos: [],
        matches: []
      };
    }

    console.log(`✅ ${matches.length} matchs trouvés pour ${teamName}`);

    // Statistiques des duos
    const duoStats = {};
    // Matchs avec des duos
    const matchesWithDuos = [];
    
    // Pour chaque match, analyser les duos de buteurs
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
        
        // Ne considérer que les joueurs qui ont marqué au moins un but
        const goalScorers = teamScorers.filter(s => s && s.name && s.goals > 0);
        
        // Matchs avec au moins 2 buteurs différents (pour former un duo)
        if (goalScorers.length >= 2) {
          // Duos identifiés dans ce match
          const matchDuos = [];
          
          // Analyser toutes les combinaisons de 2 joueurs
          for (let i = 0; i < goalScorers.length; i++) {
            for (let j = i + 1; j < goalScorers.length; j++) {
              const player1 = goalScorers[i];
              const player2 = goalScorers[j];
              
              // Créer une clé unique pour ce duo (triée alphabétiquement)
              const duoKey = [player1.name, player2.name].sort().join('|||');
              
              // Initialiser les stats du duo si nécessaire
              if (!duoStats[duoKey]) {
                duoStats[duoKey] = {
                  players: [player1.name, player2.name],
                  matches: 0,
                  totalGoals: 0,
                  victories: 0,
                  opponents: {},
                  matchList: []
                };
              }
              
              // Incrémenter le compteur de matchs pour ce duo
              duoStats[duoKey].matches++;
              
              // Ajouter les buts marqués ensemble
              const goalsInMatch = player1.goals + player2.goals;
              duoStats[duoKey].totalGoals += goalsInMatch;
              
              // Vérifier si ce match a été une victoire
              const isVictory = (isHome && match.homeScore > match.awayScore) || 
                              (!isHome && match.awayScore > match.homeScore);
              
              if (isVictory) {
                duoStats[duoKey].victories++;
              }
              
              // Enregistrer l'adversaire
              if (!duoStats[duoKey].opponents[opponent]) {
                duoStats[duoKey].opponents[opponent] = 0;
              }
              duoStats[duoKey].opponents[opponent]++;
              
              // Ajouter ce match à la liste des matchs du duo
              duoStats[duoKey].matchList.push({
                date: match.date,
                opponent,
                isHome,
                score: isHome ? `${match.homeScore}-${match.awayScore}` : `${match.awayScore}-${match.homeScore}`,
                win: isVictory
              });
              
              // Ajouter ce duo aux duos du match
              matchDuos.push({
                players: [player1.name, player2.name],
                goals: goalsInMatch
              });
            }
          }
          
          // Ajouter ce match à la liste des matchs avec des duos
          if (matchDuos.length > 0) {
            matchesWithDuos.push({
              date: match.date,
              opponent,
              isHome,
              score: isHome ? `${match.homeScore}-${match.awayScore}` : `${match.awayScore}-${match.homeScore}`,
              scorers: teamScorers.map(s => ({
                name: s.name,
                goals: s.goals,
                assists: s.assists
              })),
              duos: matchDuos
            });
          }
        }
      } catch (matchErr) {
        console.warn(`⚠️ Erreur traitement match: ${matchErr.message}`);
      }
    }
    
    // Convertir les statistiques en tableau et trier par nombre de matchs
    const sortedDuos = Object.values(duoStats)
      .map(duo => {
        // Convertir la map d'adversaires en tableau trié
        const sortedOpponents = Object.entries(duo.opponents)
          .map(([opponent, count]) => ({ opponent, count }))
          .sort((a, b) => b.count - a.count);
        
        // Calculer le taux de victoire
        const winRate = duo.matches > 0 ? (duo.victories / duo.matches) * 100 : 0;
        
        return {
          ...duo,
          winRate: parseFloat(winRate.toFixed(1)),
          opponents: sortedOpponents
        };
      })
      .sort((a, b) => b.matches - a.matches);
    
    console.log(`✅ ${sortedDuos.length} duos analysés pour ${teamName}`);
    
    return {
      team: teamName,
      season,
      matches: matches.length,
      duos: sortedDuos,
      matchesWithDuos: matchesWithDuos.sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  } catch (error) {
    console.error(`❌ Erreur analyse duos: ${error.message}`);
    throw error;
  }
};

module.exports = {
  analyzeTeamDuos
};