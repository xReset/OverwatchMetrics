import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * Intercept network requests to find the API endpoint that provides hero statistics
 */
async function findAPIEndpoint() {
  console.log('Launching browser to intercept network requests...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    const apiRequests = [];
    
    // Intercept all network requests
    await page.on('request', request => {
      const url = request.url();
      if (url.includes('api') || url.includes('stats') || url.includes('hero') || url.includes('rates')) {
        console.log('📡 API Request:', request.method(), url);
        apiRequests.push({
          method: request.method(),
          url: url,
          headers: request.headers()
        });
      }
    });

    // Intercept all responses
    await page.on('response', async response => {
      const url = response.url();
      if (url.includes('api') || url.includes('stats') || url.includes('hero') || url.includes('rates')) {
        try {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('json')) {
            const data = await response.json();
            console.log('\n📥 API Response from:', url);
            console.log('Status:', response.status());
            console.log('Data preview:', JSON.stringify(data).substring(0, 200));
            
            // Save the full response
            const filename = `api-response-${Date.now()}.json`;
            const filepath = path.join(process.cwd(), filename);
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
            console.log(`Saved to: ${filepath}\n`);
          }
        } catch (e) {
          // Not JSON or couldn't parse
        }
      }
    });

    const url = 'https://overwatch.blizzard.com/en-us/rates/?input=PC&map=all-maps&region=Americas&role=All&rq=1&tier=All';
    console.log(`Navigating to: ${url}\n`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    console.log('\nWaiting for all network activity to complete...');
    await page.waitForTimeout(10000);

    console.log(`\n✅ Captured ${apiRequests.length} API requests`);
    
    if (apiRequests.length > 0) {
      console.log('\n=== API Endpoints Found ===');
      apiRequests.forEach((req, i) => {
        console.log(`${i + 1}. ${req.method} ${req.url}`);
      });
      
      // Save API requests for reference
      const requestsFile = path.join(process.cwd(), 'api-requests.json');
      fs.writeFileSync(requestsFile, JSON.stringify(apiRequests, null, 2));
      console.log(`\nAPI requests saved to: ${requestsFile}`);
    } else {
      console.log('\n⚠️  No API requests detected. The data might be embedded in the page or loaded differently.');
    }

    // Try to extract data from the page after it's fully loaded
    console.log('\n=== Attempting to extract data from rendered page ===');
    
    const pageData = await page.evaluate(() => {
      // Look for React props or data in window object
      const reactData = [];
      
      // Check if data is in window object
      if (window.__INITIAL_STATE__) {
        reactData.push({ source: 'window.__INITIAL_STATE__', data: window.__INITIAL_STATE__ });
      }
      if (window.__PRELOADED_STATE__) {
        reactData.push({ source: 'window.__PRELOADED_STATE__', data: window.__PRELOADED_STATE__ });
      }
      
      // Try to find React fiber nodes with data
      const allElements = document.querySelectorAll('*');
      const elementsWithData = [];
      
      allElements.forEach(el => {
        // Check for React internal properties
        const keys = Object.keys(el);
        const reactKey = keys.find(k => k.startsWith('__react'));
        
        if (reactKey && el[reactKey]) {
          const fiber = el[reactKey];
          if (fiber.memoizedProps && Object.keys(fiber.memoizedProps).length > 0) {
            elementsWithData.push({
              tag: el.tagName,
              props: fiber.memoizedProps
            });
          }
        }
      });

      // Look for any data attributes or JSON in the page
      const scripts = Array.from(document.querySelectorAll('script'));
      const jsonScripts = scripts.filter(s => {
        const content = s.textContent || '';
        return content.includes('{') && (content.includes('hero') || content.includes('stats') || content.includes('pick') || content.includes('win'));
      }).map(s => ({
        content: (s.textContent || '').substring(0, 500)
      }));

      return {
        reactData,
        elementsWithDataCount: elementsWithData.length,
        sampleElements: elementsWithData.slice(0, 3),
        jsonScripts: jsonScripts.slice(0, 3)
      };
    });

    console.log('React data sources found:', pageData.reactData.length);
    console.log('Elements with React data:', pageData.elementsWithDataCount);
    
    if (pageData.reactData.length > 0) {
      const dataFile = path.join(process.cwd(), 'react-data.json');
      fs.writeFileSync(dataFile, JSON.stringify(pageData.reactData, null, 2));
      console.log(`React data saved to: ${dataFile}`);
    }

    console.log('\nBrowser will stay open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

findAPIEndpoint()
  .then(() => console.log('\n✅ Complete! Check the generated JSON files for API endpoints and data.'))
  .catch(error => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });
