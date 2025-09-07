import { expect, test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Use UI login for reliability
  const baseUrl = process.env.CI ? 'http://localhost:3001' : ''
  await page.goto(`${baseUrl}/auth/signin`)

  // Wait for page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // CRITICAL: Wait for React hydration - Required for Next.js apps
  // As per Context7 docs, always wait 2000ms for hydration
  await page.waitForTimeout(2000)

  // Wait for form elements to be visible and ready
  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await passwordInput.waitFor({ state: 'visible', timeout: 30000 })

  // Clear and type into email field (more reliable for React forms)
  await emailInput.click()
  await emailInput.clear()
  await page.keyboard.type('alex.rivera@ultracoach.dev', { delay: 50 })

  // Tab to password field and type
  await page.keyboard.press('Tab')
  await page.keyboard.type('RunnerPass2025!', { delay: 50 })

  // Wait a moment for form state to update
  await page.waitForTimeout(1000)

  // Submit form by pressing Enter
  await page.keyboard.press('Enter')

  // Wait for navigation - use specific dashboard URL pattern
  await page.waitForURL('**/dashboard/**', {
    timeout: 20000,
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
