// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const statusRoutes = require("./routes/statusRoutes");
const headToHeadRoutes = require("./routes/headToHeadRoutes"); // ✅ Nouvelle route
const confrontationsRoutes = require("./routes/confrontationsRoutes");
const scorersRoutes = require("./routes/scorersRoutes");
const upcomingPredictionsRoutes = require("./routes/upcomingPredictionsRoutes");




const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logs en développement
if (process.env.NODE_ENV === "development") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
}

// Connexion MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connecté à MongoDB");
  } catch (err) {
    console.error("❌ Erreur MongoDB :", err.message);
    setTimeout(connectDB, 5000);
  }
};
connectDB();

// Routes API
app.use("/api/status", statusRoutes);
app.use("/api/head-to-head", headToHeadRoutes); // ✅ Route analyse confrontation
const predictRoutes = require("./routes/predictRoutes");
app.use("/api/predict", predictRoutes);
app.use("/api/advanced-stats", require("./routes/advancedStatsRoutes"));
app.use("/api/confrontations", confrontationsRoutes);
app.use("/api/scorers", scorersRoutes);
app.use("/api/upcoming-predictions", require("./routes/upcomingPredictionsRoutes"));
app.use("/api/teams", require("./routes/teamRoutes"));






// Route racine
app.get("/api", (req, res) => {
  res.json({ message: "🏒 API NHL - en ligne" });
});

// Production : servir le frontend (si buildé)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client", "dist")));
  app.get("*", (req, res) =>
    res.sendFile(path.join(__dirname, "client", "dist", "index.html"))
  );
}

// 404 & erreurs
app.use((req, res, next) => {
  res.status(404).json({ message: "Route introuvable" });
});
app.use((err, req, res, next) => {
  console.error("💥 Erreur serveur :", err.stack);
  res.status(500).json({ message: "Erreur interne du serveur" });
});

// Lancer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
