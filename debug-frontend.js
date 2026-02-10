const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  
  console.log('Opening app...');
  await page.goto('http://localhost:3080');
  await page.waitForTimeout(1000);
  
  // Navigate to Lists
  console.log('Clicking Lists...');
  await page.click('[data-view="lists"]');
  await page.waitForTimeout(500);
  
  // Click on a list to view it
  console.log('Clicking on first list...');
  const listButtons = await page.$$('button:has-text("View Contacts")');
  if (listButtons.length > 0) {
    await listButtons[0].click();
    await page.waitForTimeout(500);
    
    // Try to add contact
    console.log('Clicking Add Contact button...');
    await page.click('button:has-text("Add Contact")');
    await page.waitForTimeout(1000);
    
    console.log('Check if prompt appeared or UI opened');
    await page.waitForTimeout(3000);
  }
  
  await browser.close();
})();
