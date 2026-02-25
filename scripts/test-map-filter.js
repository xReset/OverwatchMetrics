import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Map Filter Data Flow\n');

// Load frontend data
const frontendPath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'overwatch-stats.json');
const data = JSON.parse(fs.readFileSync(frontendPath, 'utf-8'));

console.log(`📁 Loaded ${data.length} snapshots from frontend data file\n`);

// Group by map
const mapGroups = {};
data.forEach(snapshot => {
  if (!mapGroups[snapshot.map]) {
    mapGroups[snapshot.map] = [];
  }
  mapGroups[snapshot.map].push(snapshot);
});

console.log('📊 Snapshots per map:');
Object.keys(mapGroups).sort().forEach(map => {
  console.log(`   ${map}: ${mapGroups[map].length} snapshot(s)`);
});

// Test filtering logic
console.log('\n🔍 Testing filter matching logic:\n');

function findMatchingSnapshot(snapshots, params) {
  return snapshots.find(s => 
    s.mode === params.mode &&
    s.input === params.input &&
    s.region === params.region &&
    s.tier === params.tier &&
    (!params.map || s.map === params.map)
  ) || snapshots[0];
}

const testCases = [
  { map: 'all-maps', label: 'All Maps' },
  { map: 'busan', label: 'Busan' },
  { map: 'kings-row', label: "King's Row" },
  { map: 'dorado', label: 'Dorado' }
];

testCases.forEach(test => {
  const params = {
    mode: 'competitive',
    input: 'PC',
    region: 'Americas',
    tier: 'All',
    map: test.map
  };
  
  const snapshot = findMatchingSnapshot(data, params);
  
  if (snapshot) {
    const mizuki = snapshot.heroes.find(h => h.hero === 'mizuki');
    console.log(`${test.label} (${test.map}):`);
    console.log(`   Found snapshot: ${snapshot.id}`);
    console.log(`   Map field: ${snapshot.map}`);
    console.log(`   Mizuki pick rate: ${mizuki?.pick_rate}%`);
    console.log('');
  } else {
    console.log(`❌ ${test.label}: No snapshot found!`);
  }
});

// Verify data is different
console.log('✅ Verification:');
const allMaps = findMatchingSnapshot(data, { mode: 'competitive', input: 'PC', region: 'Americas', tier: 'All', map: 'all-maps' });
const busan = findMatchingSnapshot(data, { mode: 'competitive', input: 'PC', region: 'Americas', tier: 'All', map: 'busan' });

const mizukiAllMaps = allMaps?.heroes.find(h => h.hero === 'mizuki');
const mizukiBusan = busan?.heroes.find(h => h.hero === 'mizuki');

if (mizukiAllMaps && mizukiBusan) {
  console.log(`   Mizuki All Maps: ${mizukiAllMaps.pick_rate}%`);
  console.log(`   Mizuki Busan: ${mizukiBusan.pick_rate}%`);
  
  if (mizukiAllMaps.pick_rate !== mizukiBusan.pick_rate) {
    console.log(`   ✅ Data is DIFFERENT - map filter should work!`);
  } else {
    console.log(`   ❌ Data is IDENTICAL - map filter will NOT work!`);
  }
}
