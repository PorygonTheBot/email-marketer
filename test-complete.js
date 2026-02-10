const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  const page = await context.newPage();

  console.log('=== Testing Complete Mobile UI ===\n');

  // Navigate to the app
  await page.goto('http://localhost:3080');
  await page.waitForTimeout(500);

  // Test dark mode toggle exists
  const darkModeBtn = await page.$('.dark-mode-toggle');
  console.log('Dark mode toggle exists:', !!darkModeBtn);

  // Test loading overlay exists
  const loadingOverlay = await page.$('.loading-overlay');
  console.log('Loading overlay exists:', !!loadingOverlay);

  // Test sidebar opens
  await page.click('.mobile-menu-btn');
  await page.waitForTimeout(300);
  const isSidebarOpen = await page.evaluate(() => {
    return document.getElementById('mobile-sidebar').classList.contains('open');
  });
  console.log('Sidebar opens:', isSidebarOpen);

  // Close sidebar
  await page.click('.mobile-sidebar-close');
  await page.waitForTimeout(300);

  // Navigate to contacts
  await page.click('[data-view="contacts"]');
  await page.waitForTimeout(500);
  const contactsVisible = await page.isVisible('#contacts-view');
  console.log('Contacts view visible:', contactsVisible);

  console.log('\n=== Screenshot ===\n');
  await page.screenshot({ path: '/home/porygon/.openclaw/workspace/mobile-complete-test.png', fullPage: true });
  console.log('Screenshot saved');

  await browser.close();
  console.log('\n=== Test Complete ===');
})();