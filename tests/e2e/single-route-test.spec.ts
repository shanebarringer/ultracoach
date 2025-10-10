import { expect, test } from '@playwright/test'

import { TEST_TIMEOUTS, ensureAuthCookiesLoaded } from '../utils/test-helpers'

test.use({ storageState: './playwright/.auth/runner.json' })

test('dashboard should show user menu', async ({ page }) => {
  await page.goto('/dashboard/runner', { waitUntil: 'load' })

  // Ensure auth cookies are loaded after navigation
  await ensureAuthCookiesLoaded(page, new URL(page.url()).origin)

  // Log diagnostic info using Playwright's test.info()
  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find(c => c.name === 'better-auth.session_token')
  test.info().attach('cookie-diagnostic', {
    body: JSON.stringify(
      {
        testName: 'dashboard-test',
        totalCookies: cookies.length,
        sessionCookiePresent: !!sessionCookie,
        sessionCookieValue: sessionCookie ? `${sessionCookie.value.substring(0, 20)}...` : 'NONE',
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

test('training-plans should show user menu', async ({ page }) => {
  await page.goto('/training-plans', { waitUntil: 'load' })

  // Ensure auth cookies are loaded after navigation
  await ensureAuthCookiesLoaded(page, new URL(page.url()).origin)

  // Log diagnostic info using Playwright's test.info()
  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find(c => c.name === 'better-auth.session_token')
  test.info().attach('cookie-diagnostic', {
    body: JSON.stringify(
      {
        testName: 'training-plans-test',
        totalCookies: cookies.length,
        sessionCookiePresent: !!sessionCookie,
        sessionCookieValue: sessionCookie ? `${sessionCookie.value.substring(0, 20)}...` : 'NONE',
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
