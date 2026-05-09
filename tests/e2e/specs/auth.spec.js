import { test, expect } from '@playwright/test'

const EMAIL = `e2e_${Date.now()}@example.com`
const PASSWORD = 'TestPass123'
const NAME = 'E2E User'

test.describe('US-01 — Registration', () => {
  test('registers and redirects to /tasks', async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[name="name"]', NAME)
    await page.fill('input[name="email"]', EMAIL)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/tasks/)
    await expect(page.locator('nav')).toContainText(NAME)
  })
})

test.describe('US-02 — Login / Logout', () => {
  test('logs in then signs out', async ({ page }) => {
    // Register first
    await page.goto('/register')
    await page.fill('input[name="name"]', NAME)
    await page.fill('input[name="email"]', EMAIL)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/tasks/)

    // Sign out
    await page.click('button:has-text("Sign out")')
    await expect(page).toHaveURL(/\/login/)

    // Log back in
    await page.fill('input[name="email"]', EMAIL)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/tasks/)
  })
})
