import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', '..', 'backend', 'data', 'overwatch.db');

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize schema if not exists
 */
function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      mode TEXT NOT NULL,
      input TEXT NOT NULL,
      region TEXT NOT NULL,
      tier TEXT NOT NULL,
      map TEXT NOT NULL DEFAULT 'all-maps',
      hash TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(mode, input, region, tier, map, DATE(timestamp))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_lookup 
    ON snapshots(mode, input, region, tier, timestamp DESC)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_hash 
    ON snapshots(hash)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS hero_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      hero TEXT NOT NULL,
      pick_rate REAL,
      win_rate REAL,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hero_stats_snapshot 
    ON hero_stats(snapshot_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hero_stats_hero 
    ON hero_stats(hero)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS scraper_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at DATETIME NOT NULL,
      completed_at DATETIME,
      status TEXT NOT NULL,
      snapshots_created INTEGER DEFAULT 0,
      errors TEXT,
      duration_ms INTEGER
    )
  `);
}

initializeSchema();

/**
 * Execute with retry logic for SQLITE_BUSY
 */
function executeWithRetry(fn, maxRetries = 5, delayMs = 1000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return fn();
    } catch (error) {
      if (error.code === 'SQLITE_BUSY' && i < maxRetries - 1) {
        lastError = error;
        const start = Date.now();
        while (Date.now() - start < delayMs) {
          // Busy wait
        }
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Check if snapshot exists for today with same hash
 */
export function checkSnapshotExists({ mode, input, region, tier, map, hash }) {
  return executeWithRetry(() => {
    const snapshot = db.prepare(`
      SELECT id FROM snapshots 
      WHERE mode = ? AND input = ? AND region = ? AND tier = ? AND map = ?
        AND DATE(timestamp) = DATE('now')
        AND hash = ?
    `).get(mode, input, region, tier, map, hash);

    return snapshot !== undefined;
  });
}

/**
 * Insert snapshot with hero stats
 */
export function insertSnapshot({ mode, input, region, tier, map, hash, heroes }) {
  return executeWithRetry(() => {
    const insertSnapshot = db.prepare(`
      INSERT INTO snapshots (mode, input, region, tier, map, hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertHeroStat = db.prepare(`
      INSERT INTO hero_stats (snapshot_id, hero, pick_rate, win_rate)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      const result = insertSnapshot.run(mode, input, region, tier, map, hash);
      const snapshotId = result.lastInsertRowid;

      for (const hero of heroes) {
        insertHeroStat.run(snapshotId, hero.hero, hero.pick_rate, hero.win_rate);
      }

      return snapshotId;
    });

    return transaction();
  });
}

/**
 * Start scraper run
 */
export function startScraperRun() {
  return executeWithRetry(() => {
    const result = db.prepare(`
      INSERT INTO scraper_runs (started_at, status)
      VALUES (datetime('now'), 'running')
    `).run();

    return result.lastInsertRowid;
  });
}

/**
 * Update scraper run
 */
export function updateScraperRun(runId, { status, snapshots_created, errors, duration_ms }) {
  return executeWithRetry(() => {
    db.prepare(`
      UPDATE scraper_runs 
      SET completed_at = datetime('now'),
          status = ?,
          snapshots_created = ?,
          errors = ?,
          duration_ms = ?
      WHERE id = ?
    `).run(status, snapshots_created, JSON.stringify(errors), duration_ms, runId);
  });
}

export { db };
