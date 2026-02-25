import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://overwatch.blizzard.com/en-us/rates/';

/**
 * Build URL with query parameters
 */
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

/**
 * Fetch and parse hero statistics from Blizzard's page
 * @param {Object} params - Query parameters
 * @param {string} params.input - PC or Console
 * @param {string} params.region - Americas, Europe, or Asia
 * @param {number} params.rq - 0 for Quick Play, 1 for Competitive
 * @param {string} params.tier - All, Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster
 * @returns {Promise<Array>} Array of hero stats
 */
export async function fetchHeroStats(params) {
  const url = buildUrl(params);
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate to page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for the hero stats table to load
    // We'll need to inspect the actual page to find the right selector
    // Common selectors to try: table, .hero-stats, [data-testid="hero-table"]
    try {
      await page.waitForSelector('table, [class*="hero"], [class*="stats"], [data-testid*="hero"]', { 
        timeout: 10000 
      });
    } catch (error) {
      console.warn('Could not find hero table with common selectors, proceeding with page content');
    }

    // Additional wait to ensure JS has rendered
    await page.waitForTimeout(2000);

    // Get page content
    const html = await page.content();

    // Parse with Cheerio
    const heroes = parseHeroTable(html);

    await browser.close();

    return heroes;

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * Parse hero table from HTML
 * @param {string} html - HTML content
 * @returns {Array} Array of hero objects
 */
function parseHeroTable(html) {
  const $ = cheerio.load(html);
  const heroes = [];

  // Try multiple selector strategies
  const selectors = [
    'table tbody tr',
    '[class*="hero-row"]',
    '[data-hero]',
    'tr[class*="hero"]',
    '.stats-table tr',
    '[role="row"]'
  ];

  let rows = null;
  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      rows = elements;
      console.log(`Found ${elements.length} rows using selector: ${selector}`);
      break;
    }
  }

  if (!rows || rows.length === 0) {
    console.warn('No hero rows found with any selector');
    // Fallback: try to find any structure that looks like hero data
    return parseFallback($);
  }

  rows.each((i, row) => {
    const $row = $(row);
    
    // Try to extract hero name
    let heroName = null;
    const nameSelectors = [
      '[class*="name"]',
      '[class*="hero"]',
      'td:first-child',
      'th',
      '[data-hero-name]'
    ];

    for (const sel of nameSelectors) {
      const nameEl = $row.find(sel).first();
      if (nameEl.length > 0) {
        heroName = nameEl.text().trim();
        if (heroName && heroName.length > 0 && heroName.length < 50) {
          break;
        }
      }
    }

    if (!heroName) {
      return; // Skip this row
    }

    // Try to extract pick rate and win rate
    const cells = $row.find('td');
    let pickRate = null;
    let winRate = null;

    // Look for percentage values
    cells.each((j, cell) => {
      const text = $(cell).text().trim();
      
      // Check if it's a "--" value
      if (text === '--' || text === '—' || text === '-') {
        return; // Skip, will remain null
      }

      // Check if it's a percentage
      if (text.includes('%')) {
        const value = parseFloat(text.replace('%', ''));
        if (!isNaN(value)) {
          if (pickRate === null) {
            pickRate = value;
          } else if (winRate === null) {
            winRate = value;
          }
        }
      }
    });

    // Also check for data attributes
    const pickRateAttr = $row.attr('data-pick-rate') || $row.find('[data-pick-rate]').attr('data-pick-rate');
    const winRateAttr = $row.attr('data-win-rate') || $row.find('[data-win-rate]').attr('data-win-rate');

    if (pickRateAttr && pickRate === null) {
      const value = parseFloat(pickRateAttr);
      if (!isNaN(value)) pickRate = value;
    }

    if (winRateAttr && winRate === null) {
      const value = parseFloat(winRateAttr);
      if (!isNaN(value)) winRate = value;
    }

    heroes.push({
      name: heroName,
      pickRate,
      winRate
    });
  });

  return heroes;
}

/**
 * Fallback parser when standard selectors don't work
 */
function parseFallback($) {
  const heroes = [];
  
  // Look for any text that might be hero names followed by percentages
  const text = $('body').text();
  
  // This is a very basic fallback - in production, we'd need to inspect the actual page
  console.warn('Using fallback parser - results may be incomplete');
  
  return heroes;
}

/**
 * Validate hero data
 */
export function validateHeroData(heroes) {
  if (!Array.isArray(heroes)) {
    throw new Error('Heroes data must be an array');
  }

  if (heroes.length < 30) {
    console.warn(`Warning: Only ${heroes.length} heroes found (expected at least 30)`);
    return { valid: true, partial: true };
  }

  return { valid: true, partial: false };
}
