/**
 * Mobile Layout Tests - Ensures no horizontal scroll and proper fitting
 */

const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Test with iPhone SE viewport (375px width)
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  
  const page = await context.newPage();
  
  console.log('=== Mobile Layout Tests ===\n');
  console.log('Testing on iPhone SE viewport (375x667)\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, condition, details = '') {
    if (condition) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      if (details) console.log(`   ${details}`);
      failed++;
    }
  }
  
  // Navigate to app
  await page.goto('http://localhost:3080');
  await page.waitForTimeout(1000);
  
  // Test 1: Check for horizontal overflow on Dashboard
  console.log('\n📊 Dashboard Layout\n');
  
  const dashboardOverflow = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlScrollWidth: html.scrollWidth,
      htmlClientWidth: html.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      hasOverflow: html.scrollWidth > html.clientWidth || body.scrollWidth > body.clientWidth
    };
  });
  
  test('No horizontal overflow', !dashboardOverflow.hasOverflow,
    `scrollWidth: ${dashboardOverflow.htmlScrollWidth}, clientWidth: ${dashboardOverflow.htmlClientWidth}`);
  
  // Test 2: Check mobile header fits
  const headerBounds = await page.evaluate(() => {
    const header = document.querySelector('.mobile-header');
    if (!header) return null;
    const rect = header.getBoundingClientRect();
    return { width: rect.width, right: rect.right, viewportWidth: window.innerWidth };
  });
  
  if (headerBounds) {
    test('Mobile header fits viewport', headerBounds.right <= headerBounds.viewportWidth,
      `header right: ${headerBounds.right}, viewport: ${headerBounds.viewportWidth}`);
  } else {
    console.log('⚠️  Mobile header not found');
  }
  
  // Test 3: Check hamburger menu is visible and clickable
  const hamburgerVisible = await page.isVisible('.mobile-menu-btn');
  test('Hamburger menu visible', hamburgerVisible);
  
  const hamburgerBounds = await page.evaluate(() => {
    const btn = document.querySelector('.mobile-menu-btn');
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    return { left: rect.left, width: rect.width };
  });
  
  if (hamburgerBounds) {
    test('Hamburger menu within viewport', hamburgerBounds.left >= 0 && hamburgerBounds.left < 375,
      `left: ${hamburgerBounds.left}`);
  }
  
  // Test 4: Check stats grid layout
  const statsGridBounds = await page.evaluate(() => {
    const grid = document.querySelector('.stats-grid');
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    return { width: rect.width, right: rect.right, viewportWidth: window.innerWidth };
  });
  
  if (statsGridBounds) {
    test('Stats grid fits viewport', statsGridBounds.right <= statsGridBounds.viewportWidth + 1, // Allow 1px tolerance
      `grid right: ${statsGridBounds.right}, viewport: ${statsGridBounds.viewportWidth}`);
  }
  
  // Test 5: Check stat cards don't overflow
  const statCardsOverflow = await page.evaluate(() => {
    const cards = document.querySelectorAll('.stat-card');
    let overflow = false;
    let maxRight = 0;
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      maxRight = Math.max(maxRight, rect.right);
      if (rect.right > window.innerWidth) overflow = true;
    });
    return { overflow, maxRight, viewportWidth: window.innerWidth };
  });
  
  test('Stat cards within viewport', !statCardsOverflow.overflow,
    `max right: ${statCardsOverflow.maxRight}, viewport: ${statCardsOverflow.viewportWidth}`);
  
  // Test 6: Check main content area
  const mainContentBounds = await page.evaluate(() => {
    const main = document.querySelector('.main-content');
    if (!main) return null;
    const rect = main.getBoundingClientRect();
    return { width: rect.width, right: rect.right, viewportWidth: window.innerWidth };
  });
  
  if (mainContentBounds) {
    test('Main content fits viewport', mainContentBounds.right <= mainContentBounds.viewportWidth + 1,
      `content right: ${mainContentBounds.right}, viewport: ${mainContentBounds.viewportWidth}`);
  }
  
  // Test 7: Click hamburger and check sidebar
  console.log('\n☰ Sidebar Menu\n');
  
  await page.click('.mobile-menu-btn');
  await page.waitForTimeout(300);
  
  const sidebarBounds = await page.evaluate(() => {
    const sidebar = document.getElementById('mobile-sidebar');
    if (!sidebar) return null;
    const rect = sidebar.getBoundingClientRect();
    return { width: rect.width, right: rect.right, viewportWidth: window.innerWidth };
  });
  
  if (sidebarBounds) {
    test('Sidebar fits viewport', sidebarBounds.right <= sidebarBounds.viewportWidth,
      `sidebar right: ${sidebarBounds.right}, viewport: ${sidebarBounds.viewportWidth}`);
  }
  
  // Close sidebar
  await page.click('.mobile-sidebar-close');
  await page.waitForTimeout(300);
  
  // Test 8: Navigate to Contacts and check
  console.log('\n👥 Contacts View\n');
  
  await page.click('[data-view="contacts"]');
  await page.waitForTimeout(500);
  
  const contactsOverflow = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      hasOverflow: html.scrollWidth > html.clientWidth || body.scrollWidth > body.clientWidth,
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth
    };
  });
  
  test('Contacts view - no horizontal overflow', !contactsOverflow.hasOverflow,
    `scrollWidth: ${contactsOverflow.scrollWidth}, clientWidth: ${contactsOverflow.clientWidth}`);
  
  // Test 9: Check table container
  const tableBounds = await page.evaluate(() => {
    const table = document.querySelector('.table-container');
    if (!table) return null;
    const rect = table.getBoundingClientRect();
    return { width: rect.width, right: rect.right, viewportWidth: window.innerWidth };
  });
  
  if (tableBounds) {
    test('Table container fits viewport', tableBounds.right <= tableBounds.viewportWidth + 1,
      `table right: ${tableBounds.right}, viewport: ${tableBounds.viewportWidth}`);
  }
  
  // Take screenshots for debugging
  console.log('\n📸 Taking screenshots...\n');
  
  // Dashboard screenshot
  await page.goto('http://localhost:3080');
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: '/home/porygon/.openclaw/workspace/mobile-layout-dashboard.png',
    fullPage: false
  });
  
  // Sidebar open screenshot
  await page.click('.mobile-menu-btn');
  await page.waitForTimeout(300);
  await page.screenshot({ 
    path: '/home/porygon/.openclaw/workspace/mobile-layout-sidebar.png',
    fullPage: false
  });
  
  // Contacts screenshot
  await page.click('.mobile-sidebar-close');
  await page.waitForTimeout(300);
  await page.click('[data-view="contacts"]');
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: '/home/porygon/.openclaw/workspace/mobile-layout-contacts.png',
    fullPage: false
  });
  
  console.log('Screenshots saved:\n');
  console.log('  - mobile-layout-dashboard.png');
  console.log('  - mobile-layout-sidebar.png');
  console.log('  - mobile-layout-contacts.png');
  
  await browser.close();
  
  // Summary
  console.log('\n========================================');
  console.log('  Mobile Layout Test Summary');
  console.log('========================================');
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Layout issues detected!');
    console.log('   Some elements are overflowing the viewport.');
    process.exit(1);
  } else {
    console.log('\n✨ All layout tests passed!');
    console.log('   Mobile layout is properly fitted.');
    process.exit(0);
  }
})();