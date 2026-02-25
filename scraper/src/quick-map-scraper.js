import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://overwatch.blizzard.com/en-us/rates/data/';

// Focus on competitive PC Americas All rank with all maps for initial deployment
const PRIORITY_COMBINATIONS = [
  { mode: 'competitive', rq: 1, input: 'PC', region: 'Americas', tier: 'All', map: 'all-maps' }
];

function calculateDataHash(heroes) {
  const sorted = [...heroes].sort((a, b) => a.hero.localeCompare(b.hero));
  const dataString = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(dataString).digest('hex');
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

async function scrapeQuickData() {
  console.log('🎮 Quick Scraper - Getting Latest Competitive Data\n');
  
  const allSnapshots = [];
  const timestamp = new Date().toISOString();
  
  for (const combo of PRIORITY_COMBINATIONS) {
    const rates = await fetchRealData(combo);
    
    if (rates && rates.length > 0) {
      const heroes = rates.map(hero => ({
        hero: hero.id,
        pick_rate: hero.cells.pickrate,
        win_rate: hero.cells.winrate
      }));
      
      const dataHash = calculateDataHash(heroes);
      
      const snapshot = {
        id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        mode: combo.mode,
        input: combo.input,
        region: combo.region,
        tier: combo.tier,
        map: combo.map,
        dataHash,
        changeDetected: true,
        heroes
      };
      
      allSnapshots.push(snapshot);
      
      console.log(`\n✅ Successfully scraped ${heroes.length} heroes`);
      console.log(`Data hash: ${dataHash.substring(0, 16)}...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (allSnapshots.length > 0) {
    // Save to backend
    const backendPath = path.join(__dirname, '..', '..', 'backend', 'data', 'real-overwatch-data.json');
    fs.writeFileSync(backendPath, JSON.stringify(allSnapshots, null, 2));
    console.log(`\n📁 Backend data saved: ${backendPath}`);
    
    // Save to frontend
    const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'data', 'overwatch-stats.json');
    fs.writeFileSync(frontendPath, JSON.stringify(allSnapshots, null, 2));
    console.log(`📁 Frontend data saved: ${frontendPath}`);
    
    // Show top heroes
    const sample = allSnapshots[0];
    console.log(`\n📊 Top 10 Heroes by Pick Rate:`);
    const sorted = [...sample.heroes].sort((a, b) => b.pick_rate - a.pick_rate);
    sorted.slice(0, 10).forEach((h, i) => {
      console.log(`  ${i + 1}. ${h.hero.padEnd(20)} ${h.pick_rate.toFixed(1)}% pick, ${h.win_rate.toFixed(1)}% win`);
    });
  }
  
  return allSnapshots;
}

scrapeQuickData()
  .then(() => {
    console.log('\n🎉 Quick scrape complete! Data is ready for deployment.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
