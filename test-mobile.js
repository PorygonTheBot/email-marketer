const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 } // iPhone SE
  });
  const page = await context.newPage();

  console.log('=== Testing Mobile UI ===\n');

  // Navigate to the app
  await page.goto('http://localhost:3080');

  // Check if mobile header is visible
  const mobileHeader = await page.$('.mobile-header');
  const isMobileHeaderVisible = await page.isVisible('.mobile-header');
  console.log('Mobile header visible:', isMobileHeaderVisible);

  // Check if hamburger button is visible
  const hamburgerBtn = await page.$('.mobile-menu-btn');
  const isHamburgerVisible = await page.isVisible('.mobile-menu-btn');
  console.log('Hamburger button visible:', isHamburgerVisible);

  // Check hamburger button position
  const hamburgerBox = await hamburgerBtn.boundingBox();
  if (hamburgerBox) {
    console.log('Hamburger button position:', hamburgerBox);
  }

  // Check mobile title position
  const title = await page.$('.mobile-title');
  const titleBox = await title.boundingBox();
  if (titleBox) {
    console.log('Title position:', titleBox);
  }

  // Check if mobile sidebar exists
  const mobileSidebar = await page.$('.mobile-sidebar');
  console.log('Mobile sidebar exists:', !!mobileSidebar);

  // Check if bottom nav is visible
  const bottomNav = await page.$('.mobile-bottom-nav');
  const isBottomNavVisible = await page.isVisible('.mobile-bottom-nav');
  console.log('Bottom nav visible:', isBottomNavVisible);

  console.log('\n=== Screenshot ===\n');
  await page.screenshot({ path: '/home/porygon/.openclaw/workspace/mobile-test.png' });
  console.log('Screenshot saved to /home/porygon/.openclaw/workspace/mobile-test.png');

  await browser.close();

  console.log('\n=== Test Complete ===');
})();