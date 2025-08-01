import { Page, expect, test } from '@playwright/test'

test.describe('Dashboard Functionality', () => {
  // Helper function to login
  async function loginAsRunner(page: Page) {
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', 'testrunner@ultracoach.dev')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard\/runner/)
  }

  async function loginAsCoach(page: Page) {
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', 'testcoach@ultracoach.dev')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard\/coach/)
  }

  test('runner dashboard should display training plans', async ({ page }) => {
    await loginAsRunner(page)

    // Check dashboard elements
    await expect(page.locator('h1')).toContainText('Base Camp Dashboard')
    await expect(page.locator('[data-testid="training-plans-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="upcoming-workouts-section"]')).toBeVisible()

    // Check metrics
    await expect(page.locator('[data-testid="active-plans-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="upcoming-workouts-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="this-week-count"]')).toBeVisible()
  })

  test('coach dashboard should display runners', async ({ page }) => {
    await loginAsCoach(page)

    // Check dashboard elements
    await expect(page.locator('h1')).toContainText('Summit Dashboard')
    await expect(page.locator('[data-testid="runners-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="recent-activity-section"]')).toBeVisible()

    // Check metrics
    await expect(page.locator('[data-testid="total-runners-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-plans-count"]')).toBeVisible()
  })

  test('should navigate to training plans page', async ({ page }) => {
    await loginAsRunner(page)

    // Click training plans navigation
    await page.click('a[href="/training-plans"]')

    // Should navigate to training plans page
    await expect(page).toHaveURL('/training-plans')
    await expect(page.locator('h1')).toContainText('Training Plans')
  })

  test('should navigate to workouts page', async ({ page }) => {
    await loginAsRunner(page)

    // Click workouts navigation
    await page.click('a[href="/workouts"]')

    // Should navigate to workouts page
    await expect(page).toHaveURL('/workouts')
    await expect(page.locator('h1')).toContainText('Training Log')
  })

  test('should navigate to chat page', async ({ page }) => {
    await loginAsRunner(page)

    // Click chat navigation
    await page.click('a[href="/chat"]')

    // Should navigate to chat page
    await expect(page).toHaveURL('/chat')
    await expect(page.locator('h1')).toContainText('Base Camp Communications')
  })
})
