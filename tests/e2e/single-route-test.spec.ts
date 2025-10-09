import { expect, test } from '@playwright/test'

import { TEST_TIMEOUTS } from '../utils/test-helpers'

test.use({ storageState: './playwright/.auth/runner.json' })

/**
 * Helper to verify session cookie is loaded before navigation
 * This helps diagnose cookie persistence issues (ULT-54)
 */
async function verifyCookiePresent(page, testName: string) {
  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find(c => c.name === 'better-auth.session_token')

  console.log(`[${testName}] Cookie diagnostic:`, {
    totalCookies: cookies.length,
    sessionCookiePresent: !!sessionCookie,
    sessionCookieValue: sessionCookie ? `${sessionCookie.value.substring(0, 20)}...` : 'NONE',
    allCookieNames: cookies.map(c => c.name),
  })

  if (!sessionCookie) {
    throw new Error(
      `[${testName}] Session cookie not found! Available cookies: ${cookies.map(c => c.name).join(', ')}`
    )
  }

  return sessionCookie
}

test('dashboard should show user menu', async ({ page }) => {
  // Verify cookie is loaded BEFORE navigation
  await verifyCookiePresent(page, 'dashboard-test')

  await page.goto('/dashboard/runner', { waitUntil: 'load' })

  const userMenu = page.locator('[data-testid="user-menu"]')
  await expect(userMenu).toBeVisible({ timeout: TEST_TIMEOUTS.long })
})

test('training-plans should show user menu', async ({ page }) => {
  // Verify cookie is loaded BEFORE navigation
  await verifyCookiePresent(page, 'training-plans-test')

  await page.goto('/training-plans', { waitUntil: 'load' })

  const userMenu = page.locator('[data-testid="user-menu"]')
  await expect(userMenu).toBeVisible({ timeout: TEST_TIMEOUTS.long })
})
