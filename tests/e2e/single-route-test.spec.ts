import { expect, test } from '@playwright/test'

import { TEST_TIMEOUTS, ensureAuthCookiesLoaded } from '../utils/test-helpers'

test.use({ storageState: './playwright/.auth/runner.json' })

// Parameterized route tests - reduces duplication and improves maintainability
const routesToTest = [
  { route: '/dashboard/runner', name: 'runner-home' },
  { route: '/training-plans', name: 'plans-page' },
]

test.describe.parallel('Protected route access verification', () => {
  routesToTest.forEach(({ route, name }) => {
    test(`should show user menu on ${name}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'load' })

      // Ensure auth cookies are loaded after navigation
      await ensureAuthCookiesLoaded(page, new URL(page.url()).origin)

      // Log diagnostic info using Playwright's test.info()
      const cookies = await page.context().cookies()
      const sessionCookie = cookies.find(c => c.name === 'better-auth.session_token')
      test.info().attach('cookie-diagnostic', {
        body: JSON.stringify(
          {
            testName: `${name}-test`,
            route,
            totalCookies: cookies.length,
            sessionCookiePresent: !!sessionCookie,
            sessionCookieValue: sessionCookie
              ? `${sessionCookie.value.substring(0, 20)}...`
              : 'NONE',
            allCookieNames: cookies.map(c => c.name),
          },
          null,
          2
        ),
        contentType: 'application/json',
      })

      const userMenu = page.locator('[data-testid="user-menu"]')
      await expect(userMenu).toBeVisible({ timeout: TEST_TIMEOUTS.long })
    })
  })
})
