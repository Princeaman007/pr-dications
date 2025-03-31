const mongoose = require("mongoose");
require("dotenv").config();
const Match = require("./models/Match");

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const match = await Match.findOne({});
    console.log("🎯 Match trouvé :", match.homeTeam, "vs", match.awayTeam);

    const scorers = [
      { name: "Test Player", goals: 2, assists: 1 },
      { name: "Second Player", goals: 0, assists: 2 }
    ];

    await Match.updateOne({ _id: match._id }, { $set: { scorers } });

    console.log("✅ Match mis à jour avec scorers test");

    const updated = await Match.findById(match._id);
    console.log("🔁 Vérif :", updated.scorers);

    mongoose.connection.close();
  })
  .catch(console.error);
