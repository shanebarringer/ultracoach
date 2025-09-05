import { expect, test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Use UI login for reliability
  const baseUrl = process.env.CI ? 'http://localhost:3001' : ''
  await page.goto(`${baseUrl}/auth/signin`)

  // Wait for page to be fully loaded including CSS
  await page.waitForLoadState('domcontentloaded')

  // Wait for CSS to load by checking for a styled element
  await page.waitForSelector('h1:has-text("UltraCoach")', { state: 'visible', timeout: 30000 })

  // Wait for form elements with more specific selectors
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 30000 })
  await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 30000 })

  // Fill credentials using more specific selectors
  await page.locator('input[type="email"]').fill('alex.rivera@ultracoach.dev')
  await page.locator('input[type="password"]').fill('RunnerPass2025!')

  // Submit form - look for the specific button text
  const submitButton = page.getByRole('button', { name: /Begin Your Expedition/i })
  await submitButton.click()

  // Wait for navigation after form submission - using best practices
  await page.waitForURL('**/dashboard/**', {
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
  // Look for the welcome message that confirms authentication
  const welcomeMessage = page.locator('text=/Welcome back.*Alex Rivera/i')
  await expect(welcomeMessage).toBeVisible({ timeout: 10000 })

  // Final verification
  await expect(page).toHaveURL(/dashboard\/runner/)

  // Wait a moment to ensure all cookies are set
  await page.waitForTimeout(1000)

  // Save authenticated state to file
  await page.context().storageState({ path: authFile })
})
