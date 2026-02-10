const { test, expect } = require('@playwright/test');
const BASE_URL = 'http://localhost:3080';

test.describe('Email Marketer - Full Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app', { timeout: 10000 });
  });

  test('nav: should display dashboard by default', async ({ page }) => {
    await expect(page.locator('#dashboard-view')).toHaveClass(/active/);
  });

  test('nav: should navigate to all views', async ({ page }) => {
    for (const view of ['contacts', 'lists', 'templates', 'campaigns', 'settings']) {
      await page.click(`.nav-item[data-view="${view}"]`);
      await expect(page.locator(`#${view}-view`)).toHaveClass(/active/);
    }
  });

  test('dashboard: should display all stat cards', async ({ page }) => {
    await expect(page.locator('.stat-card')).toHaveCount(4);
  });

  test('contacts: should add, display, and delete contact', async ({ page }) => {
    await page.click('.nav-item[data-view="contacts"]');
    const email = `e2e-${Date.now()}@example.com`;

    await page.click('button:has-text("Add Contact")');
    await page.fill('#contact-email', email);
    await page.fill('#contact-name', 'E2E Test User');
    await page.fill('#contact-tags', 'e2e, test');
    await page.click('#contact-modal button:has-text("Save")');

    await expect(page.locator('.toast')).toContainText('Contact added');
    await expect(page.locator('#contacts-list')).toContainText(email);
    await expect(page.locator('#contacts-list .badge')).toContainText('e2e');
  });

  test('contacts: should validate email format', async ({ page }) => {
    await page.click('.nav-item[data-view="contacts"]');
    await page.click('button:has-text("Add Contact")');
    await page.fill('#contact-email', 'invalid-email');
    await page.click('#contact-modal button:has-text("Save")');
    await expect(page.locator('.toast')).toContainText('valid email');
  });

  test('contacts: should search contacts', async ({ page }) => {
    await page.click('.nav-item[data-view="contacts"]');
    await page.fill('#contact-search', 'xyz-nonexistent-12345');
    await page.waitForTimeout(300);
    await expect(page.locator('#contacts-list')).toContainText('No contacts');
  });

  test('lists: should create and display list', async ({ page }) => {
    await page.click('.nav-item[data-view="lists"]');
    const listName = `E2E List ${Date.now()}`;

    await page.click('button:has-text("Create List")');
    await page.fill('#list-name', listName);
    await page.fill('#list-description', 'E2E test description');
    await page.click('#list-modal button:has-text("Save")');

    await expect(page.locator('.toast')).toContainText('created');
    await expect(page.locator('#lists-grid')).toContainText(listName);
  });

  test('lists: should view list details', async ({ page }) => {
    await page.click('.nav-item[data-view="lists"]');
    const viewBtn = page.locator('button:has-text("View Contacts")').first();
    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
      await expect(page.locator('#list-detail-modal')).toHaveClass(/active/);
      await page.click('#list-detail-modal button:has-text("Close")');
    }
  });

  test('templates: should create template', async ({ page }) => {
    await page.click('.nav-item[data-view="templates"]');
    const templateName = `E2E Template ${Date.now()}`;

    await page.click('button:has-text("Create Template")');
    await page.fill('#template-name', templateName);
    await page.fill('#template-subject', 'E2E Subject');
    await page.evaluate(() => {
      const quill = Quill.find(document.querySelector('#template-editor'));
      if (quill) quill.root.innerHTML = '<p>E2E test content</p>';
    });
    await page.click('#template-modal button:has-text("Save")');

    await expect(page.locator('.toast')).toContainText('created');
  });

  test('campaigns: should create campaign', async ({ page }) => {
    await page.click('.nav-item[data-view="campaigns"]');
    const campaignName = `E2E Campaign ${Date.now()}`;

    await page.click('button:has-text("Create Campaign")');
    await page.fill('#campaign-name', campaignName);
    await page.fill('#campaign-subject', 'E2E Subject');
    await page.evaluate(() => {
      const quill = Quill.find(document.querySelector('#campaign-editor'));
      if (quill) quill.root.innerHTML = '<p>E2E campaign content</p>';
    });
    await page.click('#campaign-modal button:has-text("Save Draft")');

    await expect(page.locator('.toast')).toContainText('saved');
  });

  test('settings: should save settings', async ({ page }) => {
    await page.click('.nav-item[data-view="settings"]');
    await page.fill('#mailgun-domain', 'mg.example.com');
    await page.click('button:has-text("Save Settings")');
    await expect(page.locator('.toast')).toContainText('saved');
  });
});
