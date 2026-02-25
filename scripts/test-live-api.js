import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 DEBUGGING MAP FILTER ISSUE\n');

// Load the data file
const dataPath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'overwatch-stats.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('📊 Data File Analysis:');
console.log(`Total snapshots: ${data.length}`);
console.log('');

// Group by map
const byMap = {};
data.forEach(s => {
  if (!byMap[s.map]) byMap[s.map] = [];
  byMap[s.map].push(s);
});

console.log('Maps in data:');
Object.keys(byMap).sort().forEach(map => {
  const snapshot = byMap[map][0];
  const mizuki = snapshot.heroes.find(h => h.hero === 'mizuki');
  console.log(`  ${map}: ${mizuki?.pick_rate}% Mizuki pick rate`);
});

console.log('\n🔍 Testing Filter Logic:\n');

// Simulate the findMatchingSnapshot function
function findMatchingSnapshot(snapshots, params) {
  console.log('Looking for:', params);
  
  const matched = snapshots.find(s => {
    const modeMatch = s.mode === params.mode;
    const inputMatch = s.input === params.input;
    const regionMatch = s.region === params.region;
    const tierMatch = s.tier === params.tier;
    const mapMatch = !params.map || s.map === params.map;
    
    if (params.map === 'busan') {
      console.log(`  Checking snapshot ${s.map}:`, {
        mode: modeMatch,
        input: inputMatch,
        region: regionMatch,
        tier: tierMatch,
        map: mapMatch,
        allMatch: modeMatch && inputMatch && regionMatch && tierMatch && mapMatch
      });
    }
    
    return modeMatch && inputMatch && regionMatch && tierMatch && mapMatch;
  });
  
  return matched || snapshots[0];
}

// Test with different maps
const testCases = [
  { mode: 'competitive', input: 'PC', region: 'Americas', tier: 'All', map: 'all-maps' },
  { mode: 'competitive', input: 'PC', region: 'Americas', tier: 'All', map: 'busan' },
  { mode: 'competitive', input: 'PC', region: 'Americas', tier: 'All', map: 'kings-row' }
];

testCases.forEach(params => {
  const result = findMatchingSnapshot(data, params);
  const mizuki = result.heroes.find(h => h.hero === 'mizuki');
  console.log(`\n✅ ${params.map}: Mizuki ${mizuki?.pick_rate}% (snapshot map: ${result.map})`);
});

console.log('\n🔍 Checking for data issues:\n');

// Check if all snapshots have the required fields
let issueCount = 0;
data.forEach((s, i) => {
  if (!s.mode) {
    console.log(`❌ Snapshot ${i}: Missing mode`);
    issueCount++;
  }
  if (!s.input) {
    console.log(`❌ Snapshot ${i}: Missing input`);
    issueCount++;
  }
  if (!s.region) {
    console.log(`❌ Snapshot ${i}: Missing region`);
    issueCount++;
  }
  if (!s.tier) {
    console.log(`❌ Snapshot ${i}: Missing tier`);
    issueCount++;
  }
  if (!s.map) {
    console.log(`❌ Snapshot ${i}: Missing map`);
    issueCount++;
  }
});

if (issueCount === 0) {
  console.log('✅ All snapshots have required fields');
} else {
  console.log(`❌ Found ${issueCount} issues`);
}

console.log('\n📋 Sample snapshot structure:');
console.log(JSON.stringify(data[0], null, 2).substring(0, 500) + '...');
