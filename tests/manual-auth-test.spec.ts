import { expect, test } from '@playwright/test'

test.describe('Manual Authentication Test', () => {
  test('should login successfully and redirect to correct dashboard', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/signin')

    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('input[type="email"]', { state: 'visible' })

    console.log('🧪 Testing login with testrunner@ultracoach.dev')

    // Fill email
    await page.fill('input[type="email"]', 'testrunner@ultracoach.dev')

    // Fill password
    await page.fill('input[type="password"]', 'password123')

    // Submit form and wait for navigation
    await Promise.all([
      page.waitForURL(/dashboard\/runner/, { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ])

    console.log('✅ Successfully logged in and redirected to runner dashboard')

    // Verify we're on the runner dashboard
    await expect(page).toHaveURL(/dashboard\/runner/)

    // Take a screenshot for verification
    await page.screenshot({ path: 'successful-runner-login.png' })
  })

  test('should login coach successfully and redirect to coach dashboard', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/signin')

    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('input[type="email"]', { state: 'visible' })

    console.log('🧪 Testing login with testcoach@ultracoach.dev')

    // Fill email
    await page.fill('input[type="email"]', 'testcoach@ultracoach.dev')

    // Fill password
    await page.fill('input[type="password"]', 'password123')

    // Submit form and wait for navigation
    await Promise.all([
      page.waitForURL(/dashboard\/coach/, { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ])

    console.log('✅ Successfully logged in and redirected to coach dashboard')

    // Verify we're on the coach dashboard
    await expect(page).toHaveURL(/dashboard\/coach/)

    // Take a screenshot for verification
    await page.screenshot({ path: 'successful-coach-login.png' })
  })
})
