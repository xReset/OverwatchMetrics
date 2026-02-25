import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
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

async function fetchRealData(params) {
  const { input, region, rq, tier } = params;
  const url = `${API_BASE}?input=${input}&map=all-maps&region=${region}&role=All&rq=${rq}&tier=${tier}`;
  
  console.log(`Fetching: ${input} / ${region} / ${rq === 0 ? 'Quick Play' : 'Competitive'} / ${tier}`);
  
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

async function scrapeAllData() {
  console.log('🎮 Starting REAL Overwatch 2 Data Scraper\n');
  console.log('This will fetch 100% real data from Blizzard\'s API');
  console.log(`Total combinations: ${MODES.length * INPUTS.length * REGIONS.length * TIERS.length}\n`);
  
  const allSnapshots = [];
  const timestamp = new Date().toISOString();
  let successCount = 0;
  let failCount = 0;
  
  for (const mode of MODES) {
    for (const input of INPUTS) {
      for (const region of REGIONS) {
        for (const tier of TIERS) {
          const rates = await fetchRealData({
            input,
            region,
            rq: mode.rq,
            tier
          });
          
          if (rates && rates.length > 0) {
            // Convert to our format
            const heroes = rates.map(hero => ({
              hero: hero.id,
              pick_rate: hero.cells.pickrate,
              win_rate: hero.cells.winrate
            }));
            
            allSnapshots.push({
              timestamp,
              mode: mode.name,
              input,
              region,
              tier,
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
  
  console.log(`\n✅ Scraping complete!`);
  console.log(`Success: ${successCount} snapshots`);
  console.log(`Failed: ${failCount} snapshots`);
  
  if (allSnapshots.length > 0) {
    // Save to JSON file
    const outputPath = path.join(__dirname, '..', '..', 'backend', 'data', 'real-overwatch-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(allSnapshots, null, 2));
    console.log(`\n📁 Data saved to: ${outputPath}`);
    
    // Show sample data
    const sample = allSnapshots[0];
    console.log(`\n📊 Sample data (${sample.mode} / ${sample.input} / ${sample.region} / ${sample.tier}):`);
    console.log(`Total heroes: ${sample.heroes.length}`);
    console.log('\nTop 5 by pick rate:');
    const sorted = [...sample.heroes].sort((a, b) => b.pick_rate - a.pick_rate);
    sorted.slice(0, 5).forEach((h, i) => {
      console.log(`  ${i + 1}. ${h.hero}: ${h.pick_rate}% pick, ${h.win_rate}% win`);
    });
    
    // List all unique heroes
    const allHeroes = new Set();
    allSnapshots.forEach(snapshot => {
      snapshot.heroes.forEach(h => allHeroes.add(h.hero));
    });
    console.log(`\n🦸 Total unique heroes found: ${allHeroes.size}`);
    console.log('Heroes:', Array.from(allHeroes).sort().join(', '));
  }
  
  return allSnapshots;
}

// Run the scraper
scrapeAllData()
  .then(data => {
    console.log('\n🎉 All done! Real Overwatch 2 data is ready.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
