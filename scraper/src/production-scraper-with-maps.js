import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://overwatch.blizzard.com/en-us/rates/data/';

// All combinations to scrape
const MODES = [
  { rq: 0, name: 'quick-play' },
  { rq: 1, name: 'competitive' }
];

const INPUTS = ['PC', 'Console'];
const REGIONS = ['Americas', 'Europe', 'Asia'];
const TIERS = ['All', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];

// All Overwatch 2 maps by game mode
const MAPS = {
  'all': ['all-maps'],
  'control': ['busan', 'ilios', 'lijiang-tower', 'nepal', 'oasis', 'antarctic-peninsula', 'samoa'],
  'escort': ['dorado', 'havana', 'junkertown', 'rialto', 'route-66', 'shambali-monastery', 'circuit-royal'],
  'hybrid': ['blizzard-world', 'eichenwalde', 'hollywood', 'kings-row', 'midtown', 'numbani', 'paraiso'],
  'push': ['colosseo', 'esperanca', 'new-queen-street', 'runasapi'],
  'flashpoint': ['new-junk-city', 'suravasa']
};

// Get all maps for scraping
const ALL_MAPS = [
  ...MAPS.all,
  ...MAPS.control,
  ...MAPS.escort,
  ...MAPS.hybrid,
  ...MAPS.push,
  ...MAPS.flashpoint
];

function calculateDataHash(heroes) {
  const sorted = [...heroes].sort((a, b) => a.hero.localeCompare(b.hero));
  const dataString = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

function hasSignificantChange(newData, previousData, threshold = 0.1) {
  if (!previousData) return true;
  
  for (const newHero of newData) {
    const prevHero = previousData.find(h => h.hero === newHero.hero);
    if (!prevHero) return true;
    
    const pickRateDiff = Math.abs(newHero.pick_rate - prevHero.pick_rate);
    const winRateDiff = Math.abs(newHero.win_rate - prevHero.win_rate);
    
    if (pickRateDiff > threshold || winRateDiff > threshold) {
      return true;
    }
  }
  
  return false;
}

async function fetchRealData(params) {
  const { input, region, rq, tier, map } = params;
  const url = `${API_BASE}?input=${input}&map=${map}&region=${region}&role=All&rq=${rq}&tier=${tier}`;
  
  const modeName = rq === 0 ? 'Quick Play' : 'Competitive';
  console.log(`Fetching: ${modeName} / ${input} / ${region} / ${tier} / ${map}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.rates || !Array.isArray(data.rates)) {
      console.log(`  ⚠️  No rates data returned`);
      return null;
    }
    
    console.log(`  ✓ Got ${data.rates.length} heroes`);
    return data.rates;
    
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return null;
  }
}

function loadPreviousSnapshots() {
  const dataPath = path.join(__dirname, '..', '..', 'backend', 'data', 'real-overwatch-data.json');
  
  try {
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.log('No previous snapshots found or error loading:', error.message);
  }
  
  return [];
}

function findPreviousSnapshot(previousSnapshots, filters) {
  return previousSnapshots.find(s =>
    s.mode === filters.mode &&
    s.input === filters.input &&
    s.region === filters.region &&
    s.tier === filters.tier &&
    s.map === filters.map
  );
}

async function scrapeAllData() {
  console.log('🎮 Starting REAL Overwatch 2 Data Scraper with Map Support\n');
  console.log('This will fetch 100% real data from Blizzard\'s API');
  console.log(`Total combinations: ${MODES.length * INPUTS.length * REGIONS.length * TIERS.length * ALL_MAPS.length}\n`);
  
  const allSnapshots = [];
  const previousSnapshots = loadPreviousSnapshots();
  const timestamp = new Date().toISOString();
  
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  
  for (const mode of MODES) {
    for (const input of INPUTS) {
      for (const region of REGIONS) {
        for (const tier of TIERS) {
          for (const map of ALL_MAPS) {
            const rates = await fetchRealData({
              input,
              region,
              rq: mode.rq,
              tier,
              map
            });
            
            if (rates && rates.length > 0) {
              const heroes = rates.map(hero => ({
                hero: hero.id,
                pick_rate: hero.cells.pickrate,
                win_rate: hero.cells.winrate
              }));
              
              const dataHash = calculateDataHash(heroes);
              const filters = { mode: mode.name, input, region, tier, map };
              const previousSnapshot = findPreviousSnapshot(previousSnapshots, filters);
              
              // Check if data has changed
              if (previousSnapshot && previousSnapshot.dataHash === dataHash) {
                console.log(`  ⏭️  Skipping - identical to previous snapshot`);
                skippedCount++;
                continue;
              }
              
              // Check for significant changes
              if (previousSnapshot && !hasSignificantChange(heroes, previousSnapshot.heroes)) {
                console.log(`  ⏭️  Skipping - changes below threshold`);
                skippedCount++;
                continue;
              }
              
              allSnapshots.push({
                id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp,
                mode: mode.name,
                input,
                region,
                tier,
                map,
                dataHash,
                changeDetected: true,
                heroes
              });
              
              successCount++;
            } else {
              failCount++;
            }
            
            // Rate limiting - wait 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }
  }
  
  console.log(`\n✅ Scraping complete!`);
  console.log(`Success: ${successCount} snapshots`);
  console.log(`Skipped: ${skippedCount} snapshots (no changes)`);
  console.log(`Failed: ${failCount} snapshots`);
  
  if (allSnapshots.length > 0) {
    // Merge with previous snapshots (keep historical data)
    const mergedSnapshots = [...previousSnapshots, ...allSnapshots];
    
    // Save to JSON file
    const outputPath = path.join(__dirname, '..', '..', 'backend', 'data', 'real-overwatch-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(mergedSnapshots, null, 2));
    console.log(`\n📁 Data saved to: ${outputPath}`);
    
    // Update frontend static data with latest "all-maps" competitive data
    const latestAllMaps = allSnapshots.find(s => 
      s.mode === 'competitive' && 
      s.map === 'all-maps' && 
      s.tier === 'All' && 
      s.region === 'Americas' && 
      s.input === 'PC'
    );
    
    if (latestAllMaps) {
      const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'data', 'overwatch-stats.json');
      fs.writeFileSync(frontendPath, JSON.stringify([latestAllMaps], null, 2));
      console.log(`📁 Frontend data updated: ${frontendPath}`);
    }
    
    // Show sample data
    const sample = allSnapshots[0];
    console.log(`\n📊 Sample data (${sample.mode} / ${sample.input} / ${sample.region} / ${sample.tier} / ${sample.map}):`);
    console.log(`Total heroes: ${sample.heroes.length}`);
    console.log('\nTop 5 by pick rate:');
    const sorted = [...sample.heroes].sort((a, b) => b.pick_rate - a.pick_rate);
    sorted.slice(0, 5).forEach((h, i) => {
      console.log(`  ${i + 1}. ${h.hero}: ${h.pick_rate}% pick, ${h.win_rate}% win`);
    });
  } else {
    console.log('\n⏭️  No new snapshots to store (all data unchanged)');
  }
  
  return allSnapshots;
}

// Run the scraper
scrapeAllData()
  .then(data => {
    console.log('\n🎉 All done! Real Overwatch 2 data with map support is ready.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
