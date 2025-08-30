import { expect, test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/coach.json')

setup('authenticate as coach', async ({ page }) => {
  // Use UI login for reliability
  await page.goto('/auth/signin')

  // Wait for form elements
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 30000 })
  await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 30000 })

  // Fill credentials
  await page.fill('input[type="email"]', 'emma@ultracoach.dev')
  await page.fill('input[type="password"]', 'UltraCoach2025!')

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for navigation after form submission
  await page.waitForURL(
    url => {
      const path = new URL(url).pathname
      return path.includes('/dashboard') || path === '/'
    },
    { timeout: 60000 }
  )

  // Navigate to coach dashboard if not there
  if (!page.url().includes('/dashboard/coach')) {
    await page.goto('/dashboard/coach')
    await page.waitForURL(/\/dashboard\/coach/, { timeout: 30000 })
  }

  // Wait for dashboard content - be flexible with selectors
  const dashboardIndicators = [
    page.locator('text=Summit Dashboard'),
    page.locator('h1:has-text("Summit Dashboard")'),
    page.locator('[data-testid="coach-dashboard"]'),
    page.locator('text=Your Athletes'),
  ]

  // Wait for at least one dashboard indicator
  let dashboardLoaded = false
  for (const indicator of dashboardIndicators) {
    try {
      await indicator.waitFor({ state: 'visible', timeout: 5000 })
      dashboardLoaded = true
      break
    } catch {
      // Try next indicator
    }
  }

  if (!dashboardLoaded) {
    throw new Error('Coach dashboard did not load properly')
  }

  // Verify we're on coach dashboard
  await expect(page).toHaveURL(/\/dashboard\/coach/)

  // Save authenticated state to file
  await page.context().storageState({ path: authFile })
})
