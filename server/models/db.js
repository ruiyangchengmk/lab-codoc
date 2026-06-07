const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/codoc.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const db = getDb();

  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled',
      type TEXT NOT NULL CHECK(type IN ('markdown', 'excel', 'ppt')),
      content TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'anonymous',
      owner_id TEXT,
      is_deleted INTEGER DEFAULT 0
    )
  `);

  // Document versions for history
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'anonymous',
      FOREIGN KEY (document_id) REFERENCES documents(id)
    )
  `);

  // Users (auth)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      color TEXT DEFAULT '#3b82f6',
      is_admin INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Pending registrations awaiting admin approval
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_plain TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT
    )
  `);

  // Seed default admin if no admin exists
  if (db.prepare('SELECT COUNT(*) AS n FROM users WHERE is_admin = 1').get().n === 0) {
    const { User } = require('./user');
    const { v4: uuidv4 } = require('uuid');
    let name = 'admin';
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(name)) {
      name = 'admin_' + uuidv4().slice(0, 6);
    }
    User.create({ username: name, password: 'h618h618', email: '[email protected]', displayName: 'Admin', isAdmin: 1 });
    console.log(`Seeded default admin: ${name} / h618h618`);
  }

  console.log('Database initialized');
}

module.exports = { getDb, initDatabase };

