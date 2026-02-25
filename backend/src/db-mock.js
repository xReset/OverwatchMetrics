// Real Overwatch 2 statistics data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load real data from JSON file
const dataPath = path.join(__dirname, '..', 'data', 'real-overwatch-data.json');
const realData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Convert to snapshot format
const mockSnapshots = realData.map((snapshot, index) => ({
  id: index + 1,
  timestamp: snapshot.timestamp,
  mode: snapshot.mode,
  input: snapshot.input,
  region: snapshot.region,
  tier: snapshot.tier,
  map: 'all-maps',
  hash: `hash-${index + 1}`,
  created_at: snapshot.timestamp
}));

// Convert real data to hero stats format
const mockHeroStats = {};
realData.forEach((snapshot, index) => {
  mockHeroStats[index + 1] = snapshot.heroes;
});

export function initializeSchema() {
  console.log('Using real Overwatch 2 statistics data');
  console.log(`Loaded ${mockSnapshots.length} snapshots with ${realData[0]?.heroes?.length || 0} heroes each`);
}

export function getSnapshots({ mode, input, region, tier, limit = 30 } = {}) {
  return mockSnapshots.filter(s => {
    if (mode && s.mode !== mode) return false;
    if (input && s.input !== input) return false;
    if (region && s.region !== region) return false;
    if (tier && s.tier !== tier) return false;
    return true;
  }).slice(0, limit);
}

export function getSnapshotWithStats(snapshotId) {
  const snapshot = mockSnapshots.find(s => s.id === snapshotId);
  if (!snapshot) return null;
  
  return {
    snapshot,
    heroes: mockHeroStats[snapshotId] || []
  };
}

export function getComparisonData({ mode, input, region, tier }) {
  const oldTimestamp = mockSnapshots[0].timestamp;
  const newTimestamp = mockSnapshots[1].timestamp;
  
  // Return all heroes from the old snapshot
  const allHeroes = mockHeroStats[1].map(oldStats => {
    const newStats = mockHeroStats[2].find(h => h.hero === oldStats.hero);
    
    return {
      hero: oldStats.hero,
      start: {
        pick_rate: oldStats.pick_rate,
        win_rate: oldStats.win_rate,
        timestamp: oldTimestamp
      },
      end: newStats ? {
        pick_rate: newStats.pick_rate,
        win_rate: newStats.win_rate,
        timestamp: newTimestamp
      } : null
    };
  });
  
  return allHeroes;
}

export function getTopHeroes({ mode, input, region, tier, metric, limit = 10 }) {
  const heroes = mockHeroStats[2] || [];
  const sorted = [...heroes].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  
  return {
    top: sorted.slice(0, limit),
    timestamp: mockSnapshots[1].timestamp
  };
}

export function getHealthCheck() {
  return {
    lastRun: {
      id: 1,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'success',
      snapshots_created: 2,
      errors: null,
      duration_ms: 5000
    },
    total_snapshots: 2,
    oldest_snapshot: mockSnapshots[0].timestamp,
    newest_snapshot: mockSnapshots[1].timestamp,
    dbSize: 1024
  };
}

export default { initializeSchema };
