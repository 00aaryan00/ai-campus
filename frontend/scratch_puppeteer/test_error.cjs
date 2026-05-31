const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[PAGE ERROR]: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`[UNCAUGHT ERROR]: ${error.message}`);
  });

  try {
    // Navigate to student dashboard (might redirect to login)
    await page.goto('http://localhost:5173/t/td/student-dashboard', { waitUntil: 'networkidle2' });
    console.log('Page loaded successfully');

    // Wait 5 seconds to capture runtime errors
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (err) {
    console.error(`Failed to load page: ${err.message}`);
  }

  await browser.close();
})();
