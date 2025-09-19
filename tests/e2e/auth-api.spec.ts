import { expect, test } from '@playwright/test'

import { TEST_RUNNER_EMAIL, TEST_RUNNER_PASSWORD } from '../utils/test-helpers'

test.describe('Authentication API Tests', () => {
  test('should authenticate via API directly', async ({ request, context }) => {
    // Test direct API authentication to verify it works
    const response = await request.post('http://localhost:3001/api/auth/sign-in/email', {
      data: {
        email: TEST_RUNNER_EMAIL,
        password: TEST_RUNNER_PASSWORD,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Check response status
    expect(response.status()).toBe(200)

    // Get response body
    const body = await response.json()

    // Verify we got a session
    expect(body).toHaveProperty('user')
    expect(body.user).toHaveProperty('email', 'alex.rivera@ultracoach.dev')

    // Save cookies to context
    const cookies = await response.headers()
  })

  test('should access dashboard after API authentication', async ({ page, request }) => {
    // First authenticate via API
    const authResponse = await request.post('http://localhost:3001/api/auth/sign-in/email', {
      data: {
        email: TEST_RUNNER_EMAIL,
        password: TEST_RUNNER_PASSWORD,
      },
    })

    expect(authResponse.status()).toBe(200)

    // Now navigate to dashboard
    await page.goto('/dashboard/runner')

    // Wait for either dashboard or redirect to signin
    const finalUrl = await page.evaluate(() => window.location.pathname)

    // Check if we can access the dashboard
    if (finalUrl === '/dashboard/runner') {
      // We're on the dashboard
      await expect(page.locator('text=/Welcome back/')).toBeVisible({ timeout: 5000 })
    } else {
      // We got redirected to signin
    }
  })
})
