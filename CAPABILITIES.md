# AI Assistant Capabilities Reference

This document records discovered capabilities for the AI assistant working on this project.

## CLI Tool Access

**Discovered:** 2026-02-15

### What I Can Do
- Install npm packages globally: `npm install -g <package>`
- Install packages locally in /tmp: `cd /tmp && npm install <package>`
- Run CLI tools via npx: `npx <tool>`
- Run shell commands: `exec` tool gives bash access

### Verified Working

#### Playwright Browser Automation
```bash
# Install
npm install -g @playwright/cli
cd /tmp && npm install @playwright/test
npx playwright install chromium

# Use in scripts
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  console.log(await page.title());
  await browser.close();
})();
"
```

**Result:** ✅ Successfully launched browser, navigated, extracted data

### What This Enables

#### Better Than web_fetch:
- Execute JavaScript on pages (SPAs, React apps)
- Fill out forms and submit them
- Click buttons and interact with elements
- Wait for dynamic content to load
- Extract data from complex sites
- Take screenshots

#### Use Cases:
- Scrape booking sites for live pricing
- Check availability calendars
- Fill quote forms and get estimates
- Test web applications
- Generate PDFs from web pages

### Limitations
- Still sandboxed (no local network access)
- Headless browsers only (no GUI)
- Subject to bot detection/blocking
- Slower than APIs (10-30 seconds per page)
- May get rate limited or blocked

### When to Use

| Task | Best Tool | Why |
|------|-----------|-----|
| Simple page fetch | web_fetch | Fast, reliable |
| Search | web_search | Optimized for search |
| Dynamic/JS-heavy site | Playwright | Can execute JS |
| Form filling | Playwright | Can interact |
| Screenshots | Playwright | Renders full page |

### Example: Research Hotel Prices

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to booking site
  await page.goto('https://www.booking.com/hotel/ie/example.html');
  
  // Wait for price to load
  await page.waitForSelector('.prco-valign-middle-helper');
  
  // Extract price
  const price = await page.$eval('.prco-valign-middle-helper', el => el.textContent);
  console.log('Price:', price);
  
  await browser.close();
})();
```

### Remember
- Install in `/tmp` for temporary use
- Use `npx` to run without global install
- Browser binaries persist after install
- Check if tools are already installed before reinstalling
