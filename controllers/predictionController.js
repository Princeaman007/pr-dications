// controllers/predictionController.js
const fetchUpcomingGames = require("../services/predictService"); // tu peux adapter le nom

const getUpcomingPredictions = async (req, res) => {
  try {
    const data = await fetchUpcomingGames(); // ← cette fonction retourne gamesByDate (comme ton front attend)
    res.json(data);
  } catch (err) {
    console.error("Erreur lors de la récupération des prédictions :", err.message);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { getUpcomingPredictions };
