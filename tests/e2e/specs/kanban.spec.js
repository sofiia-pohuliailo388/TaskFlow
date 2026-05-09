import { test, expect } from '@playwright/test'

const EMAIL = `kanban_${Date.now()}@example.com`
const PASSWORD = 'TestPass123'

async function registerAndLogin(page) {
  await page.goto('/register')
  await page.fill('input[name="name"]', 'Kanban User')
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/tasks/)
}

test.describe('US-09 — Kanban Board', () => {
  test('shows tasks in correct columns', async ({ page }) => {
    await registerAndLogin(page)

    // Create a task
    await page.click('button:has-text("New task")')
    await page.fill('#task-title', 'Kanban Task')
    await page.click('button[type="submit"]')

    // Navigate to Kanban
    await page.click('a:has-text("Kanban")')
    await expect(page).toHaveURL(/\/kanban/)

    // Task should be in To Do column
    const todoColumn = page.locator('[class*="column"]').filter({ hasText: 'To Do' })
    await expect(todoColumn.locator('text=Kanban Task')).toBeVisible()

    // In Progress column should show it after drag or via task list
    const inProgressColumn = page.locator('[class*="column"]').filter({ hasText: 'In Progress' })
    await expect(inProgressColumn.locator('text=Kanban Task')).not.toBeVisible()
  })

  test('new task created from kanban appears in To Do column', async ({ page }) => {
    await registerAndLogin(page)
    await page.goto('/kanban')

    await page.click('button:has-text("New task")')
    await page.fill('#task-title', 'New Kanban Task')
    await page.click('button[type="submit"]')

    const todoColumn = page.locator('[class*="column"]').filter({ hasText: 'To Do' })
    await expect(todoColumn.locator('text=New Kanban Task')).toBeVisible()
  })
})
