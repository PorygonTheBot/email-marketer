const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 } // iPhone SE
  });
  const page = await context.newPage();

  console.log('=== Testing Mobile Sidebar Menu ===\n');

  // Navigate to the app
  await page.goto('http://localhost:3080');
  await page.waitForTimeout(500);

  // Click the hamburger menu to open sidebar
  console.log('Clicking hamburger menu...');
  await page.click('.mobile-menu-btn');
  await page.waitForTimeout(500);

  // Check if sidebar is open
  const isSidebarOpen = await page.evaluate(() => {
    const sidebar = document.getElementById('mobile-sidebar');
    return sidebar && sidebar.classList.contains('open');
  });
  console.log('Sidebar open:', isSidebarOpen);

  // Check sidebar header
  const sidebarHeader = await page.$('.mobile-sidebar-header');
  const isHeaderVisible = await page.isVisible('.mobile-sidebar-header');
  console.log('Sidebar header visible:', isHeaderVisible);

  // Get sidebar header content
  const headerText = await page.$eval('.mobile-sidebar-header', el => el.textContent);
  console.log('Sidebar header text:', headerText);

  // Check all nav items
  const navItems = await page.$$eval('.mobile-nav-item', items => 
    items.map(item => ({
      text: item.textContent.trim(),
      view: item.dataset.view,
      isActive: item.classList.contains('active')
    }))
  );
  console.log('\nNav items:', navItems);

  console.log('\n=== Screenshot with Sidebar Open ===\n');
  await page.screenshot({ path: '/home/porygon/.openclaw/workspace/mobile-sidebar-test.png' });
  console.log('Screenshot saved to /home/porygon/.openclaw/workspace/mobile-sidebar-test.png');

  await browser.close();

  console.log('\n=== Test Complete ===');
})();