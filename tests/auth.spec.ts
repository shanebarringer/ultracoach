import { expect, test } from '@playwright/test'

import {
  assertAuthenticated,
  loginAsUser,
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
    await loginAsUser(page, 'runner')
    await assertAuthenticated(page, 'runner')
    await expect(page.locator('h1')).toContainText('Base Camp Dashboard')
  })

  test('should redirect to dashboard after successful coach login', async ({ page }) => {
    await loginAsUser(page, 'coach')
    await assertAuthenticated(page, 'coach')
    await expect(page.locator('h1')).toContainText('Base Camp Dashboard')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await navigateAndWait(page, '/auth/signin')

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')

    // Click sign in
    await page.click('button[type="submit"]')

    // Wait for error state
    await page.waitForTimeout(2000)

    // Should show error message (check for error state in input field or error message)
    const hasErrorAttribute = await page.locator('input[type="email"]').getAttribute('aria-invalid')
    const hasErrorMessage = await page
      .locator('text=Invalid credentials, text=error, .error-message')
      .isVisible()

    expect(hasErrorAttribute === 'true' || hasErrorMessage).toBeTruthy()
  })
})

test.describe('Landing Page', () => {
  test('should display landing page with proper navigation', async ({ page }) => {
    await page.goto('/')

    // Check main heading
    await expect(page.locator('h1')).toContainText('Conquer Your Peaks')

    // Check navigation links
    await expect(page.locator('a[href="/auth/signin"]')).toBeVisible()
    await expect(page.locator('a[href="/auth/signup"]')).toBeVisible()
  })

  test('should navigate to signin page from landing page', async ({ page }) => {
    await page.goto('/')

    // Click sign in button
    await page.click('a[href="/auth/signin"]')

    // Should navigate to signin page
    await expect(page).toHaveURL('/auth/signin')
  })
})
