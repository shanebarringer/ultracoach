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

    // Wait for the page to be fully loaded
    // NOTE: Do NOT use networkidle - it hangs with real-time features (per Context7 docs)
    await page.waitForLoadState('domcontentloaded')

    // Give React time to hydrate
    await page.waitForTimeout(500)
  })

  test('should complete sign up flow and update auth atoms', async ({ page }) => {
    // Navigate directly to signup page
    await page.goto('/auth/signup')
    await expect(page).toHaveURL('/auth/signup')

    // Fill sign up form with unique email using UUID
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const testEmail = `test.runner.${timestamp}.${randomId}@example.com`
    const testName = 'Test Runner'

    await page.getByLabel('Full Name').fill(testName)
    await page.getByLabel('Email Address').fill(testEmail)
    await page.getByLabel('Password').fill('TestPassword123!')

    // Select runner role using the HeroUI Select component (need to click the button trigger)
    await page.locator('[data-slot="trigger"]').filter({ hasText: 'Choose your path' }).click()
    await page.getByRole('option', { name: /Trail Runner/i }).click()

    // Submit form
    await page.getByRole('button', { name: /Start Your Journey/i }).click()

    // Should redirect to dashboard after successful signup
    await expect(page).toHaveURL('/dashboard/runner', { timeout: 15000 })

    // Verify auth state is properly set (user name visible in welcome message)
    await expect(page.getByText(`Welcome back, ${testName}!`)).toBeVisible({ timeout: 10000 })

    // Verify isAuthenticatedAtom is true (navigation items visible)
    await expect(page.getByRole('link', { name: /workouts/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /training plans/i })).toBeVisible()
  })

  test('should complete sign in flow and update session atom', async ({ page }) => {
    // Navigate directly to signin page
    await page.goto('/auth/signin')
    await expect(page).toHaveURL('/auth/signin')

    // Use existing test credentials (from environment)
    await page.getByLabel(/email/i).fill('alex.rivera@ultracoach.dev')
    await page.getByLabel(/password/i).fill('RunnerPass2025!')

    // Submit form - using the actual button text
    await page.getByRole('button', { name: /Begin Your Expedition/i }).click()

    // Should redirect to appropriate dashboard based on role
    await expect(page).toHaveURL('/dashboard/runner', { timeout: 15000 })

    // Verify session is established - user name is shown in welcome message
    await expect(page.getByText('Welcome back, Alex Rivera!')).toBeVisible({ timeout: 10000 })
  })

  test('should handle sign out and clear auth atoms', async ({ page }) => {
    // First sign in
    await page.goto('/auth/signin')
    await page.getByLabel(/email/i).fill('alex.rivera@ultracoach.dev')
    await page.getByLabel(/password/i).fill('RunnerPass2025!')
    await page.getByRole('button', { name: /Begin Your Expedition/i }).click()

    // Wait for dashboard and welcome message
    await expect(page).toHaveURL('/dashboard/runner', { timeout: 15000 })
    await expect(page.getByText('Welcome back, Alex Rivera!')).toBeVisible({ timeout: 10000 })

    // Open user menu and sign out - using the avatar button
    await page.getByRole('img', { name: 'Alex Rivera' }).click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()

    // Should redirect to home page
    await expect(page).toHaveURL('/')

    // Wait for auth state to clear and Sign In button to appear
    await page.waitForSelector('button:has-text("Sign In")', { state: 'visible', timeout: 10000 })

    // Verify auth state is cleared (sign in button visible)
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Protected routes should not be accessible
    await expect(page.getByRole('link', { name: /workouts/i })).not.toBeVisible()
  })

  test('should maintain role-based access with isCoachAtom/isRunnerAtom', async ({ page }) => {
    // Sign in as coach
    await page.goto('/auth/signin')
    await page.getByLabel(/email/i).fill('emma@ultracoach.dev')
    await page.getByLabel(/password/i).fill('UltraCoach2025!')
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
    await page.getByLabel(/email/i).fill('alex.rivera@ultracoach.dev')
    await page.getByLabel(/password/i).fill('RunnerPass2025!')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

    // Refresh page
    await page.reload()

    // Should still be authenticated
    await expect(page).toHaveURL('/dashboard/runner')
    await expect(page.getByText('alex.rivera@ultracoach.dev')).toBeVisible()

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
    await page.getByRole('button', { name: /Begin Your Expedition/i }).click()

    // Should show error message (Better Auth shows "Invalid credentials")
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10000 })

    // Should remain on sign in page
    await expect(page).toHaveURL('/auth/signin')

    // Form should still be visible and usable
    await expect(page.getByRole('button', { name: /Begin Your Expedition/i })).toBeVisible()
  })

  test('should redirect to originally requested page after auth', async ({ page }) => {
    // Try to access protected route while unauthenticated
    await page.goto('/workouts')

    // Should redirect to sign in
    await expect(page).toHaveURL('/auth/signin')

    // Sign in
    await page.getByLabel(/email/i).fill('alex.rivera@ultracoach.dev')
    await page.getByLabel(/password/i).fill('RunnerPass2025!')
    await page.getByRole('button', { name: /Begin Your Expedition/i }).click()

    // Should redirect to originally requested page
    await expect(page).toHaveURL('/workouts', { timeout: 10000 })
  })
})
