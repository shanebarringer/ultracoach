import { expect, test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Use UI login for reliability
  await page.goto('/auth/signin')

  // Wait for form elements
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 30000 })
  await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 30000 })

  // Fill credentials
  await page.fill('input[type="email"]', 'alex.rivera@ultracoach.dev')
  await page.fill('input[type="password"]', 'RunnerPass2025!')

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

  // Navigate to runner dashboard if not there
  if (!page.url().includes('/dashboard/runner')) {
    await page.goto('/dashboard/runner')
    await page.waitForURL(/\/dashboard\/runner/, { timeout: 30000 })
  }

  // Wait for dashboard content - be flexible with selectors
  const dashboardIndicators = [
    page.locator('text=Base Camp Dashboard'),
    page.locator('h1:has-text("Base Camp Dashboard")'),
    page.locator('[data-testid="runner-dashboard"]'),
    page.locator('text=Your Training'),
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
    throw new Error('Runner dashboard did not load properly')
  }

  // Verify we're on runner dashboard
  await expect(page).toHaveURL(/\/dashboard\/runner/)

  // Save authenticated state to file
  await page.context().storageState({ path: authFile })
})
