import { type Page, expect } from '@playwright/test'

// Test user credentials (consistent with comprehensive seed script)
export const TEST_USERS = {
  coach: {
    email: 'emma@ultracoach.dev',
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
 * Navigate directly to user's dashboard (assumes authentication is already set up)
 */
export async function navigateToDashboard(page: Page, userType: TestUserType) {
  const user = TEST_USERS[userType]

  // Navigate directly to dashboard (authentication handled by storage state)
  await page.goto(user.expectedDashboard)

  // Wait for dashboard URL (removed networkidle - causes CI hangs)
  await page.waitForURL(new RegExp(user.expectedDashboard), { timeout: 30000 })

  // Wait for any loading states to complete
  const loadingText = page.locator('text=Loading your base camp..., text=Loading dashboard...')
  try {
    await expect(loadingText).not.toBeVisible({ timeout: 10000 })
  } catch {
    // Loading text may not appear, continue
  }

  // Verify we're on the correct dashboard
  await expect(page).toHaveURL(new RegExp(user.expectedDashboard))

  // Brief wait for content to stabilize
  await page.waitForTimeout(1000)
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

  // Wait for DOM to be loaded (removed networkidle - causes CI hangs)
  await page.waitForLoadState('domcontentloaded')

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
