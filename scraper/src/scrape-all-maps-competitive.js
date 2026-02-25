import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://overwatch.blizzard.com/en-us/rates/data/';

// All 26 maps
const ALL_MAPS = [
  'all-maps',
  'busan',
  'ilios',
  'lijiang-tower',
  'nepal',
  'oasis',
  'antarctic-peninsula',
  'samoa',
  'dorado',
  'havana',
  'junkertown',
  'rialto',
  'route-66',
  'shambali-monastery',
  'circuit-royal',
  'blizzard-world',
  'eichenwalde',
  'hollywood',
  'kings-row',
  'midtown',
  'numbani',
  'paraiso',
  'colosseo',
  'esperanca',
  'new-queen-street',
  'runasapi',
  'new-junk-city',
  'suravasa'
];

function calculateDataHash(heroes) {
  const sorted = [...heroes].sort((a, b) => a.hero.localeCompare(b.hero));
  const dataString = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}


async function scrapeAllMaps() {
  console.log('🗺️  Scraping BOTH Competitive AND Quick Play for ALL 28 Maps\n');
  console.log(`Total maps: ${ALL_MAPS.length} × 2 modes = ${ALL_MAPS.length * 2} snapshots\n`);
  
  const allSnapshots = [];
  const timestamp = new Date().toISOString();
  
  let successCount = 0;
  let failCount = 0;
  
  const MODES = ['competitive', 'quick-play'];
  
  for (const mode of MODES) {
    console.log(`\n📊 Scraping ${mode.toUpperCase()} mode:\n`);
    
    for (const map of ALL_MAPS) {
      const url = `${API_BASE}?input=PC&map=${map}&mode=${mode}&region=Americas&role=All&rq=1&tier=All`;
      
      console.log(`Fetching: ${mode} / ${map}`);
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.rates || !Array.isArray(data.rates)) {
          console.log(`  ⚠️  No rates data returned`);
          failCount++;
          continue;
        }
        
        console.log(`  ✓ Got ${data.rates.length} heroes`);
        
        const heroes = data.rates.map(hero => ({
          hero: hero.id,
          pick_rate: hero.cells.pickrate,
          win_rate: hero.cells.winrate
        }));
        
        const dataHash = calculateDataHash(heroes);
        
        const snapshot = {
          id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp,
          mode: mode,
          input: 'PC',
          region: 'Americas',
          tier: 'All',
          map: map,
          dataHash,
          changeDetected: true,
          heroes
        };
        
        allSnapshots.push(snapshot);
        successCount++;
        
        // Show top 3 for verification
        const sorted = [...heroes].sort((a, b) => b.pick_rate - a.pick_rate);
        console.log(`  Top 3: ${sorted.slice(0, 3).map(h => h.hero).join(', ')}`);
        
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
        failCount++;
      }
      
      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n✅ Scraping complete!`);
  console.log(`Success: ${successCount} maps`);
  console.log(`Failed: ${failCount} maps`);
  
  if (allSnapshots.length > 0) {
    // Save to backend
    const backendPath = path.join(__dirname, '..', '..', 'backend', 'data', 'real-overwatch-data.json');
    fs.writeFileSync(backendPath, JSON.stringify(allSnapshots, null, 2));
    console.log(`\n📁 Backend data saved: ${backendPath}`);
    console.log(`   Total snapshots: ${allSnapshots.length}`);
    
    // Save to frontend (all snapshots so map filter works)
    const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'data', 'overwatch-stats.json');
    fs.writeFileSync(frontendPath, JSON.stringify(allSnapshots, null, 2));
    console.log(`📁 Frontend data saved: ${frontendPath}`);
    console.log(`   Total snapshots: ${allSnapshots.length}`);
    
    // Show sample comparison
    const allMapsSnapshot = allSnapshots.find(s => s.map === 'all-maps');
    const busanSnapshot = allSnapshots.find(s => s.map === 'busan');
    
    if (allMapsSnapshot && busanSnapshot) {
      console.log(`\n📊 Data Verification - Mizuki pick rate:`);
      const mizukiAllMaps = allMapsSnapshot.heroes.find(h => h.hero === 'mizuki');
      const mizukiBusan = busanSnapshot.heroes.find(h => h.hero === 'mizuki');
      console.log(`   All Maps: ${mizukiAllMaps?.pick_rate}%`);
      console.log(`   Busan: ${mizukiBusan?.pick_rate}%`);
      console.log(`   Difference: ${Math.abs((mizukiAllMaps?.pick_rate || 0) - (mizukiBusan?.pick_rate || 0)).toFixed(1)}%`);
      
      if (mizukiAllMaps?.pick_rate !== mizukiBusan?.pick_rate) {
        console.log(`   ✅ Data is different per map - map filter will work!`);
      } else {
        console.log(`   ⚠️  Data is identical - something may be wrong`);
      }
    }
  }
  
  return allSnapshots;
}

scrapeAllMaps()
  .then(() => {
    console.log('\n🎉 All maps scraped successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
