import { expect, test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/coach.json')

setup('authenticate as coach', async ({ page }) => {
  // Navigate to signin page
  await page.goto('/auth/signin')

  // Wait for page to be fully loaded
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 30000 })

  // Fill credentials for coach user
  await page.fill('input[type="email"]', 'marcus@ultracoach.dev')
  await page.fill('input[type="password"]', 'UltraCoach2025!')

  // Wait for React to hydrate and form to be ready
  await page.waitForLoadState('networkidle', { timeout: 60000 })
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 30000 })

  // Submit the form
  await page.click('button[type="submit"]', { timeout: 30000 })

  // Wait for redirect to coach dashboard (loading message may not appear for direct login)
  await expect(page).toHaveURL(/\/dashboard\/coach/, { timeout: 180000 })

  // Wait for dashboard content to stabilize
  await page.waitForLoadState('networkidle', { timeout: 60000 })

  // Wait for any loading states to complete
  const loadingText = page.locator('text=Loading your base camp..., text=Loading dashboard...')
  if (await loadingText.isVisible()) {
    await expect(loadingText).not.toBeVisible({ timeout: 60000 })
  }

  // Ensure we have essential dashboard content loaded
  await expect(page.locator('body')).toBeVisible({ timeout: 30000 })

  // Wait for any dynamic content to stabilize
  await page.waitForTimeout(5000)

  // Verify we're authenticated by checking we're still on coach dashboard
  await expect(page).toHaveURL(/\/dashboard\/coach/)

  // Save authenticated coach state to file
  await page.context().storageState({ path: authFile })
})
