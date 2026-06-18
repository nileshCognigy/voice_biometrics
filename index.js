const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./database");

const app = express();
app.use(bodyParser.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// Cosine similarity
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return null; // invalid input
  }
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

// Enrol endpoint
app.post("/enrol", (req, res) => {
  const { customer_id, embedding } = req.body;

  // Validation
  if (!customer_id || !Array.isArray(embedding)) {
    return res.status(400).json({ error: "customer_id and embedding array are required" });
  }

  const embeddingStr = JSON.stringify(embedding);

  db.run(
    `insert into voice_profiles (customer_id, embedding) values (?, ?)`,
    [customer_id, embeddingStr],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, customer_id, embedding });
    }
  );
});

// Verify endpoint (handles multiple profiles + audit logging)
app.post("/verify", (req, res) => {
  const { customer_id, embedding } = req.body;

  // Validation
  if (!customer_id || !Array.isArray(embedding)) {
    return res.status(400).json({ error: "customer_id and embedding array are required" });
  }

  db.all(
    `select * from voice_profiles where customer_id = ?`,
    [customer_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ match: false, message: "No profile found" });

      let bestScore = 0;
      rows.forEach(row => {
        const storedEmbedding = JSON.parse(row.embedding);
        const score = cosineSimilarity(storedEmbedding, embedding);
        if (score !== null && score > bestScore) bestScore = score;
      });

      const match = bestScore >= 0.8;

      // Update confidence_score for latest profile
      db.run(
        `update voice_profiles set confidence_score = ?, updated_at = datetime('now') where customer_id = ?`,
        [bestScore, customer_id]
      );

      // Log attempt
      db.run(
        `insert into verification_logs (customer_id, confidence, match) values (?, ?, ?)`,
        [customer_id, bestScore, match ? 1 : 0]
      );

      res.json({ match, confidence: bestScore });
    }
  );
});

// List all profiles
app.get("/profiles", (req, res) => {
  db.all(`select * from voice_profiles`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// List verification logs
app.get("/logs", (req, res) => {
  db.all(`select * from verification_logs order by attempted_at desc`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(3000, () => console.log("API running on port 3000"));
