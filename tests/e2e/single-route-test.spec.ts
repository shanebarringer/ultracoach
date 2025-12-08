import { expect, test } from '@playwright/test'

import { TEST_TIMEOUTS } from '../utils/test-helpers'
import { navigateWithAuthVerification, waitForPageReady } from '../utils/wait-helpers'

// Parameterized route tests - reduces duplication and improves maintainability
const routesToTest = [
  { route: '/dashboard/runner', name: 'runner-home' },
  { route: '/training-plans', name: 'plans-page' },
]

test.describe.parallel('Protected route access verification', () => {
  // Use runner authentication for protected routes
  test.use({ storageState: './playwright/.auth/runner.json' })

  routesToTest.forEach(({ route, name }) => {
    test(`should show user menu on ${name}`, async ({ page }) => {
      // Use auth-aware navigation that skips test if auth fails
      await navigateWithAuthVerification(page, route)
      await waitForPageReady(page)

      const userMenu = page.getByTestId('user-menu')
      await expect(userMenu).toBeVisible({ timeout: TEST_TIMEOUTS.long })
    })
  })
})
