import { expect, test } from '@playwright/test'

import { TEST_TIMEOUTS, ensureAuthCookiesLoaded } from '../utils/test-helpers'

test.use({ storageState: './playwright/.auth/runner.json' })

test('dashboard should show user menu', async ({ page }) => {
  await page.goto('/dashboard/runner', { waitUntil: 'load' })

  // Ensure cookies are loaded AFTER navigation to prevent race condition
  await ensureAuthCookiesLoaded(page, new URL(page.url()).origin)

  const userMenu = page.locator('[data-testid="user-menu"]')
  await expect(userMenu).toBeVisible({ timeout: TEST_TIMEOUTS.long })
})

test('training-plans should show user menu', async ({ page }) => {
  await page.goto('/training-plans', { waitUntil: 'load' })

  // Ensure cookies are loaded AFTER navigation to prevent race condition
  await ensureAuthCookiesLoaded(page, new URL(page.url()).origin)

  const userMenu = page.locator('[data-testid="user-menu"]')
  await expect(userMenu).toBeVisible({ timeout: TEST_TIMEOUTS.long })
})
