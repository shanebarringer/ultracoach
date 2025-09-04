/**
 * Authentication Flow E2E Tests
 *
 * Tests the complete authentication flow using the refactored Jotai atoms,
 * ensuring proper state management throughout the user journey.
 */
import { expect, test } from '@playwright/test'

test.describe('Authentication Flows with Jotai Atoms', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/')
  })

  test('should complete sign up flow and update auth atoms', async ({ page }) => {
    // Navigate to sign up
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL('/auth/signup')

    // Fill sign up form
    const timestamp = Date.now()
    const testEmail = `test.runner.${timestamp}@example.com`

    await page.getByLabel(/email/i).fill(testEmail)
    await page.getByLabel('Full Name').fill('Test Runner')
    await page.getByLabel(/^password$/i).fill('TestPassword123!')
    await page.getByLabel(/confirm password/i).fill('TestPassword123!')

    // Select runner role
    await page.getByRole('radio', { name: /runner/i }).click()

    // Submit form
    await page.getByRole('button', { name: /create account/i }).click()

    // Should redirect to dashboard after successful signup
    await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

    // Verify auth state is properly set (user info visible)
    await expect(page.getByText(testEmail)).toBeVisible()

    // Verify isAuthenticatedAtom is true (navigation items visible)
    await expect(page.getByRole('link', { name: /workouts/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /training plans/i })).toBeVisible()
  })

  test('should complete sign in flow and update session atom', async ({ page }) => {
    // Navigate to sign in
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/auth/signin')

    // Use existing test credentials
    await page.getByLabel(/email/i).fill('runner@example.com')
    await page.getByLabel(/password/i).fill('password123')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to appropriate dashboard based on role
    await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

    // Verify session is established
    await expect(page.getByText('runner@example.com')).toBeVisible()
  })

  test('should handle sign out and clear auth atoms', async ({ page }) => {
    // First sign in
    await page.goto('/auth/signin')
    await page.getByLabel(/email/i).fill('runner@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

    // Open user menu and sign out
    await page.getByRole('button', { name: /user menu/i }).click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()

    // Should redirect to home page
    await expect(page).toHaveURL('/')

    // Verify auth state is cleared (sign in link visible)
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()

    // Protected routes should not be accessible
    await expect(page.getByRole('link', { name: /workouts/i })).not.toBeVisible()
  })

  test('should maintain role-based access with isCoachAtom/isRunnerAtom', async ({ page }) => {
    // Sign in as coach
    await page.goto('/auth/signin')
    await page.getByLabel(/email/i).fill('coach@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to coach dashboard
    await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })

    // Coach-specific UI elements should be visible
    await expect(page.getByText(/manage runners/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /weekly planner/i })).toBeVisible()

    // Try to access runner dashboard (should redirect)
    await page.goto('/dashboard/runner')
    await expect(page).toHaveURL('/dashboard/coach')
  })

  test('should persist auth state across page refreshes', async ({ page }) => {
    // Sign in
    await page.goto('/auth/signin')
    await page.getByLabel(/email/i).fill('runner@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

    // Refresh page
    await page.reload()

    // Should still be authenticated
    await expect(page).toHaveURL('/dashboard/runner')
    await expect(page.getByText('runner@example.com')).toBeVisible()

    // Auth-dependent features should still work
    await page.getByRole('link', { name: /workouts/i }).click()
    await expect(page).toHaveURL('/workouts')
  })

  test('should handle auth errors gracefully', async ({ page }) => {
    // Navigate to sign in
    await page.goto('/auth/signin')

    // Try invalid credentials
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5000 })

    // Should remain on sign in page
    await expect(page).toHaveURL('/auth/signin')

    // Auth state should remain unauthenticated
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('should redirect to originally requested page after auth', async ({ page }) => {
    // Try to access protected route while unauthenticated
    await page.goto('/workouts')

    // Should redirect to sign in
    await expect(page).toHaveURL('/auth/signin')

    // Sign in
    await page.getByLabel(/email/i).fill('runner@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to originally requested page
    await expect(page).toHaveURL('/workouts', { timeout: 10000 })
  })
})
