import { type Page, expect } from '@playwright/test'

// Timeout configuration - CI needs longer timeouts
export const TEST_TIMEOUTS = {
  short: process.env.CI ? 5000 : 3000,
  medium: process.env.CI ? 10000 : 5000,
  long: process.env.CI ? 30000 : 15000,
  extraLong: process.env.CI ? 45000 : 30000,
}

// Centralized test credentials - use these instead of hard-coding
export const TEST_COACH_EMAIL = process.env.TEST_COACH_EMAIL ?? 'emma@ultracoach.dev'
export const TEST_COACH_PASSWORD = process.env.TEST_COACH_PASSWORD ?? 'UltraCoach2025!'
export const TEST_RUNNER_EMAIL = process.env.TEST_RUNNER_EMAIL ?? 'alex.rivera@ultracoach.dev'
export const TEST_RUNNER_PASSWORD = process.env.TEST_RUNNER_PASSWORD ?? 'RunnerPass2025!'
export const TEST_RUNNER2_EMAIL = 'riley.parker@ultracoach.dev'
export const TEST_RUNNER2_PASSWORD = process.env.TEST_RUNNER2_PASSWORD ?? 'RunnerPass2025!'

// Test user credentials (from environment variables or defaults)
export const TEST_USERS = {
  coach: {
    email: TEST_COACH_EMAIL,
    password: TEST_COACH_PASSWORD,
    role: 'coach',
    expectedDashboard: '/dashboard/coach',
  },
  runner: {
    email: TEST_RUNNER_EMAIL,
    password: TEST_RUNNER_PASSWORD,
    role: 'runner',
    expectedDashboard: '/dashboard/runner',
  },
  runner2: {
    email: TEST_RUNNER2_EMAIL,
    password: TEST_RUNNER2_PASSWORD,
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

  // Navigate to dashboard (middleware doesn't check cookies, page-level auth handles it)
  await page.goto(user.expectedDashboard)

  // Wait for dashboard URL (removed networkidle - causes CI hangs)
  await page.waitForURL(new RegExp(user.expectedDashboard), { timeout: 30000 })

  // Wait for Suspense boundary to resolve by checking for dashboard content
  const dashboardTestId =
    userType === 'coach'
      ? '[data-testid="coach-dashboard-content"]'
      : '[data-testid="runner-dashboard-content"]'

  // Wait for the dashboard content to be visible (indicates Suspense resolved)
  await expect(page.locator(dashboardTestId)).toBeVisible({ timeout: 30000 })

  // Wait for any loading states to complete
  const loadingIndicators = [
    page.getByText('Loading your base camp...'),
    page.getByText('Loading dashboard...'),
    page.getByText('Loading...'),
  ]

  for (const indicator of loadingIndicators) {
    try {
      await expect(indicator).not.toBeVisible({ timeout: 5000 })
    } catch {
      // Loading text may not appear or already hidden, continue
    }
  }

  // Verify we're on the correct dashboard
  await expect(page).toHaveURL(new RegExp(user.expectedDashboard))
}

/**
 * Logout helper function with improved selector reliability
 */
export async function logout(page: Page) {
  // Try multiple user menu selectors
  const userMenuSelectors = [
    '[data-testid="user-menu"]',
    '.user-menu',
    'button:has(img[alt*="avatar"])',
    'button[aria-label*="user"]',
  ]

  let menuClicked = false
  for (const selector of userMenuSelectors) {
    try {
      const menu = page.locator(selector).first()
      await expect(menu).toBeVisible({ timeout: 2000 })
      await menu.click()
      menuClicked = true
      break
    } catch {
      continue
    }
  }

  if (!menuClicked) {
    throw new Error('Could not find user menu to initiate logout')
  }

  // Click logout button with multiple selector strategies
  const logoutButton = page
    .getByRole('button', { name: /sign out/i })
    .or(page.getByRole('menuitem', { name: /sign out/i }))
    .or(page.getByText('Sign Out'))

  await expect(logoutButton).toBeVisible({ timeout: 10000 })
  await logoutButton.click()

  // Verify we're logged out
  await expect(page).toHaveURL('/', { timeout: 10000 })
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
 * Simple auth verification - check if we can access session endpoint
 * Returns session data if authenticated, null if not
 */
export async function verifyAuthState(
  page: Page
): Promise<{ user?: { email: string; id: string; role?: string } } | null> {
  try {
    const baseUrl =
      process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3001'
    const response = await page.request.get(`${baseUrl}/api/auth/session`, {
      timeout: TEST_TIMEOUTS.medium,
    })

    if (!response.ok()) {
      // Log for debugging but don't throw - unauthenticated is a valid state
      if (process.env.DEBUG_TESTS) {
        console.log(`Auth verification failed: HTTP ${response.status()}`)
      }
      return null
    }

    const sessionData = await response.json().catch(() => null)

    if (!sessionData || !sessionData.user || !sessionData.user.email) {
      if (process.env.DEBUG_TESTS) {
        console.log('Auth verification failed: Invalid session data', sessionData)
      }
      return null
    }

    return sessionData
  } catch (error) {
    if (process.env.DEBUG_TESTS) {
      console.error('Auth verification error:', error)
    }
    return null
  }
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

/**
 * Safely parse a date string with multiple fallback strategies.
 * Returns null for unparseable dates instead of throwing errors.
 *
 * @param dateText - Date string in various formats (ISO, locale, etc.)
 * @returns Parsed Date object or null if unparseable
 */
export function parseDateSafely(dateText: string): Date | null {
  try {
    // Import parseISO from date-fns for ISO date parsing
    const { parseISO } = require('date-fns')

    // Try multiple date parsing strategies
    let date = parseISO(dateText)
    if (isNaN(date.getTime())) {
      date = new Date(dateText)
    }

    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * Test configuration constants for workout display validation
 */
export const WORKOUT_TEST_LIMITS = {
  /** Maximum number of workouts to analyze in tests for performance */
  MAX_WORKOUTS_TO_ANALYZE: 15,
  /** Maximum gap allowed between same-date workouts (for different workout types) */
  MAX_SAME_DATE_WORKOUT_GAP: 3,
} as const
