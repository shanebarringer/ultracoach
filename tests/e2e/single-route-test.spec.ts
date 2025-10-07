import { expect, test } from '@playwright/test'

import { ensureAuthCookiesLoaded } from '../utils/test-helpers'

test.use({ storageState: './playwright/.auth/runner.json' })

test('dashboard should show user menu', async ({ page }) => {
  // Ensure cookies are loaded before navigation to prevent race condition
  await ensureAuthCookiesLoaded(page)

  await page.goto('/dashboard/runner', { waitUntil: 'load' })

  const userMenu = page.locator('[data-testid="user-menu"]')
  await expect(userMenu).toBeVisible({ timeout: 30000 })
})

test('training-plans should show user menu', async ({ page }) => {
  // Ensure cookies are loaded before navigation to prevent race condition
  await ensureAuthCookiesLoaded(page)

  await page.goto('/training-plans', { waitUntil: 'load' })

  const userMenu = page.locator('[data-testid="user-menu"]')
  await expect(userMenu).toBeVisible({ timeout: 30000 })
})
