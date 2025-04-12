// models/Match.js
const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  date: String,
  homeTeam: String,
  awayTeam: String,
  homeScore: Number,
  awayScore: Number,
  status: String,
  gameId: {
    type: String,
    unique: true  // Ajout de l'index unique
  }, 
  scorers: [{
    name: String,
    goals: Number,
    assists: Number
  }]
}, {
  timestamps: true  // Optionnel: ajoute createdAt et updatedAt
});

// Index secondaire pour la recherche par équipe et date
matchSchema.index({ date: 1, homeTeam: 1, awayTeam: 1 });

module.exports = mongoose.model("Match", matchSchema);