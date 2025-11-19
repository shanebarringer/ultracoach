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
      await page.goto(route, { waitUntil: 'load' })

      const userMenu = page.getByTestId('user-menu')
      await expect(userMenu).toBeVisible({ timeout: TEST_TIMEOUTS.long })
    })
  })
})
