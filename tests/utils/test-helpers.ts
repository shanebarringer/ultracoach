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
 * Ensure authentication cookies are loaded from storageState context and verify they work.
 *
 * CRITICAL: Playwright loads storageState cookies asynchronously, but Next.js Server Components
 * need cookies immediately when calling requireAuth(). This helper synchronizes the timing
 * by explicitly forcing cookie loading and verifying the Better Auth session cookie exists.
 *
 * This prevents race conditions where server-side auth checks happen before cookies are available,
 * causing redirects to /auth/signin despite valid authentication state.
 *
 * ⚠️ WARNING: The page must have performed a navigation (e.g., page.goto or equivalent) before
 * calling this function. The function uses page.evaluate(() => fetch()) to verify the session
 * and relies on cookies being available in the page context.
 *
 * @param page - Playwright page instance (must have navigated to establish page context)
 * @param baseUrl - Optional base URL for CHIPS-partitioned cookie support
 * @param expectedCookieName - Exact cookie name to verify (default: 'better-auth.session_token')
 * @throws Error if Better Auth session cookie is not working after retries
 */
export async function ensureAuthCookiesLoaded(
  page: Page,
  baseUrl?: string,
  expectedCookieName = 'better-auth.session_token'
): Promise<void> {
  // CI needs more retries and longer delays for session API to stabilize after auth setup
  // Timeout configuration: 4 retries * 2000ms = 8s delays + (4 * 10s fetch) = ~48s max
  // This fits within 60s test timeout with buffer for navigation/rendering
  const maxRetries = process.env.CI ? 4 : 5
  const retryDelay = process.env.CI ? 2000 : 500

  // CRITICAL: Wait for app to be fully ready before verifying session
  // Poll health endpoint to ensure database and Better Auth are initialized
  // This prevents wasted retry attempts when app is still starting up
  try {
    const healthReady = await page.evaluate(async () => {
      const maxHealthRetries = 6 // 6 attempts * 5s = 30s max
      for (let i = 0; i < maxHealthRetries; i++) {
        try {
          const response = await fetch('/api/health/database', {
            signal: AbortSignal.timeout(5000), // 5s timeout per attempt
          })
          if (response.ok) return true
        } catch {
          // Health check failed, wait and retry
        }
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
      return false
    })

    if (!healthReady) {
      throw new Error('Health check failed - database not ready after 30s')
    }
  } catch {
    // Health check failed - but continue anyway and let session verification handle it
    // This ensures tests don't fail if health endpoint has issues
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Force cookie loading from context
    // Pass URL for CHIPS-partitioned cookie support if provided
    const cookies = baseUrl
      ? await page.context().cookies([baseUrl])
      : await page.context().cookies()

    // Verify Better Auth session cookie exists with exact name match
    const sessionCookie = cookies.find(cookie => cookie.name === expectedCookieName)

    if (sessionCookie) {
      /**
       * CRITICAL: Active verification that cookies work with server-side authentication.
       *
       * Why we verify instead of using fixed timeouts:
       * - Fixed timeouts (500ms, 1000ms, etc.) are unreliable in CI environments
       * - Browser HTTP stack cookie propagation timing varies by system load
       * - No Playwright API exists to confirm cookies are attached to HTTP headers
       *
       * Verification approach:
       * - Make test request to /api/auth/get-session with 10s timeout to verify cookies work
       * - Retry up to 10 times in CI (5 locally) with fixed delay (5000ms CI, 500ms local)
       * - Each fetch has 10s timeout to prevent indefinite hangs on slow/unresponsive API
       * - Gives session API up to 50s in CI to stabilize (10 retries * 5s delay)
       * - Only proceed when server confirms valid session
       * - Fails fast if authentication is broken (10s timeout vs 30s navigation timeout)
       *
       * Benefits over fixed timeout approach:
       * - Works reliably across different CI environments and system loads
       * - Catches authentication issues immediately (not after 30s navigation timeout)
       * - No guesswork about timing - we verify cookies actually work
       */
      try {
        // Get base URL from page context (Playwright automatically uses page's base URL)
        // Use page.evaluate to make fetch call from within page context where cookies are guaranteed available
        // CRITICAL: 10s timeout prevents indefinite hangs on slow/unresponsive API in CI
        const sessionData = await page.evaluate(async () => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

          try {
            const response = await fetch('/api/auth/get-session', {
              credentials: 'same-origin',
              signal: controller.signal,
            })
            clearTimeout(timeoutId)

            if (!response.ok) {
              throw new Error(`Session API returned ${response.status}`)
            }
            return response.json()
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        })

        if (sessionData?.session?.userId) {
          // Session verified - cookies are working!
          return
        }

        // Session API didn't return valid session - retry
        if (attempt < maxRetries) {
          await page.waitForTimeout(retryDelay)
          continue
        }
      } catch {
        // Network error or API failure - retry
        if (attempt < maxRetries) {
          await page.waitForTimeout(retryDelay)
          continue
        }
      }
    }

    // Cookie not found or session verification failed - wait and retry
    if (attempt < maxRetries) {
      await page.waitForTimeout(retryDelay)
    }
  }

  // If we get here, cookies are not available or not working
  const allCookies = baseUrl
    ? await page.context().cookies([baseUrl])
    : await page.context().cookies()
  throw new Error(
    `Better Auth session cookie "${expectedCookieName}" not working after ${maxRetries} attempts. ` +
      `Available cookies: ${allCookies.map(c => c.name).join(', ')}. ` +
      `Session verification via /api/auth/get-session failed.`
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

  // Navigate to dashboard - cookies are immediately available via programmatic injection in auth setup
  await page.goto(user.expectedDashboard)

  // Wait for dashboard URL using pathname comparison (RegExp won't work with full URL including origin)
  await page.waitForURL(
    url => {
      const pathname = new URL(url).pathname
      return pathname === user.expectedDashboard
    },
    { timeout: 30000 }
  )

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

  // Verify we're on the correct dashboard (pathname-based to allow query params)
  await expect(page).toHaveURL(url => new URL(url).pathname === user.expectedDashboard, {
    timeout: TEST_TIMEOUTS.long,
  })
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
 * Authenticate a user via Better Auth API (not UI forms).
 *
 * This is the recommended approach for E2E testing with Better Auth:
 * - Bypasses UI form complexity and timing issues
 * - Matches the proven pattern from auth.setup.ts
 * - 10x faster than UI form interactions
 * - More reliable error messages from direct API responses
 *
 * @param page - Playwright page instance
 * @param email - User email address
 * @param password - User password
 * @param baseUrl - Optional base URL (defaults to E2E_BASE_URL or localhost:3001)
 * @returns Authentication response with ok status and body
 * @throws Error if authentication fails after all retries
 */
export async function authenticateViaAPI(
  page: Page,
  email: string,
  password: string,
  baseUrl?: string
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const authUrl = baseUrl || process.env.E2E_BASE_URL || 'http://localhost:3001'

  // Use same retry logic as auth.setup.ts for reliability
  const MAX_AUTH_RETRIES = 3
  const BASE_RETRY_DELAY = 1000

  let authResponse: { ok: boolean; status: number; body: unknown } | null = null
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      // CRITICAL: Use page.evaluate(() => fetch()) to run in browser context
      // This ensures cookies attach to the page's context, not an isolated request context
      const authResult = await page.evaluate<{
        ok: boolean
        status: number
        body: unknown
      }>(
        async ({ apiUrl, userEmail, userPassword }) => {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ email: userEmail, password: userPassword }),
          })
          return {
            ok: response.ok,
            status: response.status,
            body: response.ok ? await response.json() : await response.text(),
          }
        },
        {
          apiUrl: `${authUrl}/api/auth/sign-in/email`,
          userEmail: email,
          userPassword: password,
        }
      )

      authResponse = authResult

      // Success - cookies are set automatically by fetch() in browser context
      if (authResponse.ok) {
        return authResponse
      }

      // Non-500 errors (like 401) should fail immediately - no retry
      if (authResponse.status !== 500) {
        const bodyText =
          typeof authResponse.body === 'string'
            ? authResponse.body
            : JSON.stringify(authResponse.body)
        throw new Error(
          `Authentication failed with status ${authResponse.status}: ${bodyText.slice(0, 200)}`
        )
      }

      // 500 error - prepare for retry
      const bodyText =
        typeof authResponse.body === 'string'
          ? authResponse.body
          : JSON.stringify(authResponse.body)
      lastError = new Error(
        `Auth API returned 500 on attempt ${attempt}: ${bodyText.slice(0, 100)}`
      )
    } catch (error) {
      lastError = error as Error
    }

    // Wait before retry (except on last attempt)
    if (attempt < MAX_AUTH_RETRIES) {
      await page.waitForTimeout(BASE_RETRY_DELAY * attempt)
    }
  }

  // Exhausted all retries
  const finalError = lastError || new Error('Authentication failed after all retries')
  throw new Error(`Authentication failed after ${MAX_AUTH_RETRIES} attempts: ${finalError.message}`)
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
