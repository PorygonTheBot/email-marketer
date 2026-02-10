/**
 * UI E2E tests with Playwright
 * Run with: npx playwright test tests/e2e/ui.test.js
 */

const { test: playwrightTest, expect, describe } = require('@playwright/test');

const BASE_URL = 'http://localhost:3080';

describe('Email Marketer Desktop UI', () => {
  playwrightTest('should load dashboard', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#dashboard-view')).toBeVisible();
  });

  playwrightTest('should show stats cards', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('.stat-card').first()).toBeVisible();
  });

  playwrightTest('should navigate to contacts', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-view="contacts"]');
    await expect(page.locator('#contacts-view')).toBeVisible();
  });

  playwrightTest('should show add contact modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-view="contacts"]');
    await page.click('button:has-text("Add Contact")');
    await expect(page.locator('#contact-modal')).toBeVisible();
  });

  playwrightTest('should navigate between all views', async ({ page }) => {
    await page.goto(BASE_URL);

    const views = ['contacts', 'lists', 'templates', 'campaigns', 'settings', 'dashboard'];
    for (const view of views) {
      await page.click(`[data-view="${view}"]`);
      await expect(page.locator(`#${view}-view`)).toBeVisible();
    }
  });
});

describe('Email Marketer Mobile UI', () => {
  playwrightTest.use({ viewport: { width: 375, height: 667 } });

  playwrightTest('should load on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#dashboard-view')).toBeVisible();
  });

  playwrightTest('should navigate on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-view="contacts"]');
    await expect(page.locator('#contacts-view')).toBeVisible();
  });

  playwrightTest('should show forms on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-view="contacts"]');
    await page.click('button:has-text("Add Contact")');
    await expect(page.locator('#contact-modal')).toBeVisible();
    await expect(page.locator('#contact-email')).toBeVisible();
  });

  playwrightTest('should show lists grid on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-view="lists"]');
    await expect(page.locator('#lists-grid')).toBeVisible();
  });

  playwrightTest('should show templates grid on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-view="templates"]');
    await expect(page.locator('#templates-grid')).toBeVisible();
  });

  playwrightTest('should show campaigns table on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-view="campaigns"]');
    await expect(page.locator('#campaigns-list')).toBeVisible();
  });
});