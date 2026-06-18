const sqlite3 = require("sqlite3").verbose();

// Use Render Disk if available, otherwise local file
const dbPath = process.env.RENDER_DISK_PATH
  ? `${process.env.RENDER_DISK_PATH}/voice_profiles.db`
  : "./voice_profiles.db";

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Profiles table
  db.run(`create table if not exists voice_profiles (
    id integer primary key autoincrement,
    customer_id text not null,
    embedding text not null,
    confidence_score real,
    enrolled_at text default (datetime('now')),
    updated_at text default (datetime('now'))
  )`);

  // Logs table
  db.run(`create table if not exists verification_logs (
    id integer primary key autoincrement,
    customer_id text,
    attempted_at text default (datetime('now')),
    confidence real,
    match integer
  )`);
});

// attach path for runtime checks (e.g. health endpoints)
db.dbPath = dbPath;

module.exports = db;
