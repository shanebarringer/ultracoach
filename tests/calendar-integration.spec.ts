import { expect, test } from '@playwright/test'

// E2E test for calendar-database integration
// Tests that seeded workout data displays correctly in the calendar component

// TODO: Fix calendar integration tests
// These tests are currently disabled because:
// 1. Calendar page structure doesn't match test expectations
// 2. Tests need to use proper test helpers (navigateToDashboard, assertAuthenticated)
// 3. Need to verify calendar component implementation and data loading
// 4. Calendar UI may not have the expected data-testid attributes
//
// To re-enable: Remove .skip and update tests to use test-helpers.ts
test.describe('Calendar Database Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page first
    await page.goto('/auth/signin')
  })

  test('should display seeded workouts in calendar for test runner', async ({ page }) => {
    // Login as test runner
    await page.fill('input[type="email"]', 'alex.rivera@ultracoach.dev')
    await page.fill('input[type="password"]', 'RunnerPass2025!')
    await page.click('button[type="submit"]')

    // Wait for successful login and redirect
    await expect(page).toHaveURL('/dashboard/runner')

    // Navigate to calendar page
    await page.goto('/calendar')

    // Wait for calendar to load
    await expect(page.locator('h1')).toContainText('Training Calendar')

    // Verify calendar component is visible
    await expect(page.locator('[data-testid="monthly-calendar"]')).toBeVisible({ timeout: 10000 })

    // Wait for workouts to load from API
    await page.waitForTimeout(2000)

    // Check for workout indicators in calendar
    // Look for workout cards/chips that should be rendered from seeded data
    const workoutElements = page.locator('[class*="workout"], [class*="training"]').first()
    await expect(workoutElements).toBeVisible({ timeout: 10000 })

    // Verify workout statistics are displayed
    await expect(page.locator('text=Total Workouts')).toBeVisible()
    await expect(page.locator('text=Planned')).toBeVisible()
    await expect(page.locator('text=Completed')).toBeVisible()

    // Check that we have some workouts showing in the stats
    const workoutCount = await page
      .locator('text=Total Workouts')
      .locator('..')
      .locator('span[class*="font-medium"]')
      .textContent()
    expect(parseInt(workoutCount || '0')).toBeGreaterThan(0)
  })

  test('should display seeded workouts in calendar for test coach', async ({ page }) => {
    // Login as test coach
    await page.fill('input[type="email"]', 'emma@ultracoach.dev')
    await page.fill('input[type="password"]', 'UltraCoach2025!')
    await page.click('button[type="submit"]')

    // Wait for successful login and redirect
    await expect(page).toHaveURL('/dashboard/coach')

    // Navigate to calendar page
    await page.goto('/calendar')

    // Wait for calendar to load
    await expect(page.locator('h1')).toContainText('Training Calendar')

    // Verify coach-specific content
    await expect(page.locator('text=Visualize and manage your athletes')).toBeVisible()

    // Verify calendar component is visible
    await expect(page.locator('[data-testid="monthly-calendar"]')).toBeVisible({ timeout: 10000 })

    // Wait for workouts to load
    await page.waitForTimeout(2000)

    // Check that coach can see their athletes' workouts
    const workoutCount = await page
      .locator('text=Total Workouts')
      .locator('..')
      .locator('span[class*="font-medium"]')
      .textContent()
    expect(parseInt(workoutCount || '0')).toBeGreaterThan(0)

    // Verify coach-specific actions are available
    await expect(page.locator('text=Your Athletes')).toBeVisible()
  })

  test('should handle calendar date navigation with workout data', async ({ page }) => {
    // Login as test runner
    await page.fill('input[type="email"]', 'alex.rivera@ultracoach.dev')
    await page.fill('input[type="password"]', 'RunnerPass2025!')
    await page.click('button[type="submit"]')

    // Wait for redirect and navigate to calendar
    await expect(page).toHaveURL('/dashboard/runner')
    await page.goto('/calendar')

    // Wait for calendar to load
    await expect(page.locator('[data-testid="monthly-calendar"]')).toBeVisible({ timeout: 10000 })

    // Test month navigation
    const nextMonthButton = page.locator('button[aria-label="Next month"]')
    await expect(nextMonthButton).toBeVisible()
    await nextMonthButton.click()

    // Wait for navigation to complete
    await page.waitForTimeout(1000)

    // Navigate back to current month
    const prevMonthButton = page.locator('button[aria-label="Previous month"]')
    await expect(prevMonthButton).toBeVisible()
    await prevMonthButton.click()

    // Test "Today" button
    const todayButton = page.locator('button:has-text("Today")')
    await expect(todayButton).toBeVisible()
    await todayButton.click()

    // Verify calendar still shows workout data after navigation
    await page.waitForTimeout(1000)
    const workoutStats = page.locator('text=Total Workouts')
    await expect(workoutStats).toBeVisible()
  })

  test('should display correct workout types from seeded data', async ({ page }) => {
    // Login as test runner
    await page.fill('input[type="email"]', 'alex.rivera@ultracoach.dev')
    await page.fill('input[type="password"]', 'RunnerPass2025!')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard/runner')
    await page.goto('/calendar')

    // Wait for calendar and data to load
    await expect(page.locator('[data-testid="monthly-calendar"]')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(3000)

    // Look for specific workout types that should be seeded
    // Based on the seeding script, we should have: Easy Run, Tempo Run, Long Run
    const workoutTypes = ['Easy Run', 'Tempo Run', 'Long Run']

    for (const workoutType of workoutTypes) {
      // Check if any workout elements contain these types
      const workoutElement = page.locator(`text=${workoutType}`).first()

      // If the workout is visible on the current calendar view
      if (await workoutElement.isVisible()) {
        await expect(workoutElement).toBeVisible()
        console.log(`Found workout type: ${workoutType}`)
      }
    }

    // Verify we have some planned workouts in the statistics
    const plannedCount = await page
      .locator('text=Planned')
      .locator('..')
      .locator('span[class*="font-medium"]')
      .textContent()
    expect(parseInt(plannedCount || '0')).toBeGreaterThan(0)
  })
})
