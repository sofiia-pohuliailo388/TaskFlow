import { test, expect } from '@playwright/test'

const EMAIL = `tasks_${Date.now()}@example.com`
const PASSWORD = 'TestPass123'

async function registerAndLogin(page) {
  await page.goto('/register')
  await page.fill('input[name="name"]', 'Task User')
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/tasks/)
}

async function createTask(page, title, priority = 'medium') {
  await page.click('button:has-text("New task")')
  await page.fill('#task-title', title)
  await page.selectOption('#task-priority', priority)
  await page.click('button[type="submit"]')
  await expect(page.locator(`text=${title}`).first()).toBeVisible()
}

test.describe('US-03 — Create a Task', () => {
  test('creates task with correct status and priority', async ({ page }) => {
    await registerAndLogin(page)
    await createTask(page, 'Buy groceries', 'high')

    const card = page.locator('article').filter({ hasText: 'Buy groceries' })
    await expect(card.locator('text=To Do')).toBeVisible()
    await expect(card.locator('text=High')).toBeVisible()
  })
})

test.describe('US-04 — Status Transitions', () => {
  test('moves task through all statuses', async ({ page }) => {
    await registerAndLogin(page)
    await createTask(page, 'Status Flow Test')

    const card = page.locator('article').filter({ hasText: 'Status Flow Test' })
    await card.locator('button:has-text("In Progress")').click()
    await expect(card.locator('text=In Progress')).toBeVisible()

    await card.locator('button:has-text("Done")').click()
    await expect(card.locator('text=Done')).toBeVisible()
    await expect(card.locator('text=Task complete')).toBeVisible()
  })
})

test.describe('US-05 — Filter by Status', () => {
  test('filters show correct tasks', async ({ page }) => {
    await registerAndLogin(page)
    await createTask(page, 'Task A')
    await createTask(page, 'Task B')

    // Move Task B to In Progress
    const cardB = page.locator('article').filter({ hasText: 'Task B' })
    await cardB.locator('button:has-text("In Progress")').click()

    // Filter by In Progress
    await page.click('button:has-text("In Progress")')
    await expect(page.locator('text=Task B')).toBeVisible()
    await expect(page.locator('text=Task A')).not.toBeVisible()

    // Back to All
    await page.click('button:has-text("All")')
    await expect(page.locator('text=Task A')).toBeVisible()
    await expect(page.locator('text=Task B')).toBeVisible()
  })
})

test.describe('US-06 — Subtasks', () => {
  test('adds and completes subtasks', async ({ page }) => {
    await registerAndLogin(page)
    await createTask(page, 'Project X')

    const card = page.locator('article').filter({ hasText: 'Project X' })
    await card.locator('button:has-text("Edit")').click()
    await page.click('[class*="tab"]:has-text("Subtasks")')

    // Add subtask
    await page.fill('[placeholder="New subtask…"]', 'Write tests')
    await page.click('button:has-text("Add")')
    await expect(page.locator('text=Write tests')).toBeVisible()

    // Complete it
    await page.locator('input[type="checkbox"]').first().check()
    await expect(page.locator('[class*="done"]:has-text("Write tests")')).toBeVisible()
  })
})

test.describe('US-07 — Attachments', () => {
  test('adds a link attachment to a task', async ({ page }) => {
    await registerAndLogin(page)
    await createTask(page, 'Design Work')

    const card = page.locator('article').filter({ hasText: 'Design Work' })
    await card.locator('button:has-text("Edit")').click()
    await page.click('[class*="tab"]:has-text("Attachments")')

    await page.fill('[placeholder="Label (e.g. Design doc)"]', 'Design doc')
    await page.fill('[placeholder="https://..."]', 'https://drive.google.com/file/d/example')
    await page.click('button:has-text("Add")')

    await expect(page.locator('text=Design doc')).toBeVisible()
    await expect(page.locator('text=📂')).toBeVisible()
  })
})

test.describe('US-10 — Delete Task', () => {
  test('deletes task after confirmation', async ({ page }) => {
    await registerAndLogin(page)
    await createTask(page, 'Temp Task')

    const card = page.locator('article').filter({ hasText: 'Temp Task' })
    await card.locator('button:has-text("✕")').click()
    await expect(card.locator('button:has-text("Delete")')).toBeVisible()
    await card.locator('button:has-text("Delete")').click()

    await expect(page.locator('text=Temp Task')).not.toBeVisible()
  })
})
