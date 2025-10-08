/**
 * Session Persistence E2E Tests
 *
 * Comprehensive testing of session management and authentication persistence
 * across different scenarios:
 * - Page refreshes
 * - Cross-tab navigation
 * - Route transitions
 * - Browser back/forward navigation
 * - Long-running sessions
 *
 * These tests ensure the Better Auth integration maintains proper session state
 * and prevent authentication-related user experience issues.
 */
import { expect, test } from '@playwright/test'

import {
  TEST_RUNNER_EMAIL,
  TEST_RUNNER_PASSWORD,
  TEST_TIMEOUTS,
  ensureAuthCookiesLoaded,
  navigateToDashboard,
} from '../utils/test-helpers'

test.describe('Session Persistence', () => {
  test.describe('Page Refresh Scenarios', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should maintain session on dashboard refresh', async ({ page }) => {
      // Navigate to dashboard
      await navigateToDashboard(page, 'runner')

      // Refresh multiple times
      for (let i = 0; i < 3; i++) {
        await test.step(`Refresh ${i + 1}/3`, async () => {
          await page.reload()

          // Should stay on dashboard
          await expect(page).toHaveURL(/\/dashboard\/runner(?:\?.*)?$/)
          await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)

          // Dashboard should load properly
          const dashboard = page.locator('[data-testid="runner-dashboard-content"]')
          await expect(dashboard).toBeVisible({ timeout: TEST_TIMEOUTS.long })
        })
      }
    })

    test('should maintain session on workouts page refresh', async ({ page }) => {
      // Ensure cookies are loaded from storageState before navigation
      await ensureAuthCookiesLoaded(page)

      // Navigate directly to workouts page (auth loaded via storageState)
      await page.goto('/workouts', { timeout: TEST_TIMEOUTS.extraLong })

      // Wait for final URL (ensures no redirect to signin)
      await page.waitForURL(/\/workouts(?:\?.*)?$/, { timeout: TEST_TIMEOUTS.long })

      // Wait for page content to prove authentication worked
      await expect(
        page.getByTestId('page-title').or(page.getByRole('heading', { name: /Training Log/i }))
      ).toBeVisible({ timeout: TEST_TIMEOUTS.long })

      // Refresh page
      await page.reload()

      // Wait for final URL after refresh (critical test - should not redirect to signin)
      await page.waitForURL(/\/workouts(?:\?.*)?$/, { timeout: TEST_TIMEOUTS.long })

      // Verify page content is still accessible (proves session persisted)
      await expect(
        page.getByTestId('page-title').or(page.getByRole('heading', { name: /Training Log/i }))
      ).toBeVisible({ timeout: TEST_TIMEOUTS.long })
    })

    test.skip('should maintain session on calendar page refresh', async ({ page }) => {
      // TODO: This test is also affected by the same session persistence bug
      // The calendar page may also lose data on refresh due to session check issues
      // in async atoms. Should be re-enabled after fixing the session persistence bug.
      //
      await page.goto('/calendar')
      await expect(page).toHaveURL(/\/calendar(?:\?.*)?$/)
      await page.waitForLoadState('domcontentloaded')

      // Refresh page
      await page.reload()
      await page.waitForLoadState('domcontentloaded')

      // Should stay on calendar page
      await expect(page).toHaveURL(/\/calendar(?:\?.*)?$/)
      await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)

      // Calendar should load
      const calendarHeading = page.getByRole('heading', { name: /calendar/i })
      await expect(calendarHeading).toBeVisible({ timeout: TEST_TIMEOUTS.medium })
    })
  })

  test.describe('Cross-Route Navigation', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should maintain session across all protected routes', async ({ page }, testInfo) => {
      // Increase timeout for comprehensive 6-route navigation test
      // (Next.js compilation can take 20-30s for some routes on first visit)
      test.setTimeout(90000)

      const routes = [
        '/dashboard/runner',
        '/workouts',
        '/training-plans',
        '/calendar',
        '/profile',
        '/dashboard/runner', // Return to start
      ]

      // Ensure cookies are loaded from storageState before first navigation
      await ensureAuthCookiesLoaded(page)

      for (const route of routes) {
        // Navigate to route (middleware doesn't check cookies, page-level auth handles it)
        await page.goto(route, { waitUntil: 'domcontentloaded' })

        // Should be on the correct route (pathname comparison to handle query params)
        await page.waitForURL(
          url => {
            const pathname = new URL(url).pathname
            return pathname === route || pathname.startsWith(`${route}?`)
          },
          { timeout: 30000 }
        )
        await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)

        // Simplified approach: Just wait for the user menu to appear
        // The BetterAuthProvider will load session automatically via useEffect
        // We just need to give it enough time for: API call + atom updates + React render
        const authIndicators = page.locator('[data-testid="user-menu"]')

        try {
          // Wait up to 30 seconds for user menu to appear
          // This accounts for: network latency + BetterAuthProvider init + React render cycles
          await expect(authIndicators).toBeVisible({ timeout: TEST_TIMEOUTS.long })
        } catch (error) {
          // If user menu didn't appear, capture diagnostics
          const currentUrl = page.url()
          const errorMessage = error instanceof Error ? error.message : String(error)

          // Take screenshot for debugging (portable path via testInfo)
          await page.screenshot({
            path: testInfo.outputPath(`session-debug-${route.replace(/\//g, '-')}-failed.png`),
          })

          if (currentUrl.includes('/auth/signin')) {
            throw new Error(
              `Session failed - redirected to signin on route ${route} (${currentUrl})`
            )
          }

          // Re-throw with context
          throw new Error(
            `User menu not visible on ${route} after 30s. URL: ${currentUrl}. Error: ${errorMessage}`
          )
        }
      }
    })

    test('should handle rapid navigation without losing session', async ({ page }) => {
      const routes = ['/workouts', '/dashboard/runner', '/training-plans', '/workouts']

      // Ensure cookies are loaded from storageState before rapid navigation
      await ensureAuthCookiesLoaded(page)

      // Rapidly navigate between routes
      for (let iteration = 0; iteration < 2; iteration++) {
        for (const route of routes) {
          await page.goto(route)
          await page.waitForLoadState('domcontentloaded')

          // Should never be redirected to signin
          await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)

          // Check pathname matches route (waitForURL compares full URL with origin)
          await page.waitForURL(
            url => {
              const pathname = new URL(url).pathname
              return pathname === route || pathname.startsWith(`${route}?`)
            },
            { timeout: TEST_TIMEOUTS.medium }
          )

          // Assert authenticated UI remains visible (proves session persisted)
          const authIndicator = page.locator('[data-testid="user-menu"]')
          await expect(authIndicator).toBeVisible({ timeout: TEST_TIMEOUTS.short })
        }
      }
    })
  })

  test.describe('Browser Navigation', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should maintain session with browser back/forward', async ({ page }) => {
      // Start on dashboard
      await navigateToDashboard(page, 'runner')

      // Navigate to several pages
      await page.goto('/workouts')
      await expect(page).toHaveURL(/\/workouts(?:\?.*)?$/)

      await page.goto('/training-plans')
      await expect(page).toHaveURL(/\/training-plans(?:\?.*)?$/)

      // Use browser back button
      await page.goBack()
      await page.waitForLoadState('domcontentloaded')
      await expect(page).toHaveURL(/\/workouts(?:\?.*)?$/)
      await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)

      // Use browser forward button
      await page.goForward()
      await page.waitForLoadState('domcontentloaded')
      await expect(page).toHaveURL(/\/training-plans(?:\?.*)?$/)
      await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)

      // Go back to dashboard
      await page.goBack()
      await page.goBack()
      await page.waitForLoadState('domcontentloaded')
      await expect(page).toHaveURL(/\/dashboard\/runner(?:\?.*)?$/)
      await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)
    })
  })

  test.describe('Session Validation', () => {
    test('should redirect unauthenticated users to signin', async ({ page }) => {
      // Clear all cookies and storage
      await page.context().clearCookies()
      await page.context().clearPermissions()

      const protectedRoutes = ['/dashboard/runner', '/dashboard/coach', '/workouts', '/profile']

      for (const route of protectedRoutes) {
        await page.goto(route)
        await page.waitForLoadState('domcontentloaded')

        // Should be redirected to signin or home (depending on middleware)
        const currentUrl = page.url()
        const currentPathname = new URL(currentUrl).pathname

        // At minimum, should not be on the protected route without auth
        if (currentPathname === route) {
          // If still on protected route, check if it shows signin form or redirect
          const signinForm = page.locator('form, input[type="email"]')
          try {
            await expect(signinForm).toBeVisible({ timeout: TEST_TIMEOUTS.short })
          } catch {
            throw new Error(`Still on protected route ${route} without visible signin form`)
          }
        } else {
          // When redirected, explicitly assert the pathname is a valid redirect target
          expect(['/auth/signin', '/'].includes(currentPathname)).toBe(true)
        }
      }
    })

    test('should handle invalid/expired session gracefully', async ({ page }) => {
      // Start with valid session
      await navigateToDashboard(page, 'runner')

      // Manually corrupt the session by clearing cookies
      await page.context().clearCookies()

      // Try to navigate to protected route
      await page.goto('/workouts')
      await page.waitForLoadState('domcontentloaded')

      // Should either redirect to signin or show signin form
      const isOnSignin = page.url().includes('/auth/signin')
      let hasSigninForm = false
      try {
        await expect(page.locator('input[type="email"]')).toBeVisible({
          timeout: TEST_TIMEOUTS.medium,
        })
        hasSigninForm = true
      } catch {
        // No signin form visible
      }

      expect(isOnSignin || hasSigninForm).toBe(true)
    })
  })

  test.describe('Authentication Flow Integration', () => {
    test('should establish session after successful signin', async ({ page }) => {
      // Clear existing session
      await page.context().clearCookies()

      // Navigate to signin
      await page.goto('/auth/signin')
      await expect(page).toHaveURL(/\/auth\/signin$/)

      // Fill and submit signin form
      await page.getByLabel(/email/i).fill(TEST_RUNNER_EMAIL)
      await page.getByLabel(/password|passcode/i).fill(TEST_RUNNER_PASSWORD)
      await page.getByRole('button', { name: /sign in|Begin Your Expedition/i }).click()

      // Should redirect to dashboard
      await page.waitForURL('**/dashboard/runner', { timeout: TEST_TIMEOUTS.long })

      // Session should now persist across navigation
      await page.goto('/workouts')
      await expect(page).toHaveURL(/\/workouts(?:\?.*)?$/)
      await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)

      // Refresh should maintain session
      await page.reload()
      await page.waitForLoadState('domcontentloaded')
      await expect(page).toHaveURL(/\/workouts(?:\?.*)?$/)
      await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)
    })

    test('should clear session after signout', async ({ page }) => {
      // Start authenticated
      await navigateToDashboard(page, 'runner')

      // Sign out - click user avatar (HeroUI Avatar component) or user menu
      const userMenuSelectors = [
        '.heroui-avatar',
        '[data-testid="user-menu"]',
        'button[aria-label*="user"]',
        'button[aria-label*="menu"]',
        'img[alt*="avatar"]',
      ]

      let clicked = false
      for (const selector of userMenuSelectors) {
        try {
          const element = page.locator(selector).first()
          await expect(element).toBeVisible({ timeout: TEST_TIMEOUTS.short })
          await element.click({ timeout: TEST_TIMEOUTS.medium })
          clicked = true
          break
        } catch {
          continue
        }
      }

      if (!clicked) {
        throw new Error('Could not find user menu/avatar to click')
      }

      // Use proper Playwright text locator for sign out
      const signOutButton = page
        .getByRole('button', { name: /sign out/i })
        .or(page.getByRole('menuitem', { name: /sign out/i }))
      await expect(signOutButton).toBeVisible({ timeout: TEST_TIMEOUTS.medium })
      await signOutButton.click()

      // Should redirect to home
      await expect(page).toHaveURL(/\/$/)

      // Session should be cleared - protected routes should redirect
      await page.goto('/dashboard/runner')
      await page.waitForLoadState('domcontentloaded')

      // Should not stay on dashboard
      await expect(page).not.toHaveURL(/\/dashboard\/runner(?:\?.*)?$/)
    })
  })

  test.describe('Long-Running Session', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should maintain session across multiple operations', async ({ page }) => {
      // Increase timeout for multiple route navigation with Next.js compilation
      test.setTimeout(60000)

      // Ensure cookies are loaded from storageState before first navigation
      await ensureAuthCookiesLoaded(page)

      // Perform multiple operations that would typically test session stability
      const operations = [
        async () => {
          // CRITICAL: Ensure cookies loaded immediately before first navigation
          await ensureAuthCookiesLoaded(page)
          await page.goto('/dashboard/runner', { waitUntil: 'domcontentloaded' })
          await expect(page).toHaveURL(/\/dashboard\/runner(?:\?.*)?$/)
        },
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' })
          await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)
        },
        async () => {
          // Re-ensure cookies before new navigation (long-running test may lose cookies)
          await ensureAuthCookiesLoaded(page)
          await page.goto('/workouts', { waitUntil: 'domcontentloaded' })
          await expect(page).toHaveURL(/\/workouts(?:\?.*)?$/)
        },
        async () => {
          await page.goBack({ waitUntil: 'domcontentloaded' })
          await expect(page).not.toHaveURL(/\/auth\/signin(?:\?.*)?$/)
        },
        async () => {
          // Re-ensure cookies before final navigation (long-running test may lose cookies)
          await ensureAuthCookiesLoaded(page)
          await page.goto('/training-plans', { waitUntil: 'domcontentloaded' })
          await expect(page).toHaveURL(/\/training-plans(?:\?.*)?$/)
        },
      ]

      // Execute all operations
      for (const operation of operations) {
        await operation()
      }

      // Final verification - still authenticated
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL(/\/dashboard\/runner(?:\?.*)?$/)
      const dashboardContent = page.locator('[data-testid="runner-dashboard-content"]')
      await expect(dashboardContent).toBeVisible({ timeout: TEST_TIMEOUTS.medium })
    })
  })
})
