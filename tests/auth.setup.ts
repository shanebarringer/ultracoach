import { expect, test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Navigate to signin page
  await page.goto('/auth/signin')

  // Wait for page to be fully loaded with generous CI timeout
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 30000 })

  // Fill credentials for test runner
  await page.fill('input[type="email"]', 'alex.rivera@ultracoach.dev')
  await page.fill('input[type="password"]', 'RunnerPass2025!')

  // Wait for React to hydrate and form to be ready
  await page.waitForLoadState('networkidle', { timeout: 60000 })
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 30000 })

  // Submit the form with extended timeout for CI
  await page.click('button[type="submit"]', { timeout: 30000 })

  // Wait for successful redirect with very long timeout for CI compilation
  await expect(page).toHaveURL(/\/dashboard\/runner/, { timeout: 120000 })

  // Wait for dashboard content to load
  const loadingText = page.locator('text=Loading your base camp..., text=Loading dashboard...')
  if (await loadingText.isVisible()) {
    await expect(loadingText).not.toBeVisible({ timeout: 60000 })
  }

  // Ensure we have essential dashboard content loaded
  await expect(page.locator('body')).toBeVisible({ timeout: 30000 })

  // Wait for any dynamic content to stabilize
  await page.waitForTimeout(5000)

  // Verify we're authenticated by checking we're still on dashboard
  await expect(page).toHaveURL(/\/dashboard\/runner/)

  // Save authenticated state to file
  await page.context().storageState({ path: authFile })
})
