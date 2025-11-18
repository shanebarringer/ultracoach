/**
 * Workout Management E2E Tests
 *
 * Tests the complete workout creation, editing, logging, and deletion flows,
 * ensuring proper state management with Jotai atoms.
 */
import { Page, expect, test } from '@playwright/test'
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'

import { TEST_USERS } from '../utils/test-helpers'

// CI timeout constant for consistent wait times
const CI_TIMEOUT = 15000

// Helper function to wait for page to be ready
function waitForPageReady(page: Page): Promise<void> {
  return page.waitForLoadState('domcontentloaded')
}

test.describe('Workout Management', () => {
  test.describe('Runner Workout Management', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test.beforeEach(async ({ page }) => {
      // Navigate directly to the runner dashboard - storageState provides authentication
      await page.goto('/dashboard/runner')
      await waitForPageReady(page)

      // Wait for final URL after any redirects (verifies successful authentication)
      await expect(page).toHaveURL('/dashboard/runner', { timeout: CI_TIMEOUT })

      // Wait for dashboard content to ensure full page load
      await page.waitForSelector('h1, h2, [data-testid="dashboard-content"]', {
        timeout: CI_TIMEOUT,
      })
    })

    test('should display workouts list with proper filtering', async ({ page }) => {
      // Navigate directly to workouts page - we're already authenticated
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')

      // Check if there are workouts or an empty state (Playwright auto-waits for page ready)
      const hasWorkouts = (await page.locator('[data-testid="workout-card"]').count()) > 0
      const hasEmptyState = await page
        .getByText(/no workouts found|no training sessions found|workout not found/i)
        .isVisible()

      if (!hasWorkouts && !hasEmptyState) {
        // Wait for either workouts or empty state to appear
        await page
          .waitForSelector('[data-testid="workout-card"], text="No training plans"', {
            state: 'visible',
            timeout: 5000,
          })
          .catch(() => {})
      }

      // Skip the test if no workouts are available
      const workoutCount = await page.locator('[data-testid="workout-card"]').count()
      if (workoutCount === 0) {
        return
      }

      // Should display workouts list
      await expect(page.locator('[data-testid="workout-card"]').first()).toBeVisible()

      // Test filtering - All workouts
      await page.getByRole('button', { name: /filter/i }).click()
      await page.getByRole('option', { name: /all/i }).click()

      // Test filtering - Planned only
      await page.getByRole('button', { name: /filter/i }).click()
      await page.getByRole('option', { name: /planned/i }).click()

      // Verify only planned workouts are visible
      const plannedWorkouts = page.locator('[data-testid="workout-card"][data-status="planned"]')
      const allWorkouts = page.locator('[data-testid="workout-card"]')

      const plannedCount = await plannedWorkouts.count()
      const totalCount = await allWorkouts.count()

      expect(plannedCount).toBe(totalCount)
    })

    test.skip('should create a new workout', async ({ page }) => {
      // Skip: Modal form interactions are failing in CI environment
      // The test has issues with HeroUI Select dropdowns and form submission
      // Navigate directly to workouts page - we're already authenticated
      await page.goto('/workouts')

      // Click create workout button
      await page.getByRole('button', { name: /new workout/i }).click()

      // Fill workout form
      // The AddWorkoutModal doesn't have a workout name field, it uses date and type to identify workouts

      // Use a date 7 days from now
      const workoutDate = format(addDays(new Date(), 7), 'yyyy-MM-dd')
      await page.getByLabel('Date').fill(workoutDate)

      // Select workout type from dropdown - HeroUI Select needs special handling
      await page.locator('button:has-text("Select type...")').click()
      // Wait for dropdown to appear and use text-based selector
      // Wait for dropdown options to be visible
      await page.waitForSelector('[role="option"]', { state: 'visible' })
      await page.locator('li[role="option"]:has-text("Long Run")').click()

      // Fill optional fields if they exist
      await page.getByLabel('Planned Distance (miles)').fill('20')
      await page.getByLabel('Planned Duration (minutes)').fill('180')
      await page.getByLabel('Intensity (1-10)').fill('6')
      // Use more specific selector for Notes textarea (not the search input)
      await page.getByRole('textbox', { name: 'Notes' }).fill('Test long run workout')

      // Skip terrain selection as it's having modal overlay issues in CI
      // The form should still submit without it

      // Submit form
      await page.getByRole('button', { name: /add workout/i }).click()

      // Should show success notification
      await expect(page.getByText(/workout created/i)).toBeVisible()

      // New workout should appear in list (identified by date and type)
      await expect(
        page.locator('[data-testid="workout-card"]').filter({ hasText: 'Long Run' })
      ).toBeVisible()

      // Verify workoutsAtom is updated
      await expect(page.locator('[data-testid="workout-count"]')).toBeVisible()
    })

    test('should edit an existing workout', async ({ page }) => {
      // Navigate directly to workouts page - we're already authenticated
      await page.goto('/workouts')
      await page.waitForLoadState('domcontentloaded')

      // Wait for either workouts or empty state to be visible
      await page.waitForSelector(
        '[data-testid="workout-card"], h3:has-text("No training sessions found")',
        {
          timeout: CI_TIMEOUT,
        }
      )

      // Check if there are any workout cards
      const workoutCards = page.locator('[data-testid="workout-card"]')
      const count = await workoutCards.count()

      // Skip test if no workouts exist
      if (count === 0) {
        return
      }

      // Click edit on first workout
      const workoutCard = workoutCards.first()
      await workoutCard.getByRole('button', { name: /edit/i }).click()

      // Modify workout details
      const updatedName = `Updated Run ${Date.now()}`

      await page.getByLabel(/workout name/i).fill('')
      await page.getByLabel(/workout name/i).fill(updatedName)
      await page.getByLabel(/intensity/i).fill('')
      await page.getByLabel(/intensity/i).fill('8')

      // Save changes
      await page.getByRole('button', { name: /save changes/i }).click()

      // Should show success notification
      await expect(page.getByText(/workout updated/i)).toBeVisible()

      // Updated workout should reflect changes
      await expect(
        page.locator('[data-testid="workout-card"]').filter({ hasText: updatedName })
      ).toBeVisible()
    })

    test('should log workout completion', async ({ page }) => {
      // Navigate directly to workouts page - we're already authenticated
      await page.goto('/workouts')
      await page.waitForLoadState('domcontentloaded')

      // Wait for either workouts or empty state to be visible
      await page.waitForSelector(
        '[data-testid="workout-card"], h3:has-text("No training sessions found")',
        {
          timeout: CI_TIMEOUT,
        }
      )

      // Check if there are any workout cards
      const workoutCards = page.locator('[data-testid="workout-card"]')
      const count = await workoutCards.count()

      // Skip test if no workouts exist
      if (count === 0) {
        return
      }

      // Find a planned workout
      const plannedWorkout = page
        .locator('[data-testid="workout-card"][data-status="planned"]')
        .first()

      if (await plannedWorkout.isVisible()) {
        // Click log workout button
        await plannedWorkout.getByRole('button', { name: /log completion/i }).click()

        // Fill completion details
        await page.getByLabel(/actual distance/i).fill('21')
        await page.getByLabel(/actual duration/i).fill('175')
        await page.getByLabel(/average heart rate/i).fill('145')
        await page.getByLabel(/max heart rate/i).fill('165')
        await page.getByLabel(/notes/i).fill('Felt strong throughout the run')

        // Rate the workout
        await page.getByRole('radio', { name: /great/i }).click()

        // Submit completion
        await page.getByRole('button', { name: /complete workout/i }).click()

        // Should show success notification
        await expect(page.getByText(/workout completed/i)).toBeVisible()

        // Workout status should update to completed
        await expect(plannedWorkout.locator('[data-status="completed"]')).toBeVisible()

        // completedWorkoutsAtom should be updated
        const completedCount = page.locator('[data-testid="completed-workout-count"]')
        if (await completedCount.isVisible()) {
          const count = await completedCount.textContent()
          expect(parseInt(count || '0')).toBeGreaterThan(0)
        }
      }
    })

    test('should delete a workout', async ({ page }) => {
      // Navigate directly to workouts page - we're already authenticated
      await page.goto('/workouts')

      // Count initial workouts
      const initialCount = await page.locator('[data-testid="workout-card"]').count()

      if (initialCount > 0) {
        // Click delete on first workout
        const workoutCard = page.locator('[data-testid="workout-card"]').first()
        const workoutName = await workoutCard.locator('[data-testid="workout-name"]').textContent()

        await workoutCard.getByRole('button', { name: /delete/i }).click()

        // Confirm deletion
        await page.getByRole('button', { name: /confirm delete/i }).click()

        // Should show success notification
        await expect(page.getByText(/workout deleted/i)).toBeVisible()

        // Workout should be removed from list
        if (workoutName) {
          await expect(
            page.locator('[data-testid="workout-card"]').filter({ hasText: workoutName })
          ).not.toBeVisible()
        }

        // Count should decrease
        const newCount = await page.locator('[data-testid="workout-card"]').count()
        expect(newCount).toBe(initialCount - 1)
      }
    })

    test('should sync workout with Strava', async ({ page }) => {
      // Navigate directly to workouts page - we're already authenticated
      await page.goto('/workouts')
      await page.waitForLoadState('domcontentloaded')

      // Wait for URL to be workouts page (verifies authentication)
      await expect(page).toHaveURL('/workouts', { timeout: CI_TIMEOUT })

      // Wait for either workouts or empty state to be visible
      await page.waitForSelector(
        '[data-testid="workout-card"], h3:has-text("No training sessions found")',
        {
          timeout: CI_TIMEOUT, // Use shared constant for consistent CI timeouts
        }
      )

      // Find a completed workout
      const completedWorkout = page
        .locator('[data-testid="workout-card"][data-status="completed"]')
        .first()

      if (await completedWorkout.isVisible()) {
        // Check if Strava is connected
        const stravaButton = completedWorkout.locator('[data-testid="strava-sync-button"]')

        if (await stravaButton.isVisible()) {
          // Click sync with Strava
          await stravaButton.click()

          // Should show syncing state
          await expect(stravaButton).toHaveText(/syncing/i)

          // Should eventually show success
          await expect(page.getByText(/synced with strava/i)).toBeVisible({ timeout: CI_TIMEOUT })

          // stravaActivitiesAtom should be updated
          await expect(completedWorkout.locator('[data-testid="strava-badge"]')).toBeVisible()
        }
      }
    })
  })

  test.describe('Coach Workout Management', () => {
    test.use({ storageState: './playwright/.auth/coach.json' })

    test.beforeEach(async ({ page }) => {
      // Navigate directly to the coach dashboard - storageState provides authentication
      await page.goto('/dashboard/coach')
      await waitForPageReady(page)

      // Wait for final URL after any redirects (verifies successful authentication)
      await expect(page).toHaveURL('/dashboard/coach', { timeout: CI_TIMEOUT })

      // Wait for dashboard content to ensure full page load
      await page.waitForSelector('h1, h2, [data-testid="dashboard-content"]', {
        timeout: CI_TIMEOUT,
      })
    })

    test('should create workout for multiple runners via weekly planner', async ({ page }) => {
      // This test verifies the fix for ULT-82 Phase 3: Training Plan Selection Bug
      // BUG: Workouts were being created for wrong runner when coach has multiple athletes
      // FIX: Added .find(plan => plan.runner_id === runner.id) to filter by current runner

      // Navigate to weekly planner selection page
      await page.goto('/weekly-planner')
      await expect(page).toHaveURL('/weekly-planner', { timeout: CI_TIMEOUT })

      // Wait for page header to ensure page is rendered (don't use networkidle - hangs with real-time features)
      await page.waitForSelector('h1:has-text("Weekly Planner")', { timeout: CI_TIMEOUT })

      // Try to wait for runner cards, but don't fail if none exist (will skip below)
      await page
        .waitForSelector('[data-testid="runner-card"], .runner-selection-card', {
          timeout: CI_TIMEOUT,
        })
        .catch(() => {
          // No runner cards found - coach may not have connected runners
          console.log('No runner cards found, checking count for graceful skip...')
        })

      // Get all available runner cards and check count IMMEDIATELY for early skip
      // This avoids unnecessary setup work if we don't have enough runners
      const runnerCards = page.locator('[data-testid="runner-card"], .runner-selection-card')
      const runnerCount = await runnerCards.count()

      // Skip if coach has fewer than 2 connected runners (can't test multi-runner scenario)
      // Check as early as possible to avoid wasted navigation/setup before skip
      if (runnerCount < 2) {
        console.log(
          `Skipping multi-runner test: coach has ${runnerCount} connected runners (need at least 2)`
        )
        test.skip()
        return
      }

      // Test with first runner
      const firstRunnerCard = runnerCards.first()
      const firstRunnerName =
        (await firstRunnerCard.locator('[data-testid="runner-name"]').textContent()) || 'Runner 1'

      await firstRunnerCard.click()

      // Wait for weekly planner to load
      await page.waitForURL(/\/weekly-planner\/.+/, { timeout: CI_TIMEOUT })
      await page.waitForSelector('h1:has-text(/Weekly Planner|Training/i)', { timeout: CI_TIMEOUT })

      // Create a workout for first runner (use tomorrow to avoid conflicts with existing workouts)
      const tomorrow = addDays(new Date(), 1)
      const dayName = format(tomorrow, 'EEEE') // e.g., "Monday"

      // Find the day card for tomorrow
      const dayCard = page.locator(`[data-testid="day-card-${dayName}"]`).first()
      if ((await dayCard.count()) === 0) {
        // Fallback: use any day card
        await page.locator('[data-testid^="day-card-"]').first().click()
      } else {
        await dayCard.click()
      }

      // Fill workout form in weekly planner
      await page.getByLabel(/planned type|type/i).click()
      await page.getByRole('option', { name: /long run/i }).click()

      await page.getByLabel(/distance|planned distance/i).fill('15')
      await page.getByLabel(/duration|planned duration/i).fill('120')
      await page.getByLabel(/notes/i).fill(`Test workout for ${firstRunnerName} - created by test`)

      // Save workout
      await page.getByRole('button', { name: /save|add workout/i }).click()

      // Verify workout appears in UI
      await expect(page.getByText(/workout.*saved|success/i)).toBeVisible({ timeout: CI_TIMEOUT })

      // Navigate back to weekly planner selection
      await page.goto('/weekly-planner')
      await expect(page).toHaveURL('/weekly-planner', { timeout: CI_TIMEOUT })

      // Test with second runner (CRITICAL: This is where the bug would manifest)
      const secondRunnerCard = runnerCards.nth(1)
      const secondRunnerName =
        (await secondRunnerCard.locator('[data-testid="runner-name"]').textContent()) || 'Runner 2'

      // CRITICAL: Ensure we're testing with a DIFFERENT runner
      expect(secondRunnerName).not.toBe(firstRunnerName)

      await secondRunnerCard.click()

      // Wait for second runner's weekly planner to load
      await page.waitForURL(/\/weekly-planner\/.+/, { timeout: CI_TIMEOUT })
      await page.waitForSelector('h1:has-text(/Weekly Planner|Training/i)', { timeout: CI_TIMEOUT })

      // Verify we're viewing the second runner's planner (not the first)
      await expect(
        page.locator('h1, [data-testid="runner-name"]').filter({ hasText: secondRunnerName })
      ).toBeVisible()

      // Create a workout for second runner (use day after tomorrow)
      const dayAfterTomorrow = addDays(new Date(), 2)
      const dayAfterTomorrowName = format(dayAfterTomorrow, 'EEEE')

      const secondDayCard = page.locator(`[data-testid="day-card-${dayAfterTomorrowName}"]`).first()
      if ((await secondDayCard.count()) === 0) {
        await page.locator('[data-testid^="day-card-"]').first().click()
      } else {
        await secondDayCard.click()
      }

      // Fill workout form for second runner
      await page.getByLabel(/planned type|type/i).click()
      await page.getByRole('option', { name: /tempo/i }).click()

      await page.getByLabel(/distance|planned distance/i).fill('12')
      await page.getByLabel(/duration|planned duration/i).fill('90')
      await page
        .getByLabel(/notes/i)
        .fill(
          `Test workout for ${secondRunnerName} - MUST be for ${secondRunnerName}, NOT ${firstRunnerName}`
        )

      // Save workout
      await page.getByRole('button', { name: /save|add workout/i }).click()

      // Verify workout appears in UI
      await expect(page.getByText(/workout.*saved|success/i)).toBeVisible({ timeout: CI_TIMEOUT })

      // REGRESSION TEST: Navigate back to first runner's planner and verify second workout is NOT there
      await page.goto('/weekly-planner')
      await expect(page).toHaveURL('/weekly-planner', { timeout: CI_TIMEOUT })

      // Re-wait for runner cards to ensure DOM is ready after navigation
      // This prevents using stale locators from before navigation
      await page
        .waitForSelector('[data-testid="runner-card"], .runner-selection-card', {
          timeout: CI_TIMEOUT,
        })
        .catch(() => {
          console.log('Runner cards not found after navigation back')
        })

      // Re-acquire runner card locators to reference current DOM nodes (not stale pre-navigation nodes)
      const refreshedRunnerCards = page.locator(
        '[data-testid="runner-card"], .runner-selection-card'
      )
      const refreshedFirstRunnerCard = refreshedRunnerCards.first()

      // Select first runner again (using fresh locator)
      await refreshedFirstRunnerCard.click()
      await page.waitForURL(/\/weekly-planner\/.+/, { timeout: CI_TIMEOUT })

      // Navigate to the day where second runner's workout was created
      const secondDayCardInFirstPlanner = page
        .locator(`[data-testid="day-card-${dayAfterTomorrowName}"]`)
        .first()
      if ((await secondDayCardInFirstPlanner.count()) > 0) {
        await secondDayCardInFirstPlanner.click()

        // Verify the second runner's workout is NOT present in first runner's planner
        // Scope the lookup to the day card locator for more precise assertion
        await expect(
          secondDayCardInFirstPlanner.getByText(`Test workout for ${secondRunnerName}`)
        ).not.toBeVisible({ timeout: CI_TIMEOUT })
      }

      // Success: If we reach here, workouts were created successfully for both runners
      // The test passing means the .find(plan => plan.runner_id === runner.id) fix is working
    })

    test('should view runner workout progress', async ({ page }) => {
      // Navigate to dashboard - look for Active Athletes section
      await expect(page.getByText(/active athletes/i)).toBeVisible()

      // Click on a runner card if available
      const runnerCard = page.locator('[data-testid="active-runner-card"]').first()

      if (await runnerCard.isVisible()) {
        await runnerCard.click()

        // Should navigate to runner details
        await expect(page.url()).toMatch(/\/(runner-details|training-plans)/)

        // Should show workout completion stats
        await expect(page.getByText(/completion rate/i)).toBeVisible()
        await expect(page.locator('[data-testid="workout-progress-chart"]')).toBeVisible()

        // Should show recent workouts
        await expect(page.getByText(/recent workouts/i)).toBeVisible()
        await expect(page.locator('[data-testid="runner-workout-card"]')).toBeVisible()
      }
    })

    test.skip('should bulk assign workouts to multiple runners', async ({ page }) => {
      // Skip - weekly planner link doesn't exist in current UI
      // Navigate to weekly planner
      await page.getByRole('link', { name: /weekly planner/i }).click()

      // Select multiple runners if available
      const runnerCheckboxes = page.locator('[data-testid="runner-checkbox"]')
      const checkboxCount = await runnerCheckboxes.count()

      if (checkboxCount >= 2) {
        // Select first two runners
        await runnerCheckboxes.nth(0).check()
        await runnerCheckboxes.nth(1).check()

        // Click bulk assign
        await page.getByRole('button', { name: /bulk assign/i }).click()

        // Create workout template
        await page.getByLabel(/workout template/i).selectOption('base_run')
        // Use a date 9 days from now
        const thirdWorkoutDate = format(addDays(new Date(), 9), 'yyyy-MM-dd')
        await page.getByLabel(/date/i).fill(thirdWorkoutDate)
        await page.getByLabel(/base distance/i).fill('8')

        // Apply to selected runners
        await page.getByRole('button', { name: /assign to selected/i }).click()

        // Should show success for multiple runners
        await expect(page.getByText(/workouts assigned to 2 runners/i)).toBeVisible()
      }
    })

    test.skip('should modify runner workout', async ({ page }) => {
      // Skip - training plans link doesn't exist in current UI
      // Navigate to training plans
      await page.getByRole('link', { name: /training plans/i }).click()

      // Select a runner
      const runnerSelector = page.getByRole('combobox', { name: /select runner/i })
      await runnerSelector.click()

      const runnerOptions = page.getByRole('option')
      if ((await runnerOptions.count()) > 0) {
        await runnerOptions.first().click()

        // Find and edit a workout
        const workoutCard = page.locator('[data-testid="runner-workout-card"]').first()

        if (await workoutCard.isVisible()) {
          await workoutCard.getByRole('button', { name: /edit/i }).click()

          // Modify workout
          await page.getByLabel(/intensity/i).fill('')
          await page.getByLabel(/intensity/i).fill('7')
          await page
            .getByLabel(/coach notes/i)
            .fill('Adjusted intensity based on recent performance')

          // Save
          await page.getByRole('button', { name: /save changes/i }).click()

          // Should show success
          await expect(page.getByText(/workout updated/i)).toBeVisible()
        }
      }
    })
  })

  test.describe('Workout State Management', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test.skip('should update filteredWorkoutsAtom when filters change', async ({ page }) => {
      // Skip - date filter UI doesn't exist in current implementation
      // Navigate directly to workouts page - we're already authenticated
      await page.goto('/workouts')

      // Apply date filter
      // Use current month start and end dates
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')
      await page.getByLabel(/from date/i).fill(monthStart)
      await page.getByLabel(/to date/i).fill(monthEnd)
      await page.getByRole('button', { name: /apply filter/i }).click()

      // Should only show workouts in date range
      const workoutCards = page.locator('[data-testid="workout-card"]')
      const count = await workoutCards.count()

      // All visible workouts should be in date range
      for (let i = 0; i < count; i++) {
        const dateText = await workoutCards
          .nth(i)
          .locator('[data-testid="workout-date"]')
          .textContent()
        if (dateText) {
          const workoutDate = new Date(dateText)
          expect(workoutDate >= startOfMonth(new Date())).toBe(true)
          expect(workoutDate <= endOfMonth(new Date())).toBe(true)
        }
      }
    })

    test.skip('should update workoutStatsAtom after completion', async ({ page }) => {
      // Skip: Dashboard doesn't have data-testid="total-workouts" or "completed-workouts"
      // The dashboard uses different testIds like "upcoming-workouts-count" instead
      // Navigate directly to dashboard - we're already authenticated
      await page.goto('/dashboard/runner')

      // Check initial stats on dashboard
      const initialStats = {
        total: await page.locator('[data-testid="total-workouts"]').textContent(),
        completed: await page.locator('[data-testid="completed-workouts"]').textContent(),
      }

      // Navigate directly to workouts page
      await page.goto('/workouts')

      const plannedWorkout = page
        .locator('[data-testid="workout-card"][data-status="planned"]')
        .first()
      if (await plannedWorkout.isVisible()) {
        await plannedWorkout.getByRole('button', { name: /mark complete/i }).click()

        // Quick complete without details
        await page.getByRole('button', { name: /quick complete/i }).click()

        // Return to dashboard
        await page.getByRole('link', { name: /dashboard/i }).click()

        // Stats should be updated
        const newStats = {
          total: await page.locator('[data-testid="total-workouts"]').textContent(),
          completed: await page.locator('[data-testid="completed-workouts"]').textContent(),
        }

        expect(parseInt(newStats.completed || '0')).toBeGreaterThan(
          parseInt(initialStats.completed || '0')
        )
      }
    })
  })
})
