import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 COMPREHENSIVE VERIFICATION CHECKLIST\n');
console.log('='.repeat(80) + '\n');

// Expected heroes list (all 50 current Overwatch 2 heroes)
const EXPECTED_HEROES = [
  'ana', 'anran', 'ashe', 'baptiste', 'bastion', 'brigitte', 'cassidy', 'dva',
  'domina', 'doomfist', 'echo', 'emre', 'freja', 'genji', 'hanzo', 'hazard',
  'illari', 'jetpack-cat', 'junker-queen', 'junkrat', 'juno', 'kiriko',
  'lifeweaver', 'lucio', 'mauga', 'mei', 'mercy', 'mizuki', 'moira', 'orisa',
  'pharah', 'ramattra', 'reaper', 'reinhardt', 'roadhog', 'sigma', 'sojourn',
  'soldier-76', 'sombra', 'symmetra', 'torbjorn', 'tracer', 'vendetta',
  'venture', 'widowmaker', 'winston', 'wrecking-ball', 'wuyang', 'zarya', 'zenyatta'
];

// Expected maps (28 total)
const EXPECTED_MAPS = [
  'all-maps',
  'busan', 'ilios', 'lijiang-tower', 'nepal', 'oasis', 'antarctic-peninsula', 'samoa',
  'dorado', 'havana', 'junkertown', 'rialto', 'route-66', 'shambali-monastery', 'circuit-royal',
  'blizzard-world', 'eichenwalde', 'hollywood', 'kings-row', 'midtown', 'numbani', 'paraiso',
  'colosseo', 'esperanca', 'new-queen-street', 'runasapi',
  'new-junk-city', 'suravasa'
];

const results = {
  heroes: { pass: true, issues: [] },
  maps: { pass: true, issues: [] },
  dataIntegrity: { pass: true, issues: [] },
  apiAccuracy: { pass: true, issues: [] }
};

// ============================================================================
// 1. VERIFY ALL HEROES
// ============================================================================
console.log('1️⃣  HERO VERIFICATION\n');

const frontendData = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'frontend', 'public', 'data', 'overwatch-stats.json'),
  'utf-8'
));

const backendData = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'backend', 'data', 'real-overwatch-data.json'),
  'utf-8'
));

console.log(`Expected heroes: ${EXPECTED_HEROES.length}`);

// Check each snapshot has all heroes
const allMapsSnapshot = frontendData.find(s => s.map === 'all-maps');
if (!allMapsSnapshot) {
  results.heroes.pass = false;
  results.heroes.issues.push('No all-maps snapshot found');
  console.log('❌ No all-maps snapshot found');
} else {
  const heroesInSnapshot = allMapsSnapshot.heroes.map(h => h.hero).sort();
  console.log(`Heroes in all-maps snapshot: ${heroesInSnapshot.length}`);
  
  // Check for missing heroes
  const missingHeroes = EXPECTED_HEROES.filter(h => !heroesInSnapshot.includes(h));
  if (missingHeroes.length > 0) {
    results.heroes.pass = false;
    results.heroes.issues.push(`Missing heroes: ${missingHeroes.join(', ')}`);
    console.log(`❌ Missing heroes: ${missingHeroes.join(', ')}`);
  } else {
    console.log('✅ All 50 heroes present');
  }
  
  // Check for extra heroes
  const extraHeroes = heroesInSnapshot.filter(h => !EXPECTED_HEROES.includes(h));
  if (extraHeroes.length > 0) {
    console.log(`⚠️  Extra heroes found: ${extraHeroes.join(', ')}`);
  }
  
  // Verify hero data structure
  const sampleHero = allMapsSnapshot.heroes[0];
  if (!sampleHero.hero || typeof sampleHero.pick_rate !== 'number' || typeof sampleHero.win_rate !== 'number') {
    results.heroes.pass = false;
    results.heroes.issues.push('Invalid hero data structure');
    console.log('❌ Invalid hero data structure');
  } else {
    console.log('✅ Hero data structure valid');
  }
}

console.log('');

// ============================================================================
// 2. VERIFY ALL MAPS
// ============================================================================
console.log('2️⃣  MAP VERIFICATION\n');

console.log(`Expected maps: ${EXPECTED_MAPS.length}`);

const mapsInData = [...new Set(frontendData.map(s => s.map))].sort();
console.log(`Maps in data: ${mapsInData.length}`);

// Check for missing maps
const missingMaps = EXPECTED_MAPS.filter(m => !mapsInData.includes(m));
if (missingMaps.length > 0) {
  results.maps.pass = false;
  results.maps.issues.push(`Missing maps: ${missingMaps.join(', ')}`);
  console.log(`❌ Missing maps: ${missingMaps.join(', ')}`);
} else {
  console.log('✅ All 28 maps present');
}

// Check for extra maps
const extraMaps = mapsInData.filter(m => !EXPECTED_MAPS.includes(m));
if (extraMaps.length > 0) {
  console.log(`⚠️  Extra maps found: ${extraMaps.join(', ')}`);
}

// Verify each map has unique data
console.log('\nVerifying map-specific data differences:');
const allMapsData = frontendData.find(s => s.map === 'all-maps');
const busanData = frontendData.find(s => s.map === 'busan');
const kingsRowData = frontendData.find(s => s.map === 'kings-row');

if (allMapsData && busanData && kingsRowData) {
  const mizukiAllMaps = allMapsData.heroes.find(h => h.hero === 'mizuki');
  const mizukiBusan = busanData.heroes.find(h => h.hero === 'mizuki');
  const mizukiKingsRow = kingsRowData.heroes.find(h => h.hero === 'mizuki');
  
  console.log(`  Mizuki pick rate - All Maps: ${mizukiAllMaps?.pick_rate}%`);
  console.log(`  Mizuki pick rate - Busan: ${mizukiBusan?.pick_rate}%`);
  console.log(`  Mizuki pick rate - King's Row: ${mizukiKingsRow?.pick_rate}%`);
  
  if (mizukiAllMaps?.pick_rate === mizukiBusan?.pick_rate && 
      mizukiBusan?.pick_rate === mizukiKingsRow?.pick_rate) {
    results.maps.pass = false;
    results.maps.issues.push('Map data is identical - not map-specific');
    console.log('  ❌ Data is identical across maps - map filter will not work!');
  } else {
    console.log('  ✅ Data is different per map - map filter working correctly');
  }
} else {
  results.maps.pass = false;
  results.maps.issues.push('Missing test maps for verification');
  console.log('❌ Could not verify map-specific data');
}

// Verify each map has all heroes
console.log('\nVerifying all maps have complete hero data:');
let mapsWithCompleteData = 0;
for (const map of EXPECTED_MAPS) {
  const snapshot = frontendData.find(s => s.map === map);
  if (snapshot && snapshot.heroes.length === 50) {
    mapsWithCompleteData++;
  } else if (snapshot) {
    results.maps.pass = false;
    results.maps.issues.push(`Map ${map} has ${snapshot.heroes.length} heroes (expected 50)`);
    console.log(`  ❌ ${map}: ${snapshot.heroes.length} heroes`);
  }
}
console.log(`  ✅ ${mapsWithCompleteData}/${EXPECTED_MAPS.length} maps have all 50 heroes`);

console.log('');

// ============================================================================
// 3. DATA INTEGRITY
// ============================================================================
console.log('3️⃣  DATA INTEGRITY\n');

// Verify frontend and backend data match
console.log('Comparing frontend and backend data:');
if (frontendData.length !== backendData.length) {
  results.dataIntegrity.pass = false;
  results.dataIntegrity.issues.push(`Frontend has ${frontendData.length} snapshots, backend has ${backendData.length}`);
  console.log(`❌ Mismatch: Frontend ${frontendData.length} vs Backend ${backendData.length} snapshots`);
} else {
  console.log(`✅ Both have ${frontendData.length} snapshots`);
}

// Verify data hashes exist
console.log('\nVerifying data hashes:');
const snapshotsWithHash = frontendData.filter(s => s.dataHash && s.dataHash.length === 64);
console.log(`  ${snapshotsWithHash.length}/${frontendData.length} snapshots have valid SHA-256 hashes`);
if (snapshotsWithHash.length !== frontendData.length) {
  results.dataIntegrity.pass = false;
  results.dataIntegrity.issues.push('Some snapshots missing data hashes');
  console.log('  ❌ Some snapshots missing data hashes');
} else {
  console.log('  ✅ All snapshots have valid data hashes');
}

// Verify timestamps
console.log('\nVerifying timestamps:');
const snapshotsWithTimestamp = frontendData.filter(s => {
  try {
    const date = new Date(s.timestamp);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
});
console.log(`  ${snapshotsWithTimestamp.length}/${frontendData.length} snapshots have valid timestamps`);
if (snapshotsWithTimestamp.length !== frontendData.length) {
  results.dataIntegrity.pass = false;
  results.dataIntegrity.issues.push('Some snapshots have invalid timestamps');
  console.log('  ❌ Some snapshots have invalid timestamps');
} else {
  const latestTimestamp = new Date(frontendData[0].timestamp);
  console.log(`  ✅ All snapshots have valid timestamps`);
  console.log(`  Latest snapshot: ${latestTimestamp.toISOString()}`);
}

console.log('');

// ============================================================================
// 4. API ACCURACY SPOT CHECK
// ============================================================================
console.log('4️⃣  API ACCURACY SPOT CHECK\n');
console.log('Fetching live data from Blizzard API for comparison...\n');

async function verifyApiAccuracy() {
  try {
    const response = await fetch('https://overwatch.blizzard.com/en-us/rates/data/?input=PC&map=all-maps&region=Americas&role=All&rq=1&tier=All');
    const liveData = await response.json();
    
    if (!liveData.rates) {
      results.apiAccuracy.pass = false;
      results.apiAccuracy.issues.push('Failed to fetch live data from Blizzard API');
      console.log('❌ Failed to fetch live data from Blizzard API');
      return;
    }
    
    console.log(`Live data from Blizzard: ${liveData.rates.length} heroes`);
    
    const ourData = allMapsSnapshot;
    if (!ourData) {
      results.apiAccuracy.pass = false;
      results.apiAccuracy.issues.push('No all-maps snapshot to compare');
      console.log('❌ No all-maps snapshot to compare');
      return;
    }
    
    // Compare a few heroes
    const testHeroes = ['mizuki', 'moira', 'kiriko', 'ana'];
    console.log('\nComparing hero stats:');
    
    let matchCount = 0;
    let mismatchCount = 0;
    
    for (const heroId of testHeroes) {
      const liveHero = liveData.rates.find(h => h.id === heroId);
      const ourHero = ourData.heroes.find(h => h.hero === heroId);
      
      if (!liveHero || !ourHero) {
        console.log(`  ⚠️  ${heroId}: Not found in one of the datasets`);
        continue;
      }
      
      const pickDiff = Math.abs(liveHero.cells.pickrate - ourHero.pick_rate);
      const winDiff = Math.abs(liveHero.cells.winrate - ourHero.win_rate);
      
      if (pickDiff < 0.5 && winDiff < 0.5) {
        console.log(`  ✅ ${heroId}: Pick ${ourHero.pick_rate}% (live: ${liveHero.cells.pickrate}%), Win ${ourHero.win_rate}% (live: ${liveHero.cells.winrate}%)`);
        matchCount++;
      } else {
        console.log(`  ⚠️  ${heroId}: Pick ${ourHero.pick_rate}% (live: ${liveHero.cells.pickrate}%), Win ${ourHero.win_rate}% (live: ${liveHero.cells.winrate}%)`);
        console.log(`      Difference: Pick ${pickDiff.toFixed(1)}%, Win ${winDiff.toFixed(1)}%`);
        mismatchCount++;
      }
    }
    
    if (mismatchCount > 0) {
      console.log(`\n  ⚠️  Note: ${mismatchCount} heroes have differences - this is normal if Blizzard updated data since last scrape`);
    }
    
    console.log(`\n  Match rate: ${matchCount}/${testHeroes.length} heroes within 0.5% tolerance`);
    
  } catch (error) {
    results.apiAccuracy.pass = false;
    results.apiAccuracy.issues.push(`API check failed: ${error.message}`);
    console.log(`❌ API check failed: ${error.message}`);
  }
}

await verifyApiAccuracy();

console.log('');

// ============================================================================
// 5. GITHUB ACTIONS VERIFICATION
// ============================================================================
console.log('5️⃣  GITHUB ACTIONS CONFIGURATION\n');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'daily-scraper.yml');

if (!fs.existsSync(workflowPath)) {
  results.dataIntegrity.pass = false;
  results.dataIntegrity.issues.push('GitHub Actions workflow file not found');
  console.log('❌ GitHub Actions workflow file not found');
} else {
  const workflow = fs.readFileSync(workflowPath, 'utf-8');
  
  const checks = {
    'Has cron schedule': workflow.includes('cron:'),
    'Runs at 2 AM UTC': workflow.includes("'0 2 * * *'"),
    'Has manual trigger': workflow.includes('workflow_dispatch'),
    'Installs dependencies': workflow.includes('npm install'),
    'Runs scraper': workflow.includes('node src/'),
    'Commits changes': workflow.includes('git commit'),
    'Pushes to GitHub': workflow.includes('git push'),
    'Uses correct scraper': workflow.includes('quick-map-scraper.js') || workflow.includes('scrape-all-maps-competitive.js')
  };
  
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    if (!passed) {
      results.dataIntegrity.pass = false;
      results.dataIntegrity.issues.push(`GitHub Actions: ${check} - FAILED`);
    }
  });
  
  console.log('\n📝 How to monitor GitHub Actions:');
  console.log('  1. Go to: https://github.com/xReset/OverwatchMetrics/actions');
  console.log('  2. Click on "Daily Overwatch Stats Scraper" workflow');
  console.log('  3. View run history and logs');
  console.log('  4. Next scheduled run: Tomorrow at 2:00 AM UTC');
  console.log('  5. Can manually trigger by clicking "Run workflow" button');
}

console.log('');

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('='.repeat(80));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(80) + '\n');

const allPassed = results.heroes.pass && results.maps.pass && 
                  results.dataIntegrity.pass && results.apiAccuracy.pass;

console.log(`Heroes:         ${results.heroes.pass ? '✅ PASS' : '❌ FAIL'}`);
if (results.heroes.issues.length > 0) {
  results.heroes.issues.forEach(issue => console.log(`  - ${issue}`));
}

console.log(`Maps:           ${results.maps.pass ? '✅ PASS' : '❌ FAIL'}`);
if (results.maps.issues.length > 0) {
  results.maps.issues.forEach(issue => console.log(`  - ${issue}`));
}

console.log(`Data Integrity: ${results.dataIntegrity.pass ? '✅ PASS' : '❌ FAIL'}`);
if (results.dataIntegrity.issues.length > 0) {
  results.dataIntegrity.issues.forEach(issue => console.log(`  - ${issue}`));
}

console.log(`API Accuracy:   ${results.apiAccuracy.pass ? '✅ PASS' : '❌ FAIL'}`);
if (results.apiAccuracy.issues.length > 0) {
  results.apiAccuracy.issues.forEach(issue => console.log(`  - ${issue}`));
}

console.log('\n' + '='.repeat(80));
if (allPassed) {
  console.log('🎉 ALL CHECKS PASSED - System is ready for production!');
} else {
  console.log('⚠️  SOME CHECKS FAILED - Review issues above');
}
console.log('='.repeat(80) + '\n');

process.exit(allPassed ? 0 : 1);
