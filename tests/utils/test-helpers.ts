import { type Page, expect } from '@playwright/test'
import { parseISO } from 'date-fns'

// Timeout configuration - CI needs longer timeouts
export const TEST_TIMEOUTS = {
  short: process.env.CI ? 5000 : 3000,
  medium: process.env.CI ? 10000 : 5000,
  long: process.env.CI ? 30000 : 15000,
  extraLong: process.env.CI ? 45000 : 30000,
}

/**
 * Ensure authentication cookies are loaded from storageState context.
 *
 * CRITICAL: Playwright loads storageState cookies asynchronously, but Next.js Server Components
 * need cookies immediately when calling requireAuth(). This helper synchronizes the timing
 * by explicitly forcing cookie loading and verifying the Better Auth session cookie exists.
 *
 * This prevents race conditions where server-side auth checks happen before cookies are available,
 * causing redirects to /auth/signin despite valid authentication state.
 *
 * @param page - Playwright page instance
 * @param baseUrl - Optional base URL for CHIPS-partitioned cookie support
 * @param expectedCookieName - Exact cookie name to verify (default: 'better-auth.session_token')
 * @throws Error if Better Auth session cookie is not found after retries
 */
export async function ensureAuthCookiesLoaded(
  page: Page,
  baseUrl?: string,
  expectedCookieName = 'better-auth.session_token'
): Promise<void> {
  const maxRetries = 3
  const retryDelay = process.env.CI ? 500 : 200

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Force cookie loading from context
    // Pass URL for CHIPS-partitioned cookie support if provided
    const cookies = baseUrl
      ? await page.context().cookies([baseUrl])
      : await page.context().cookies()

    // Verify Better Auth session cookie exists with exact name match
    const sessionCookie = cookies.find(cookie => cookie.name === expectedCookieName)

    if (sessionCookie) {
      // Cookie found - add small buffer for browser processing
      await page.waitForTimeout(process.env.CI ? 200 : 100)
      return
    }

    // Cookie not found - wait and retry
    if (attempt < maxRetries) {
      await page.waitForTimeout(retryDelay)
    }
  }

  // If we get here, cookies are not available
  const allCookies = baseUrl
    ? await page.context().cookies([baseUrl])
    : await page.context().cookies()
  throw new Error(
    `Better Auth session cookie "${expectedCookieName}" not found after ${maxRetries} attempts. ` +
      `Available cookies: ${allCookies.map(c => c.name).join(', ')}`
  )
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

  // CRITICAL: Ensure cookies are loaded from storageState before navigation
  // This prevents race conditions with server-side auth checks
  await ensureAuthCookiesLoaded(page)

  // Navigate to dashboard (middleware doesn't check cookies, page-level auth handles it)
  await page.goto(user.expectedDashboard)

  // Wait for dashboard URL (removed networkidle - causes CI hangs)
  // Anchor the RegExp to prevent matching longer URLs
  await page.waitForURL(new RegExp(`^${user.expectedDashboard}(?:\\?.*)?$`), { timeout: 30000 })

  // Wait for Suspense boundary to resolve by checking for dashboard content
  const dashboardTestId =
    userType === 'coach'
      ? '[data-testid="coach-dashboard-content"]'
      : '[data-testid="runner-dashboard-content"]'

  // Wait for the dashboard content to be visible (indicates Suspense resolved)
  await expect(page.locator(dashboardTestId)).toBeVisible({ timeout: 30000 })

  // Wait for any loading states to complete
  const loadingText = page.locator('text=Loading your base camp..., text=Loading dashboard...')
  try {
    await expect(loadingText).not.toBeVisible({ timeout: 5000 })
  } catch {
    // Loading text may not appear, continue
  }

  // Verify we're on the correct dashboard
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

/**
 * Safely parse a date string with multiple fallback strategies.
 * Returns null for unparseable dates instead of throwing errors.
 *
 * @param dateText - Date string in various formats (ISO, locale, etc.)
 * @returns Parsed Date object or null if unparseable
 */
export function parseDateSafely(dateText: string): Date | null {
  try {
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
