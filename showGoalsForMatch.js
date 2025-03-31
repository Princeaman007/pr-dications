const axios = require("axios");

const gameId = process.argv[2];
const filterPlayer = process.argv[3]?.toLowerCase();

if (!gameId) {
  console.log("❌ Usage : node showGoalsForMatch.js <gameId> [Nom du joueur]");
  process.exit(1);
}

const formatName = (player) => {
  if (!player) return "❓ Inconnu";
  
  // Cas 1: Nom complet disponible
  if (player.fullName) return player.fullName;
  
  // Cas 2: Prénom et nom disponibles sous forme de chaînes
  if (typeof player.firstName === 'string' && typeof player.lastName === 'string') {
    return `${player.firstName} ${player.lastName}`;
  }
  
  // Cas 3: Prénom et nom dans des objets avec propriété default
  if (player.firstName?.default && player.lastName?.default) {
    return `${player.firstName.default} ${player.lastName.default}`;
  }
  
  // Cas 4: Nom seul comme objet avec propriété default (format fréquent dans l'API)
  if (player.name?.default) {
    return player.name.default;
  }
  
  // Cas 5: Nom comme chaîne simple
  if (typeof player.name === 'string') {
    return player.name;
  }
  
  // Cas 6: Pour les assists dans certaines réponses API
  if (typeof player === 'object' && Object.keys(player).length === 1 && player.playerId) {
    return `Joueur #${player.playerId}`;
  }
  
  // Dernier recours
  return "❓ Inconnu";
};

const isGoalByPlayer = (scorer, filterName) => {
  if (!filterName) return true;
  
  let playerName = "";
  
  // Gestion spéciale pour l'objet buteur
  if (scorer) {
    playerName = formatName(scorer).toLowerCase();
    
    // Si le formatName retourne "Inconnu", essayons d'autres approches
    if (playerName === "❓ inconnu") {
      // Essayer d'accéder directement au nom si disponible
      if (scorer.name) {
        if (typeof scorer.name === 'string') {
          playerName = scorer.name.toLowerCase();
        } else if (scorer.name.default) {
          playerName = scorer.name.default.toLowerCase();
        }
      }
      
      // Dernière tentative: prénom et nom directement dans l'objet
      else if (scorer.firstName && scorer.lastName) {
        // Gérer les cas où firstName/lastName sont des objets ou des chaînes
        const firstName = typeof scorer.firstName === 'object' ? scorer.firstName.default : scorer.firstName;
        const lastName = typeof scorer.lastName === 'object' ? scorer.lastName.default : scorer.lastName;
        playerName = `${firstName} ${lastName}`.toLowerCase();
      }
    }
  }
  
  return playerName.includes(filterName);
};

const displayGoal = (goal, index) => {
  const period = goal.period || goal.periodNumber || "?";
  const time = goal.timeInPeriod || goal.time || "?";
  
  // Extraire le nom du buteur
  let scorer = "❓ Inconnu";
  if (goal.scorer) {
    scorer = formatName(goal.scorer);
  } else if (goal.firstName && goal.lastName) {
    // Gérer le cas où les noms sont directement dans l'objet but
    const firstName = typeof goal.firstName === 'object' ? goal.firstName.default : goal.firstName;
    const lastName = typeof goal.lastName === 'object' ? goal.lastName.default : goal.lastName;
    scorer = `${firstName} ${lastName}`;
  }
  
  // Formater les passes décisives
  let assists = [];
  if (goal.assists && Array.isArray(goal.assists)) {
    assists = goal.assists.map(assist => {
      // Vérifier si nous avons un objet valide
      if (assist && typeof assist === 'object') {
        return formatName(assist);
      }
      return "❓ Inconnu";
    });
  }
  
  // Afficher le but
  console.log(`🥅 But ${index + 1} → ${scorer}`);
  console.log(`   🕒 ${time}, période ${period}`);
  
  // Afficher les équipes et le score si disponibles
  if (goal.teamAbbrev) {
    console.log(`   🏒 Équipe: ${goal.teamAbbrev}`);
  }
  
  if (goal.homeScore !== undefined && goal.awayScore !== undefined) {
    console.log(`   📊 Score: ${goal.homeScore}-${goal.awayScore}`);
  }
  
  // Afficher les passes décisives
  if (assists.length) {
    console.log(`   🅰️ Passe(s): ${assists.join(', ')}`);
  } else {
    console.log(`   🅰️ Pas de passe sur ce but`);
  }
  
  console.log('---');
};

const fetchGoalsFromLanding = async (gameId) => {
  try {
    const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/landing`;
    const res = await axios.get(url);
    
    const goals = [];
    const periods = res.data?.summary?.scoring || [];
    
    // Afficher un exemple de but pour le débogage (première fois seulement)
    if (periods.length > 0 && periods[0].goals && periods[0].goals.length > 0) {
      const sampleGoal = periods[0].goals[0];
      console.log("📝 Structure d'un but (exemple):", JSON.stringify(sampleGoal, null, 2));
    }
    
    for (const period of periods) {
      if (!period.goals || !Array.isArray(period.goals)) continue;
      
      const periodNumber = period.periodDescriptor?.number || period.period || "?";
      
      for (const g of period.goals) {
        const goalData = {
          period: periodNumber,
          timeInPeriod: g.timeInPeriod || g.time,
          teamAbbrev: g.teamAbbrev,
          homeScore: g.homeScore,
          awayScore: g.awayScore
        };
        
        // Extraire le buteur selon la structure disponible
        if (g.firstName && g.lastName) {
          goalData.scorer = {
            firstName: g.firstName,
            lastName: g.lastName
          };
        } else if (g.scorer) {
          goalData.scorer = g.scorer;
        } else {
          // Chercher d'autres structures possibles
          goalData.scorer = {};
          
          if (g.scoringPlayerId) {
            goalData.scorer.playerId = g.scoringPlayerId;
          }
          
          if (g.scorerFirstName && g.scorerLastName) {
            goalData.scorer.firstName = g.scorerFirstName;
            goalData.scorer.lastName = g.scorerLastName;
          }
        }
        
        // Extraire les assistants
        if (g.assists && Array.isArray(g.assists)) {
          // Vérifier et normaliser le format des assistants
          goalData.assists = g.assists.map(assist => {
            // Certaines structures contiennent directement des objets joueur
            if (assist && typeof assist === 'object') {
              // Si l'assistant a une structure attendue, l'utiliser
              if (assist.firstName || assist.lastName || assist.playerId || assist.name) {
                return assist;
              }
              
              // Sinon, essayer de créer un objet joueur à partir des propriétés disponibles
              const assistPlayer = {};
              
              if (assist.playerId) assistPlayer.playerId = assist.playerId;
              
              if (assist.firstName) {
                assistPlayer.firstName = assist.firstName;
              }
              
              if (assist.lastName) {
                assistPlayer.lastName = assist.lastName;
              }
              
              if (assist.name) {
                assistPlayer.name = assist.name;
              }
              
              return assistPlayer;
            }
            
            // Si c'est une chaîne ou un autre type, créer un objet minimal
            return { name: String(assist) };
          });
        } else {
          goalData.assists = [];
        }
        
        goals.push(goalData);
      }
    }
    
    // Trier les buts par période puis par temps
    goals.sort((a, b) => {
      // Convertir en nombre si possible, sinon comparer comme chaînes
      const periodA = isNaN(Number(a.period)) ? a.period : Number(a.period);
      const periodB = isNaN(Number(b.period)) ? b.period : Number(b.period);
      
      if (periodA !== periodB) {
        if (typeof periodA === 'number' && typeof periodB === 'number') {
          return periodA - periodB;
        }
        return String(periodA).localeCompare(String(periodB));
      }
      
      // Comparer les temps dans la période
      return String(a.timeInPeriod).localeCompare(String(b.timeInPeriod));
    });
    
    return goals;
  } catch (err) {
    console.error(`❌ Erreur récupération depuis /landing: ${err.message}`);
    return [];
  }
};

const showGoalsForMatch = async (gameId) => {
  try {
    const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`;
    console.log(`📡 Chargement des détails du match ${gameId}...`);
    
    const response = await axios.get(url);
    const game = response.data;
    const goals = game.goals || [];
    
    const homeTeam = game.homeTeam?.abbrev || "Équipe domicile";
    const awayTeam = game.awayTeam?.abbrev || "Équipe extérieure";
    const date = game.gameDate ? new Date(game.gameDate).toLocaleDateString('fr-FR') : "???";
    const score = `${homeTeam} ${game.homeTeam?.score ?? "?"} - ${game.awayTeam?.score ?? "?"} ${awayTeam}`;
    
    console.log(`\n📅 Match ${awayTeam} @ ${homeTeam} — ${date}`);
    console.log(`📊 Score final: ${score}`);
    
    let allGoals = goals;
    
    if (!goals.length) {
      console.log(`⚠️ Aucun but dans /boxscore, fallback vers /landing...`);
      allGoals = await fetchGoalsFromLanding(gameId);
    }
    
    if (!allGoals.length) {
      console.log("❌ Aucun but trouvé.");
      return;
    }
    
    // Filtrer les buts par joueur si demandé
    const filteredGoals = allGoals.filter(goal => 
      isGoalByPlayer(goal.scorer, filterPlayer)
    );
    
    if (filterPlayer) {
      console.log(`\n🎯 ${filteredGoals.length} but(s) marqué(s) par "${filterPlayer}" dans ce match\n`);
    } else {
      console.log(`\n🎯 ${allGoals.length} buts marqués dans ce match\n`);
    }
    
    filteredGoals.forEach(displayGoal);
  } catch (err) {
    console.error(`❌ Erreur principale: ${err.message}`);
    
    // Afficher plus de détails sur l'erreur pour le débogage
    if (err.response) {
      console.error(`   Statut: ${err.response.status}`);
      console.error(`   Message: ${err.response.statusText}`);
    }
  }
};

showGoalsForMatch(gameId);