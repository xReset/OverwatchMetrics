import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://overwatch.blizzard.com/en-us/rates/';

async function scrapeWithScreenshot() {
  console.log('Launching browser with advanced scraping...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Run visible to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const url = `${BASE_URL}?input=PC&map=all-maps&region=Americas&role=All&rq=1&tier=All`;
    console.log(`Navigating to: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    console.log('Page loaded, waiting for content...');
    await page.waitForTimeout(8000); // Wait 8 seconds for JS to fully render

    // Take screenshot to see what we're working with
    const screenshotPath = path.join(process.cwd(), 'page-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Try to find any data in the page
    const pageData = await page.evaluate(() => {
      // Get all text content
      const bodyText = document.body.innerText;
      
      // Look for any table or structured data
      const tables = document.querySelectorAll('table');
      const rows = document.querySelectorAll('tr');
      const divs = document.querySelectorAll('div');
      
      // Try to find hero names in the page
      const heroMatches = bodyText.match(/\b(ana|ashe|baptiste|bastion|brigitte|cassidy|dva|d\.va|doomfist|echo|genji|hanzo|illari|junker queen|junkrat|juno|kiriko|lifeweaver|lucio|mauga|mei|mercy|moira|orisa|pharah|ramattra|reaper|reinhardt|roadhog|sigma|sojourn|soldier|sombra|symmetra|torbjorn|tracer|venture|widowmaker|winston|wrecking ball|zarya|zenyatta|hazard|freja|anran|domina|emre|jetpack cat|mizuki|vendetta|wuyang)\b/gi);
      
      // Try to find percentages
      const percentages = bodyText.match(/\d+\.?\d*%/g);
      
      return {
        hasTable: tables.length > 0,
        tableCount: tables.length,
        rowCount: rows.length,
        divCount: divs.length,
        bodyLength: bodyText.length,
        heroMatches: heroMatches ? [...new Set(heroMatches.map(h => h.toLowerCase()))] : [],
        percentageCount: percentages ? percentages.length : 0,
        samplePercentages: percentages ? percentages.slice(0, 20) : [],
        pageTitle: document.title,
        hasLoginForm: bodyText.toLowerCase().includes('log in') || bodyText.toLowerCase().includes('sign in'),
        bodyPreview: bodyText.substring(0, 500)
      };
    });

    console.log('\n=== Page Analysis ===');
    console.log('Page Title:', pageData.pageTitle);
    console.log('Has Login Form:', pageData.hasLoginForm);
    console.log('Tables found:', pageData.tableCount);
    console.log('Rows found:', pageData.rowCount);
    console.log('Body text length:', pageData.bodyLength);
    console.log('Heroes detected:', pageData.heroMatches.length);
    console.log('Sample heroes:', pageData.heroMatches.slice(0, 10));
    console.log('Percentages found:', pageData.percentageCount);
    console.log('Sample percentages:', pageData.samplePercentages);
    console.log('\nBody preview:');
    console.log(pageData.bodyPreview);
    console.log('=====================\n');

    // Save the HTML for inspection
    const html = await page.content();
    const htmlPath = path.join(process.cwd(), 'page-content.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`HTML saved to: ${htmlPath}`);

    // If login is required, inform user
    if (pageData.hasLoginForm) {
      console.log('\n⚠️  WARNING: The page appears to require authentication.');
      console.log('The Overwatch statistics page may require a Battle.net login.');
      console.log('Browser window will stay open for 30 seconds so you can inspect it.');
      await page.waitForTimeout(30000);
    }

    // Try advanced selectors
    console.log('\nAttempting to extract data with advanced selectors...');
    
    const extractedData = await page.evaluate(() => {
      const results = [];
      
      // Strategy 1: Look for any element with hero-like structure
      const allElements = Array.from(document.querySelectorAll('*'));
      
      // Find elements that might be hero rows
      const potentialHeroElements = allElements.filter(el => {
        const text = el.textContent || '';
        const hasHeroName = /ana|ashe|baptiste|bastion|brigitte|cassidy|dva|doomfist|echo|genji|hanzo|illari|junkrat|juno|kiriko|lifeweaver|lucio|mauga|mei|mercy|moira|orisa|pharah|ramattra|reaper|reinhardt|roadhog|sigma|sojourn|soldier|sombra|symmetra|torbjorn|tracer|venture|widowmaker|winston|wrecking ball|zarya|zenyatta|hazard|freja|anran|domina|emre|mizuki|vendetta|wuyang/i.test(text);
        const hasPercentage = /%/.test(text);
        return hasHeroName && hasPercentage && text.length < 200;
      });

      potentialHeroElements.forEach(el => {
        const text = el.textContent || '';
        const heroMatch = text.match(/(ana|ashe|baptiste|bastion|brigitte|cassidy|d\.?va|doomfist|echo|genji|hanzo|illari|junker queen|junkrat|juno|kiriko|lifeweaver|l[uú]cio|mauga|mei|mercy|moira|orisa|pharah|ramattra|reaper|reinhardt|roadhog|sigma|sojourn|soldier:? 76|sombra|symmetra|torbj[oö]rn|tracer|venture|widowmaker|winston|wrecking ball|zarya|zenyatta|hazard|freja|anran|domina|emre|jetpack cat|mizuki|vendetta|wuyang)/i);
        const percentages = text.match(/(\d+\.?\d*)%/g);
        
        if (heroMatch && percentages && percentages.length >= 2) {
          results.push({
            hero: heroMatch[1].toLowerCase(),
            text: text.trim(),
            percentages: percentages
          });
        }
      });

      return results;
    });

    console.log(`Found ${extractedData.length} potential hero data points`);
    if (extractedData.length > 0) {
      console.log('\nSample extracted data:');
      extractedData.slice(0, 5).forEach(item => {
        console.log(`  ${item.hero}: ${item.percentages.join(', ')}`);
      });
    }

    return { pageData, extractedData };

  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    console.log('\nClosing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

// Run the scraper
scrapeWithScreenshot()
  .then(result => {
    console.log('\n✅ Scraping complete!');
    console.log('Check the screenshot and HTML files to see the page structure.');
  })
  .catch(error => {
    console.error('\n❌ Scraping failed:', error.message);
    process.exit(1);
  });
