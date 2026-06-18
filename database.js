const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./voice_profiles.db");

db.serialize(() => {
  db.run(`create table if not exists voice_profiles (
    id integer primary key autoincrement,
    customer_id text not null,
    embedding text not null,
    confidence_score real,
    enrolled_at text default (datetime('now')),
    updated_at text default (datetime('now'))
  )`);

  db.run(`create table if not exists verification_logs (
    id integer primary key autoincrement,
    customer_id text,
    attempted_at text default (datetime('now')),
    confidence real,
    match integer
  )`);
});

module.exports = db;
