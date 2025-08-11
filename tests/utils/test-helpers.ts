import { type Page, expect } from '@playwright/test'

// Test user credentials (consistent with comprehensive seed script)
export const TEST_USERS = {
  coach: {
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'coach',
    expectedDashboard: '/dashboard/coach',
  },
  coach2: {
    email: 'marcus@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'coach',
    expectedDashboard: '/dashboard/coach',
  },
  runner: {
    email: 'alex.rivera@ultracoach.dev',
    password: 'RunnerPass2025!',
    role: 'runner',
    expectedDashboard: '/dashboard/runner',
  },
  runner2: {
    email: 'riley.parker@ultracoach.dev',
    password: 'RunnerPass2025!',
    role: 'runner',
    expectedDashboard: '/dashboard/runner',
  },
} as const

export type TestUserType = keyof typeof TEST_USERS

/**
 * Login helper function with proper error handling and waiting
 */
export async function loginAsUser(page: Page, userType: TestUserType) {
  const user = TEST_USERS[userType]

  // Navigate to signin page
  await page.goto('/auth/signin')

  // Wait for page to be fully loaded
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()

  // Fill credentials
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for successful redirect
  await expect(page).toHaveURL(new RegExp(user.expectedDashboard))

  // Wait for any loading states to complete
  const loadingText = page.locator('text=Loading your base camp..., text=Loading dashboard...')
  if (await loadingText.isVisible()) {
    await expect(loadingText).not.toBeVisible({ timeout: 20000 })
  }

  // Verify we're logged in by checking for dashboard navigation
  // Since the dashboard might still be loading data, let's check for navigation which loads faster
  await expect(page.locator('nav, [role="navigation"]')).toBeVisible({ timeout: 10000 })

  // Also verify URL still matches (in case of redirect issues)
  await expect(page).toHaveURL(new RegExp(user.expectedDashboard))
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Click on user avatar/menu
  await page.click('[data-testid="user-menu"], .user-menu, button:has(img)')

  // Click logout
  await page.click('text=Sign Out, button:has-text("Sign Out")')

  // Verify we're logged out
  await expect(page).toHaveURL('/')
}

/**
 * Wait for application to be ready
 */
export async function waitForAppReady(page: Page) {
  // Wait for main app container to be visible
  await expect(page.locator('body')).toBeVisible()

  // Wait for any loading states to complete
  await page.waitForLoadState('networkidle', { timeout: 30000 })

  // Wait a bit more for any dynamic content
  await page.waitForTimeout(1000)
}

/**
 * Common page navigation with proper waiting
 */
export async function navigateAndWait(page: Page, url: string) {
  await page.goto(url)
  await waitForAppReady(page)
}

/**
 * Check for and dismiss any modals or overlays
 */
export async function dismissModals(page: Page) {
  // Look for common modal close buttons
  const closeSelectors = [
    '[data-testid="modal-close"]',
    '.modal-close',
    'button:has-text("Close")',
    'button:has-text("×")',
    '[aria-label="Close"]',
  ]

  for (const selector of closeSelectors) {
    const closeButton = page.locator(selector)
    if (await closeButton.isVisible()) {
      await closeButton.click()
      await page.waitForTimeout(500)
    }
  }
}

/**
 * Assert user is authenticated and on correct dashboard
 */
export async function assertAuthenticated(page: Page, userType: TestUserType) {
  const user = TEST_USERS[userType]

  // Check URL matches expected dashboard
  await expect(page).toHaveURL(new RegExp(user.expectedDashboard))

  // Wait for page to stabilize and any immediate redirects
  await page.waitForTimeout(2000)

  // Final verification - ensure we're still on dashboard URL (not redirected back to signin)
  await expect(page).toHaveURL(new RegExp(user.expectedDashboard))
}

/**
 * Fill form fields with proper waiting
 */
export async function fillFormField(page: Page, selector: string, value: string) {
  const field = page.locator(selector)
  await expect(field).toBeVisible()
  await field.fill(value)

  // Verify the value was set
  await expect(field).toHaveValue(value)
}

/**
 * Submit form and wait for response
 */
export async function submitForm(page: Page, submitSelector = 'button[type="submit"]') {
  const submitButton = page.locator(submitSelector)
  await expect(submitButton).toBeVisible()
  await expect(submitButton).toBeEnabled()

  await submitButton.click()

  // Wait for any loading states
  await page.waitForTimeout(1000)
}
