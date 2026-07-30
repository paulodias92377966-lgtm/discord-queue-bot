import initSqlJs from 'sql.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../../database/queue.db');

let db;
let SQL;

export async function initDatabase() {
  SQL = await initSqlJs();

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      position INTEGER NOT NULL,
      status TEXT DEFAULT 'waiting',
      tier TEXT,
      region TEXT DEFAULT 'SA',
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      tested_at DATETIME,
      last_tested_at DATETIME
    )
  `);

  // Migration: add region column if missing
  try {
    db.run("ALTER TABLE queue ADD COLUMN region TEXT DEFAULT 'SA'");
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration: add last_tested_at column if missing
  try {
    db.run("ALTER TABLE queue ADD COLUMN last_tested_at DATETIME");
  } catch (e) {
    // Column already exists, ignore
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS active_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      tester_id TEXT NOT NULL,
      channel_id TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add channel_id column if missing
  try {
    db.run("ALTER TABLE active_tests ADD COLUMN channel_id TEXT");
  } catch (e) {
    // Column already exists, ignore
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS queue_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS active_testers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tester_id TEXT NOT NULL UNIQUE,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clear stale data on startup
  db.run('DELETE FROM active_tests');
  db.run('DELETE FROM queue WHERE status = ?', ['testing']);
  db.run('DELETE FROM active_testers');

  saveDatabase();
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

export function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

export function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}
