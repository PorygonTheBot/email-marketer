/**
 * Verify Mobile Layout - Automated testing with screenshots
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Test multiple mobile viewports
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
  ];
  
  const results = [];
  
  for (const viewport of viewports) {
    console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})\n`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }
    });
    
    const page = await context.newPage();
    
    // Navigate to app
    await page.goto('http://localhost:3080');
    await page.waitForTimeout(1000);
    
    // Check 1: Dashboard layout
    const dashboardOverflow = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        scrollWidth: html.scrollWidth,
        clientWidth: html.clientWidth,
        hasOverflow: html.scrollWidth > html.clientWidth
      };
    });
    
    console.log(`  Dashboard: ${dashboardOverflow.hasOverflow ? '❌ OVERFLOW' : '✅ OK'}`);
    console.log(`    Scroll: ${dashboardOverflow.scrollWidth}px, Viewport: ${dashboardOverflow.clientWidth}px`);
    
    // Take dashboard screenshot
    await page.screenshot({ 
      path: `/home/porygon/.openclaw/workspace/test-${viewport.name}-dashboard.png`,
      fullPage: false
    });
    
    // Check 2: Sidebar width
    await page.click('.mobile-menu-btn');
    await page.waitForTimeout(500);
    
    const sidebarWidth = await page.evaluate(() => {
      const sidebar = document.getElementById('mobile-sidebar');
      if (!sidebar) return null;
      const rect = sidebar.getBoundingClientRect();
      return {
        width: rect.width,
        viewportWidth: window.innerWidth,
        percentage: (rect.width / window.innerWidth * 100).toFixed(1)
      };
    });
    
    if (sidebarWidth) {
      const isGood = sidebarWidth.percentage < 85;
      console.log(`  Sidebar: ${isGood ? '✅ OK' : '❌ TOO WIDE'}`);
      console.log(`    Width: ${sidebarWidth.width}px (${sidebarWidth.percentage}% of viewport)`);
    }
    
    // Take sidebar screenshot
    await page.screenshot({ 
      path: `/home/porygon/.openclaw/workspace/test-${viewport.name}-sidebar.png`,
      fullPage: false
    });
    
    // Close sidebar
    await page.click('.mobile-sidebar-close');
    await page.waitForTimeout(300);
    
    // Check 3: Stats cards fit
    const statsFit = await page.evaluate(() => {
      const cards = document.querySelectorAll('.stat-card');
      let maxRight = 0;
      cards.forEach(card => {
        maxRight = Math.max(maxRight, card.getBoundingClientRect().right);
      });
      return {
        maxRight,
        viewportWidth: window.innerWidth,
        fits: maxRight <= window.innerWidth
      };
    });
    
    console.log(`  Stats cards: ${statsFit.fits ? '✅ FIT' : '❌ OVERFLOW'}`);
    console.log(`    Max right: ${statsFit.maxRight}px, Viewport: ${statsFit.viewportWidth}px`);
    
    results.push({
      viewport: viewport.name,
      dashboardOverflow: dashboardOverflow.hasOverflow,
      sidebarWidth: sidebarWidth?.percentage,
      statsFit: statsFit.fits
    });
    
    await context.close();
  }
  
  await browser.close();
  
  // Summary
  console.log('\n========================================');
  console.log('  Layout Test Summary');
  console.log('========================================\n');
  
  const allPassed = results.every(r => !r.dashboardOverflow && r.statsFit);
  
  results.forEach(r => {
    const passed = !r.dashboardOverflow && r.statsFit;
    console.log(`${passed ? '✅' : '❌'} ${r.viewport}`);
    console.log(`   Dashboard overflow: ${r.dashboardOverflow ? 'YES' : 'NO'}`);
    console.log(`   Sidebar: ${r.sidebarWidth}%`);
    console.log(`   Stats fit: ${r.statsFit ? 'YES' : 'NO'}`);
    console.log('');
  });
  
  console.log(allPassed ? '✅ All tests PASSED' : '❌ Some tests FAILED');
  console.log('\nScreenshots saved to:');
  viewports.forEach(v => {
    console.log(`  - test-${v.name}-dashboard.png`);
    console.log(`  - test-${v.name}-sidebar.png`);
  });
  
  process.exit(allPassed ? 0 : 1);
})();
