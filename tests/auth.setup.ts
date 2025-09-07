import { expect, test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Use UI login for reliability
  const baseUrl = process.env.CI ? 'http://localhost:3001' : ''
  await page.goto(`${baseUrl}/auth/signin`)

  // Wait for page to be fully loaded including CSS
  await page.waitForLoadState('domcontentloaded')

  // Wait for CSS to load by checking for a styled element - check for Base Camp Access text
  await page.waitForSelector('text="Base Camp Access"', { state: 'visible', timeout: 30000 })

  // Wait for form elements with more specific selectors
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 30000 })
  await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 30000 })

  // Fill credentials using more specific selectors
  await page.locator('input[type="email"]').fill('alex.rivera@ultracoach.dev')
  await page.locator('input[type="password"]').fill('RunnerPass2025!')

  // Submit form - look for the specific button text and ensure it's ready
  const submitButton = page.getByRole('button', { name: /Begin Your Expedition/i })
  await expect(submitButton).toBeVisible()
  await expect(submitButton).toBeEnabled()

  // Try clicking with force option in case there's an overlay
  await submitButton.click({ force: true })

  // Wait a moment for form submission to process
  await page.waitForTimeout(2000)

  // Check if we have any error messages
  const errorElement = page.locator('text=/Invalid|incorrect|failed/i')
  if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
    const errorText = await errorElement.textContent()
    console.log('Login error detected:', errorText)
  }

  // Wait for navigation after form submission - using best practices
  // Try different URL patterns in case the runner redirects differently
  await page.waitForURL(/\/(dashboard|welcome|home)/, {
    timeout: 60000,
    waitUntil: 'domcontentloaded',
  })

  // Ensure we're on the runner dashboard
  if (!page.url().includes('/dashboard/runner')) {
    await page.goto('/dashboard/runner')
    await page.waitForURL('**/dashboard/runner', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })
  }

  // Wait for dashboard content using best practices
  // Simply verify we're on a dashboard URL
  await page.waitForTimeout(2000) // Give dashboard time to load

  // Final verification
  await expect(page).toHaveURL(/dashboard\/runner/)

  // Wait a moment to ensure all cookies are set
  await page.waitForTimeout(1000)

  // Save authenticated state to file
  await page.context().storageState({ path: authFile })
})
