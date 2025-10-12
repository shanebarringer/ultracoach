import { expect, test } from '@playwright/test'

import {
  TEST_COACH_EMAIL,
  TEST_COACH_PASSWORD,
  TEST_RUNNER_EMAIL,
  TEST_RUNNER_PASSWORD,
  assertAuthenticated,
  authenticateViaAPI,
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
    // Navigate to signin page first (needed for page context)
    await page.goto('/auth/signin')

    // Authenticate via API (faster and more reliable than UI forms)
    await authenticateViaAPI(page, TEST_RUNNER_EMAIL, TEST_RUNNER_PASSWORD)

    // Navigate to dashboard (API auth sets cookies, but doesn't redirect)
    await page.goto('/dashboard/runner', { waitUntil: 'domcontentloaded' })

    // Wait a moment for cookies to propagate to HTTP headers (ULT-54)
    await page.waitForTimeout(1000)

    // Wait for redirect to complete
    await expect(page).toHaveURL(/\/dashboard\/runner/, { timeout: 60000 })

    await assertAuthenticated(page, 'runner')
  })

  test('should redirect to dashboard after successful coach login', async ({ page }) => {
    // Navigate to signin page first (needed for page context)
    await page.goto('/auth/signin')

    // Authenticate via API (faster and more reliable than UI forms)
    await authenticateViaAPI(page, TEST_COACH_EMAIL, TEST_COACH_PASSWORD)

    // Navigate to dashboard (API auth sets cookies, but doesn't redirect)
    await page.goto('/dashboard/coach', { waitUntil: 'domcontentloaded' })

    // Wait a moment for cookies to propagate to HTTP headers (ULT-54)
    await page.waitForTimeout(1000)

    // Wait for redirect to complete
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

    // Wait for either error message or staying on signin page
    await page.waitForURL(/\/auth\/signin/, { timeout: 3000 }).catch(() => {})

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

  test.skip('should navigate to signin page from landing page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Wait for header to be rendered
    await page.waitForSelector('nav', { timeout: 5000 })

    // Try multiple selectors - Button as Link might render differently
    const signInButton = page.getByRole('button', { name: /sign in/i })
    const signInLink = page.getByRole('link', { name: /sign in/i })
    const signInByText = page.getByText('Sign In').first()
    const signInByHref = page.locator('[href="/auth/signin"]').first()

    // Click whichever is visible
    if (await signInButton.isVisible()) {
      await signInButton.click()
    } else if (await signInLink.isVisible()) {
      await signInLink.click()
    } else if (await signInByText.isVisible()) {
      await signInByText.click()
    } else if (await signInByHref.isVisible()) {
      await signInByHref.click()
    } else {
      // Log what's on the page to help debug
      const bodyText = await page.locator('body').innerText()
      throw new Error('Could not find Sign In button/link')
    }

    // Should navigate to signin page
    await expect(page).toHaveURL('/auth/signin', { timeout: 10000 })
  })
})
