const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Use /data if env var is set, otherwise local folder
const dbDir = process.env.RENDER_DISK_PATH || ".";
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "voice_profiles.db");
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

module.exports = db;
