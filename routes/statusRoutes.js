// routes/statusRoutes.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ status: "🟢 OK", time: new Date().toISOString() });
});

module.exports = router;
