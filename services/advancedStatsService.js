// services/advancedStatsService.js
const Match = require("../models/Match");

// convertit mm:ss → secondes
const normalizeTime = (timeStr) => {
  if (!timeStr) return 9999;
  const [min, sec] = timeStr.split(":").map(Number);
  return min * 60 + sec;
};

const generateAdvancedStats = async (TEAM) => {
  const matches = await Match.find({
    $or: [{ homeTeam: TEAM }, { awayTeam: TEAM }],
    status: "FINAL"
  });

  if (!matches.length) return { message: "Aucun match trouvé." };

  const playerStats = {}, teamMatchups = {}, playerStreaks = {}, firstGoalStats = {};
  const efficiencyList = [];

  for (const match of matches) {
    const opponent = match.homeTeam === TEAM ? match.awayTeam : match.homeTeam;
    teamMatchups[opponent] = (teamMatchups[opponent] || 0) + 1;

    for (const s of match.scorers || []) {
      const name = s.name;

      if (!playerStats[name]) playerStats[name] = { goals: 0, assists: 0, matches: 0 };
      playerStats[name].goals += s.goals || 0;
      playerStats[name].assists += s.assists || 0;
      playerStats[name].matches++;

      if (!playerStreaks[name]) playerStreaks[name] = { current: 0, max: 0 };

      if (s.goals > 0) {
        playerStreaks[name].current++;
        playerStreaks[name].max = Math.max(playerStreaks[name].max, playerStreaks[name].current);
      } else {
        playerStreaks[name].current = 0;
      }
    }

    for (const goal of match.goals || []) {
      const name =
        goal?.scorer?.fullName || goal?.scorer?.name ||
        (goal?.scorerFirstName && goal?.scorerLastName
          ? `${goal.scorerFirstName} ${goal.scorerLastName}`
          : null);

      if (name) {
        const time = normalizeTime(goal.timeInPeriod || goal.time);
        if (!firstGoalStats[name] || time < firstGoalStats[name]) {
          firstGoalStats[name] = time;
        }
      }
    }
  }

  const bestScorers = Object.entries(playerStats)
    .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists);
  const bestScorer = bestScorers[0];

  const bestAssists = Object.entries(playerStats)
    .sort((a, b) => b[1].assists - a[1].assists)[0];

  const earliestScorers = Object.entries(firstGoalStats).sort((a, b) => a[1] - b[1]);
  const earliestScorer = earliestScorers.length > 0 ? earliestScorers[0] : null;

  const topOpponents = Object.entries(teamMatchups).sort((a, b) => b[1] - a[1]);

  const efficiency = Object.entries(playerStats)
    .filter(([_, s]) => s.matches >= 3 && s.goals > 0)
    .map(([name, s]) => ({
      name,
      goals: s.goals,
      matches: s.matches,
      efficiency: +(s.goals / s.matches).toFixed(2)
    }))
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 5);

  return {
    bestScorer,
    bestAssists,
    earliestScorer,
    topOpponents,
    playerStreaks,
    efficiency
  };
};

module.exports = generateAdvancedStats;
