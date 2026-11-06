const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "..", "database");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "library.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','librarian')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT,
  publisher TEXT,
  published_year INTEGER,
  total_copies INTEGER NOT NULL DEFAULT 1 CHECK(total_copies >= 0),
  available_copies INTEGER NOT NULL DEFAULT 1 CHECK(available_copies >= 0),
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(available_copies <= total_copies)
);
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  issued_by INTEGER REFERENCES users(id),
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  returned_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_loans_open ON loans(returned_at, due_date);
CREATE INDEX IF NOT EXISTS idx_loans_member ON loans(member_id);
`);

// Forward-only, idempotent schema upgrades for databases created by earlier versions.
for (const [table, column, definition] of [
  ['books', 'archived_at', 'TEXT'],
  ['members', 'archived_at', 'TEXT']
]) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(c => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
if (username && password && !db.prepare("SELECT id FROM users WHERE username = ?").get(username)) {
  const hash = bcrypt.hashSync(password, 12);
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')").run(username, hash);
  console.log(`Initial administrator '${username}' created.`);
}

module.exports = db;
