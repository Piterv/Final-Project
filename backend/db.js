

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");


const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// create the database

const dbPath = path.join(dataDir, "tasks.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {

  // Create the tasks

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT, -- unique ID, auto-incremented
      title        TEXT NOT NULL,                     -- task subject (required)
      description  TEXT NOT NULL,                     -- task body (required)
      status       TEXT NOT NULL,                     -- Pending / In Progress / Completed
      deleted      INTEGER DEFAULT 0,                 -- 0 = active, 1 = soft-deleted
      created_at   TEXT DEFAULT (datetime('now','localtime')), -- set automatically on insert
      completed_at TEXT DEFAULT NULL,                 -- set when status becomes Completed
      deleted_at   TEXT DEFAULT NULL                  -- set when task is deleted
    )
  `);

  // Safe migrations 

  ["deleted", "created_at", "completed_at", "deleted_at"].forEach(col => {
    const dflt = col === "deleted" ? "DEFAULT 0" : "DEFAULT NULL";
    db.run(`ALTER TABLE tasks ADD COLUMN ${col} TEXT ${dflt}`, () => {});
  });

  db.get("SELECT COUNT(*) AS count FROM tasks", [], (err, row) => {
    if (err || row.count !== 0) return; // skip if error or tasks already exist

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, status, deleted, created_at)
      VALUES (?, ?, ?, 0, ?)
    `);
    stmt.run("My final project", "Double check CODE validation, sanitization, and test all views.", "In Progress", now);
    stmt.run("Prepare before due date",   "Check if all is correct and no TYPOS in text",   "Pending",     now);
    stmt.finalize(); 
  });
});

// Export the db
module.exports = db;
