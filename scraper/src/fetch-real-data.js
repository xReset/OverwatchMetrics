import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://overwatch.blizzard.com/en-us/rates/';

function buildUrl({ input, region, rq, tier }) {
  const params = new URLSearchParams({
    input,
    map: 'all-maps',
    region,
    role: 'All',
    rq: rq.toString(),
    tier
  });
  
  return `${BASE_URL}?${params.toString()}`;
}

async function fetchHeroStats(params) {
  const url = buildUrl(params);
  console.log(`Fetching: ${url}`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait longer for JavaScript to render
    await page.waitForTimeout(5000);

    // Try to extract data directly from the page using JavaScript
    const heroes = await page.evaluate(() => {
      const results = [];
      
      // Try to find all elements that might contain hero data
      const allElements = document.querySelectorAll('*');
      const heroData = {};
      
      // Look for hero names and stats in the DOM
      allElements.forEach(el => {
        const text = el.textContent?.trim() || '';
        
        // Check if this looks like a hero name (common OW heroes)
        const heroNames = ['ana', 'ashe', 'baptiste', 'bastion', 'brigitte', 'cassidy', 
          'd.va', 'doomfist', 'echo', 'genji', 'hanzo', 'illari', 'junker queen', 
          'junkrat', 'juno', 'kiriko', 'lifeweaver', 'lucio', 'mauga', 'mei', 'mercy', 
          'moira', 'orisa', 'pharah', 'ramattra', 'reaper', 'reinhardt', 'roadhog', 
          'sigma', 'sojourn', 'soldier: 76', 'sombra', 'symmetra', 'torbjorn', 'tracer',
          'venture', 'widowmaker', 'winston', 'wrecking ball', 'zarya', 'zenyatta',
          'hazard', 'freja'];
        
        const lowerText = text.toLowerCase();
        for (const heroName of heroNames) {
          if (lowerText === heroName || lowerText === heroName.replace(/[^a-z0-9]/g, '')) {
            // Found a hero name, look for nearby percentage values
            let current = el;
            let attempts = 0;
            while (current && attempts < 10) {
              const parent = current.parentElement;
              if (!parent) break;
              
              const parentText = parent.textContent || '';
              const percentages = parentText.match(/(\d+\.?\d*)%/g);
              
              if (percentages && percentages.length >= 2) {
                const pickRate = parseFloat(percentages[0].replace('%', ''));
                const winRate = parseFloat(percentages[1].replace('%', ''));
                
                const normalizedName = heroName.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                if (!heroData[normalizedName]) {
                  heroData[normalizedName] = {
                    hero: normalizedName,
                    pick_rate: pickRate,
                    win_rate: winRate
                  };
                }
                break;
              }
              
              current = parent;
              attempts++;
            }
          }
        }
      });
      
      return Object.values(heroData);
    });

    if (heroes.length === 0) {
      // Fallback: save the HTML for debugging
      const html = await page.content();
      console.log('Page HTML length:', html.length);
      console.log('Searching for table elements...');
      
      const $ = cheerio.load(html);
      console.log('Tables found:', $('table').length);
      console.log('Rows found:', $('tr').length);
      console.log('Divs with "hero" in class:', $('[class*="hero"]').length);
    }

    return heroes;

  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  console.log('Starting real data fetch from Overwatch statistics...\n');
  
  const timestamp = new Date().toISOString();
  const snapshots = [];

  // Fetch just one combination to start: Competitive, PC, Americas, All ranks
  const params = {
    input: 'PC',
    region: 'Americas',
    rq: 1, // Competitive
    tier: 'All'
  };

  console.log('Fetching Competitive PC Americas All ranks...');
  const heroes = await fetchHeroStats(params);
  
  if (heroes.length > 0) {
    console.log(`\nSuccessfully fetched ${heroes.length} heroes!`);
    console.log('Sample data:');
    heroes.slice(0, 5).forEach(h => {
      console.log(`  ${h.hero}: ${h.pick_rate}% pick, ${h.win_rate}% win`);
    });

    const snapshot = {
      timestamp,
      mode: 'competitive',
      input: 'PC',
      region: 'Americas',
      tier: 'All',
      heroes
    };

    snapshots.push(snapshot);

    // Save to JSON file
    const outputPath = path.join(process.cwd(), '..', 'backend', 'data', 'real-data.json');
    const dir = path.dirname(outputPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(snapshots, null, 2));
    console.log(`\nData saved to: ${outputPath}`);
  } else {
    console.log('\nNo data fetched. Please check the website structure.');
  }
}

main().catch(console.error);
