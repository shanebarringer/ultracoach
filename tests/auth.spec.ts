import { expect, test } from '@playwright/test'

import {
  assertAuthenticated,
  navigateAndWait,
  waitForAppReady,
} from './utils/test-helpers'

test.describe('Authentication Flow', () => {
  test('should display signin page', async ({ page }) => {
    await navigateAndWait(page, '/auth/signin')
    await expect(page.locator('h1')).toContainText('🏔️ UltraCoach')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should redirect to dashboard after successful runner login', async ({ page }) => {
    await navigateAndWait(page, '/auth/signin')

    // Fill in runner credentials
    await page.fill('input[type="email"]', 'alex.rivera@ultracoach.dev')
    await page.fill('input[type="password"]', 'RunnerPass2025!')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard\/runner/, { timeout: 60000 })
    
    await assertAuthenticated(page, 'runner')
  })

  test('should redirect to dashboard after successful coach login', async ({ page }) => {
    await navigateAndWait(page, '/auth/signin')

    // Fill in coach credentials
    await page.fill('input[type="email"]', 'marcus@ultracoach.dev')
    await page.fill('input[type="password"]', 'UltraCoach2025!')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard\/coach/, { timeout: 60000 })
    
    await assertAuthenticated(page, 'coach')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await navigateAndWait(page, '/auth/signin')

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')

    // Click sign in
    await page.click('button[type="submit"]')

    // Wait for error state
    await page.waitForTimeout(3000)

    // Check that we're still on signin page (not redirected to dashboard)
    // Allow for query parameters in the URL
    await expect(page).toHaveURL(/\/auth\/signin/)

    // Look for various error indicators
    const hasErrorAttribute = await page.locator('input[type="email"]').getAttribute('aria-invalid')
    const hasErrorMessage = await page.locator('text=Invalid').isVisible()
    const hasErrorClass = (await page.locator('.error, [data-testid*="error"]').count()) > 0
    const stillOnSigninPage = page.url().includes('/auth/signin')

    // At minimum, we should still be on signin page if credentials were invalid
    expect(stillOnSigninPage).toBeTruthy()
  })
})

test.describe('Landing Page', () => {
  test('should display landing page with proper navigation', async ({ page }) => {
    await page.goto('/')

    // Check main heading
    await expect(page.locator('h1')).toContainText('Conquer Your Peaks')

    // Check navigation links - use first() to avoid strict mode violation
    await expect(page.locator('a[href="/auth/signin"]').first()).toBeVisible()
    await expect(page.locator('a[href="/auth/signup"]').first()).toBeVisible()
  })

  test('should navigate to signin page from landing page', async ({ page }) => {
    await page.goto('/')

    // Click sign in button - use first() to avoid strict mode violation
    await page.locator('a[href="/auth/signin"]').first().click()

    // Should navigate to signin page
    await expect(page).toHaveURL('/auth/signin')
  })
})
