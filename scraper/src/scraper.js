import { fetchHeroStats, validateHeroData } from './parser.js';
import { processHeroData } from './normalizer.js';
import { checkSnapshotExists, insertSnapshot, startScraperRun, updateScraperRun } from './storage.js';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_PATH = join(__dirname, '..', 'logs', 'scraper.log');

// Ensure logs directory exists
const logsDir = dirname(LOG_PATH);
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

/**
 * Log message to file and console
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logMessage.trim());
  appendFileSync(LOG_PATH, logMessage);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 5000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(3, attempt); // 5s, 15s, 45s
        log(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`, 'WARN');
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Scrape data for a single combination
 */
async function scrapeCombination({ mode, input, region, tier }) {
  const rq = mode === 'quick-play' ? 0 : 1;
  const map = 'all-maps';

  log(`Scraping: mode=${mode}, input=${input}, region=${region}, tier=${tier}`);

  try {
    // Fetch hero stats with retry
    const rawHeroes = await retryWithBackoff(async () => {
      return await fetchHeroStats({ input, region, rq, tier });
    });

    // Validate data
    const validation = validateHeroData(rawHeroes);
    if (!validation.valid) {
      throw new Error('Invalid hero data');
    }

    if (validation.partial) {
      log(`Warning: Partial data for ${mode}/${input}/${region}/${tier} (${rawHeroes.length} heroes)`, 'WARN');
    }

    // Process hero data
    const { heroes, hash } = processHeroData(rawHeroes);

    // Check if snapshot already exists
    const exists = checkSnapshotExists({ mode, input, region, tier, map, hash });
    
    if (exists) {
      log(`Snapshot already exists with same hash - skipping`);
      return { skipped: true, partial: validation.partial };
    }

    // Insert snapshot
    const snapshotId = insertSnapshot({ mode, input, region, tier, map, hash, heroes });
    log(`Snapshot created: ID=${snapshotId}, heroes=${heroes.length}`);

    return { 
      success: true, 
      snapshotId, 
      heroCount: heroes.length,
      partial: validation.partial 
    };

  } catch (error) {
    log(`Error scraping ${mode}/${input}/${region}/${tier}: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Main scraper function
 */
async function runScraper() {
  const startTime = Date.now();
  log('='.repeat(80));
  log('Starting Overwatch Stats Scraper');
  log('='.repeat(80));

  // Start scraper run tracking
  const runId = startScraperRun();
  log(`Scraper run ID: ${runId}`);

  // Define all combinations
  const modes = ['quick-play', 'competitive'];
  const inputs = ['PC', 'Console'];
  const regions = ['Americas', 'Europe', 'Asia'];
  const tiers = ['All', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];

  const combinations = [];
  for (const mode of modes) {
    for (const input of inputs) {
      for (const region of regions) {
        for (const tier of tiers) {
          combinations.push({ mode, input, region, tier });
        }
      }
    }
  }

  log(`Total combinations to scrape: ${combinations.length}`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const errors = [];
  let partialCount = 0;

  // Process each combination
  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    log(`\nProgress: ${i + 1}/${combinations.length}`);

    try {
      const result = await scrapeCombination(combo);
      
      if (result.skipped) {
        skipCount++;
      } else if (result.success) {
        successCount++;
        if (result.partial) {
          partialCount++;
        }
      }

      // Rate limiting: 2 second delay between requests
      if (i < combinations.length - 1) {
        await sleep(2000);
      }

    } catch (error) {
      failCount++;
      errors.push({
        combination: combo,
        error: error.message,
        stack: error.stack
      });
      
      // Continue with next combination even if this one failed
      log(`Failed to scrape combination, continuing...`, 'ERROR');
    }
  }

  // Calculate duration
  const duration = Date.now() - startTime;

  // Determine overall status
  let status = 'success';
  if (failCount > 0 && successCount === 0) {
    status = 'failed';
  } else if (failCount > 0 || partialCount > 0) {
    status = 'partial';
  }

  // Update scraper run
  updateScraperRun(runId, {
    status,
    snapshots_created: successCount,
    errors: errors.length > 0 ? errors : null,
    duration_ms: duration
  });

  // Log summary
  log('='.repeat(80));
  log('Scraper Run Summary');
  log('='.repeat(80));
  log(`Status: ${status.toUpperCase()}`);
  log(`Duration: ${(duration / 1000).toFixed(2)}s`);
  log(`Snapshots created: ${successCount}`);
  log(`Snapshots skipped (no change): ${skipCount}`);
  log(`Failed: ${failCount}`);
  log(`Partial data: ${partialCount}`);
  
  if (errors.length > 0) {
    log(`\nErrors (${errors.length}):`);
    errors.forEach((err, idx) => {
      log(`  ${idx + 1}. ${err.combination.mode}/${err.combination.input}/${err.combination.region}/${err.combination.tier}`);
      log(`     ${err.error}`);
    });
  }

  log('='.repeat(80));
  log('Scraper run complete');
  log('='.repeat(80));

  // Exit with appropriate code
  process.exit(status === 'failed' ? 1 : 0);
}

// Run scraper
runScraper().catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  log(error.stack, 'ERROR');
  process.exit(1);
});
