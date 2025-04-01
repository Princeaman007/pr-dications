// models/Match.js
const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  date: String,
  homeTeam: String,
  awayTeam: String,
  homeScore: Number,
  awayScore: Number,
  status: String,
  gameId: String, 
  scorers: [{
    name: String,
    goals: Number,
    assists: Number
  }]
});

module.exports = mongoose.model("Match", matchSchema);
