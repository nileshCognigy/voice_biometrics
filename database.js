const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Always use local file on free tier
const dbDir = ".";
const dbPath = path.join(dbDir, "voice_profiles.db");

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open database
const db = new Database(dbPath);

// Create tables
db.prepare(`create table if not exists voice_profiles (
  id integer primary key autoincrement,
  customer_id text not null,
  embedding text not null,
  confidence_score real,
  enrolled_at text default (datetime('now')),
  updated_at text default (datetime('now'))
)`).run();

db.prepare(`create table if not exists verification_logs (
  id integer primary key autoincrement,
  customer_id text,
  attempted_at text default (datetime('now')),
  confidence real,
  match integer
)`).run();

// Export both db and path
module.exports = { db, dbPath };
