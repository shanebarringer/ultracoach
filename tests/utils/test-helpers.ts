import { type Page, expect } from '@playwright/test'

// Test user credentials (from environment variables or defaults)
export const TEST_USERS = {
  coach: {
    email: process.env.TEST_COACH_EMAIL || 'emma@ultracoach.dev',
    password: process.env.TEST_COACH_PASSWORD || 'Test123!@#',
    role: 'coach',
    expectedDashboard: '/dashboard/coach',
  },
  runner: {
    email: process.env.TEST_RUNNER_EMAIL || 'alex.rivera@ultracoach.dev',
    password: process.env.TEST_RUNNER_PASSWORD || 'Test123!@#',
    role: 'runner',
    expectedDashboard: '/dashboard/runner',
  },
  runner2: {
    email: 'riley.parker@ultracoach.dev',
    password: 'Test123!@#',
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

  // Wait for content to be ready
  await page.waitForLoadState('domcontentloaded')
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

  // Wait for body to be visible as indicator of readiness
  await page.waitForSelector('body', { state: 'visible' })
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
      // Wait for modal to be hidden
      await page.waitForSelector(selector, { state: 'hidden' }).catch(() => {})
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

  // Wait for URL to stabilize
  await page.waitForURL(new RegExp(user.expectedDashboard), { timeout: 5000 })

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

  // Wait for potential navigation or loading states
  await page.waitForLoadState('domcontentloaded')
}
