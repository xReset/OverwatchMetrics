import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'overwatch.db');

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
 * Initialize database schema
 */
export function initializeSchema() {
  // Create snapshots table
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

  // Create indexes for snapshots
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_lookup 
    ON snapshots(mode, input, region, tier, timestamp DESC)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_hash 
    ON snapshots(hash)
  `);

  // Create hero_stats table
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

  // Create indexes for hero_stats
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hero_stats_snapshot 
    ON hero_stats(snapshot_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hero_stats_hero 
    ON hero_stats(hero)
  `);

  // Create scraper_runs table
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

  console.log('Database schema initialized successfully');
}

/**
 * Execute query with retry logic for SQLITE_BUSY errors
 */
function executeWithRetry(fn, maxRetries = 5, delayMs = 1000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return fn();
    } catch (error) {
      if (error.code === 'SQLITE_BUSY' && i < maxRetries - 1) {
        lastError = error;
        // Wait before retrying
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
 * Get snapshots with optional filters
 */
export function getSnapshots({ mode, input, region, tier, limit = 30 } = {}) {
  return executeWithRetry(() => {
    let query = 'SELECT * FROM snapshots WHERE 1=1';
    const params = [];

    if (mode) {
      query += ' AND mode = ?';
      params.push(mode);
    }
    if (input) {
      query += ' AND input = ?';
      params.push(input);
    }
    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }
    if (tier) {
      query += ' AND tier = ?';
      params.push(tier);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  });
}

/**
 * Get snapshot by ID with hero stats
 */
export function getSnapshotWithStats(snapshotId) {
  return executeWithRetry(() => {
    const snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(snapshotId);
    
    if (!snapshot) {
      return null;
    }

    const heroes = db.prepare('SELECT hero, pick_rate, win_rate FROM hero_stats WHERE snapshot_id = ?').all(snapshotId);

    return { snapshot, heroes };
  });
}

/**
 * Get comparison data for dumbbell chart
 */
export function getComparisonData({ mode, input, region, tier, startDate, endDate }) {
  return executeWithRetry(() => {
    const params = [mode, input, region, tier];
    let dateFilter = '';

    if (startDate && endDate) {
      dateFilter = ' AND timestamp BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      // Default to last 7 days
      dateFilter = ' AND timestamp >= datetime("now", "-7 days")';
    }

    // Get oldest and newest snapshots in range
    const oldestSnapshot = db.prepare(`
      SELECT id FROM snapshots 
      WHERE mode = ? AND input = ? AND region = ? AND tier = ?${dateFilter}
      ORDER BY timestamp ASC LIMIT 1
    `).get(...params);

    const newestSnapshot = db.prepare(`
      SELECT id FROM snapshots 
      WHERE mode = ? AND input = ? AND region = ? AND tier = ?${dateFilter}
      ORDER BY timestamp DESC LIMIT 1
    `).get(...params);

    if (!oldestSnapshot || !newestSnapshot) {
      return [];
    }

    // Get hero stats for both snapshots
    const startStats = db.prepare('SELECT hero, pick_rate, win_rate FROM hero_stats WHERE snapshot_id = ?').all(oldestSnapshot.id);
    const endStats = db.prepare('SELECT hero, pick_rate, win_rate FROM hero_stats WHERE snapshot_id = ?').all(newestSnapshot.id);

    // Get timestamps
    const startSnapshot = db.prepare('SELECT timestamp FROM snapshots WHERE id = ?').get(oldestSnapshot.id);
    const endSnapshot = db.prepare('SELECT timestamp FROM snapshots WHERE id = ?').get(newestSnapshot.id);

    // Combine data
    const startMap = new Map(startStats.map(s => [s.hero, s]));
    const endMap = new Map(endStats.map(s => [s.hero, s]));

    const comparison = [];
    const allHeroes = new Set([...startMap.keys(), ...endMap.keys()]);

    for (const hero of allHeroes) {
      const start = startMap.get(hero);
      const end = endMap.get(hero);

      comparison.push({
        hero,
        start: start ? {
          pick_rate: start.pick_rate,
          win_rate: start.win_rate,
          timestamp: startSnapshot.timestamp
        } : null,
        end: end ? {
          pick_rate: end.pick_rate,
          win_rate: end.win_rate,
          timestamp: endSnapshot.timestamp
        } : null
      });
    }

    return comparison;
  });
}

/**
 * Get top heroes by metric
 */
export function getTopHeroes({ mode, input, region, tier, metric, limit = 10, date }) {
  return executeWithRetry(() => {
    const params = [mode, input, region, tier];
    let dateFilter = '';

    if (date) {
      dateFilter = ' AND DATE(timestamp) = DATE(?)';
      params.push(date);
    }

    // Get latest snapshot matching filters
    const snapshot = db.prepare(`
      SELECT id, timestamp FROM snapshots 
      WHERE mode = ? AND input = ? AND region = ? AND tier = ?${dateFilter}
      ORDER BY timestamp DESC LIMIT 1
    `).get(...params);

    if (!snapshot) {
      return { top: [], timestamp: null };
    }

    // Get hero stats ordered by metric
    const orderBy = metric === 'pick_rate' ? 'pick_rate' : 'win_rate';
    const heroes = db.prepare(`
      SELECT hero, pick_rate, win_rate 
      FROM hero_stats 
      WHERE snapshot_id = ? AND ${orderBy} IS NOT NULL
      ORDER BY ${orderBy} DESC 
      LIMIT ?
    `).all(snapshot.id, limit);

    return {
      top: heroes,
      timestamp: snapshot.timestamp
    };
  });
}

/**
 * Get health check data
 */
export function getHealthCheck() {
  return executeWithRetry(() => {
    const lastRun = db.prepare('SELECT * FROM scraper_runs ORDER BY started_at DESC LIMIT 1').get();
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_snapshots,
        MIN(timestamp) as oldest_snapshot,
        MAX(timestamp) as newest_snapshot
      FROM snapshots
    `).get();

    // Get database file size
    const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();

    return {
      lastRun,
      ...stats,
      dbSize: dbSize.size
    };
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
    `).run(status, snapshots_created, errors, duration_ms, runId);
  });
}

// Initialize schema on module load
initializeSchema();

export default db;
