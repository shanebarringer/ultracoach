import { expect, test } from '@playwright/test'

import { TEST_TIMEOUTS } from '../utils/test-helpers'

// Parameterized route tests - reduces duplication and improves maintainability
const routesToTest = [
  { route: '/dashboard/runner', name: 'runner-home' },
  { route: '/training-plans', name: 'plans-page' },
]

test.describe.parallel('Protected route access verification', () => {
  routesToTest.forEach(({ route, name }) => {
    test(`should show user menu on ${name}`, async ({ page }) => {
      // Navigate to the route and wait for network to settle
      await page.goto(route, { waitUntil: 'load' })

      // Wait a bit for any redirects to complete
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.medium })

      // Verify we're on the expected route (not redirected to auth)
      const currentUrl = page.url()
      expect(currentUrl).toContain(route)

      // Verify user menu is visible (indicates authenticated state)
      const userMenu = page.getByTestId('user-menu')
      await expect(userMenu).toBeVisible({ timeout: TEST_TIMEOUTS.long })
    })
  })
})
