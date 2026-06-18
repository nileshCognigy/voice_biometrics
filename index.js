const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { db, dbPath } = require("./database");

const app = express();
app.use(bodyParser.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// Cosine similarity
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return null;
  }
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

// Enrol endpoint
app.post("/enrol", (req, res) => {
  const { customer_id, embedding } = req.body;
  if (!customer_id || !Array.isArray(embedding)) {
    return res.status(400).json({ error: "customer_id and embedding array are required" });
  }
  const embeddingStr = JSON.stringify(embedding);
  try {
    const stmt = db.prepare(`insert into voice_profiles (customer_id, embedding) values (?, ?)`);
    const info = stmt.run(customer_id, embeddingStr);
    res.json({ id: info.lastInsertRowid, customer_id, embedding });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify endpoint
app.post("/verify", (req, res) => {
  const { customer_id, embedding } = req.body;
  if (!customer_id || !Array.isArray(embedding)) {
    return res.status(400).json({ error: "customer_id and embedding array are required" });
  }
  try {
    const rows = db.prepare(`select * from voice_profiles where customer_id = ?`).all(customer_id);
    if (rows.length === 0) return res.status(404).json({ match: false, message: "No profile found" });

    let bestScore = 0;
    rows.forEach(row => {
      const storedEmbedding = JSON.parse(row.embedding);
      const score = cosineSimilarity(storedEmbedding, embedding);
      if (score !== null && score > bestScore) bestScore = score;
    });

    const match = bestScore >= 0.8;
    db.prepare(`update voice_profiles set confidence_score = ?, updated_at = datetime('now') where customer_id = ?`)
      .run(bestScore, customer_id);
    db.prepare(`insert into verification_logs (customer_id, confidence, match) values (?, ?, ?)`)
      .run(customer_id, bestScore, match ? 1 : 0);

    res.json({ match, confidence: bestScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profiles
app.get("/profiles", (req, res) => {
  try {
    const rows = db.prepare(`select * from voice_profiles`).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logs
app.get("/logs", (req, res) => {
  try {
    const rows = db.prepare(`select * from verification_logs order by attempted_at desc`).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health
app.get("/health", (req, res) => {
  const exists = fs.existsSync(dbPath);
  res.json({ dbPath, exists });
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
