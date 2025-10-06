import { expect, test } from '@playwright/test'

test.use({ storageState: './playwright/.auth/runner.json' })

test('dashboard should show user menu', async ({ page }) => {
  await page.goto('/dashboard/runner', { waitUntil: 'load' })
  await page.waitForTimeout(2000)

  const userMenu = page.locator('[data-testid="user-menu"]')
  await expect(userMenu).toBeVisible({ timeout: 30000 })

  console.log('✅ User menu is visible on /dashboard/runner')
})

test('training-plans should show user menu', async ({ page }) => {
  await page.goto('/training-plans', { waitUntil: 'load' })
  await page.waitForTimeout(2000)

  const userMenu = page.locator('[data-testid="user-menu"]')
  await expect(userMenu).toBeVisible({ timeout: 30000 })

  console.log('✅ User menu is visible on /training-plans')
})
