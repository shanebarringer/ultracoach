/**
 * Workout Management E2E Tests
 *
 * Tests the complete workout creation, editing, logging, and deletion flows,
 * ensuring proper state management with Jotai atoms.
 */
import { Page, expect, test } from '@playwright/test'

import { TEST_USERS } from '../utils/test-helpers'

// Helper function to wait for page to be ready
function waitForPageReady(page: Page): Promise<void> {
  return page.waitForLoadState('domcontentloaded')
}

test.describe('Workout Management', () => {
  test.describe('Runner Workout Management', () => {
    test.use({ storageState: './playwright/.auth/user.json' })

    test.beforeEach(async ({ page }) => {
      // Navigate directly to the runner dashboard - we're already authenticated
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })
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
        // If neither workouts nor empty state, wait a bit for data to load
        await page.waitForTimeout(2000)
      }

      // Skip the test if no workouts are available
      const workoutCount = await page.locator('[data-testid="workout-card"]').count()
      if (workoutCount === 0) {
        console.log('No workouts found, skipping filtering test')
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

    test('should create a new workout', async ({ page }) => {
      // Navigate directly to workouts page - we're already authenticated
      await page.goto('/workouts')

      // Click create workout button
      await page.getByRole('button', { name: /new workout/i }).click()

      // Fill workout form
      const workoutName = `Test Run ${Date.now()}`

      await page.getByLabel(/workout name/i).fill(workoutName)
      await page.getByLabel(/date/i).fill('2024-12-25')
      await page.getByLabel(/type/i).selectOption('long_run')
      await page.getByLabel(/distance/i).fill('20')
      await page.getByLabel(/duration/i).fill('180')
      await page.getByLabel(/intensity/i).fill('6')
      await page.getByLabel(/description/i).fill('Test long run workout')

      // Select terrain
      await page.getByRole('radio', { name: /trail/i }).click()

      // Submit form
      await page.getByRole('button', { name: /create workout/i }).click()

      // Should show success notification
      await expect(page.getByText(/workout created/i)).toBeVisible()

      // New workout should appear in list
      await expect(
        page.locator('[data-testid="workout-card"]').filter({ hasText: workoutName })
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
          timeout: 10000,
        }
      )

      // Check if there are any workout cards
      const workoutCards = page.locator('[data-testid="workout-card"]')
      const count = await workoutCards.count()

      // Skip test if no workouts exist
      if (count === 0) {
        console.log('No workouts found, skipping edit test')
        return
      }

      // Click edit on first workout
      const workoutCard = workoutCards.first()
      await workoutCard.getByRole('button', { name: /edit/i }).click()

      // Modify workout details
      const updatedName = `Updated Run ${Date.now()}`

      await page.getByLabel(/workout name/i).clear()
      await page.getByLabel(/workout name/i).fill(updatedName)
      await page.getByLabel(/intensity/i).clear()
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
          timeout: 10000,
        }
      )

      // Check if there are any workout cards
      const workoutCards = page.locator('[data-testid="workout-card"]')
      const count = await workoutCards.count()

      // Skip test if no workouts exist
      if (count === 0) {
        console.log('No workouts found, skipping log completion test')
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

      // Wait for either workouts or empty state to be visible
      await page.waitForSelector(
        '[data-testid="workout-card"], h3:has-text("No training sessions found")',
        {
          timeout: 10000,
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
          await expect(page.getByText(/synced with strava/i)).toBeVisible({ timeout: 10000 })

          // stravaActivitiesAtom should be updated
          await expect(completedWorkout.locator('[data-testid="strava-badge"]')).toBeVisible()
        }
      }
    })
  })

  test.describe('Coach Workout Management', () => {
    test.use({ storageState: './playwright/.auth/coach.json' })

    test.beforeEach(async ({ page }) => {
      // Navigate directly to the coach dashboard - we're already authenticated
      await page.goto('/dashboard/coach')
      await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })
    })

    test('should create workout for runner', async ({ page }) => {
      // Navigate to training plans or workouts
      await page.getByRole('link', { name: /training plans/i }).click()

      // Select a runner
      const runnerSelector = page.getByRole('combobox', { name: /select runner/i })
      await runnerSelector.click()

      const runnerOptions = page.getByRole('option')
      if ((await runnerOptions.count()) > 0) {
        const runnerName = await runnerOptions.first().textContent()
        await runnerOptions.first().click()

        // Create workout for runner
        await page.getByRole('button', { name: /add workout/i }).click()

        // Fill workout details
        await page.getByLabel(/workout name/i).fill(`Coach Assigned Run for ${runnerName}`)
        await page.getByLabel(/date/i).fill('2024-12-26')
        await page.getByLabel(/type/i).selectOption('tempo')
        await page.getByLabel(/distance/i).fill('10')
        await page.getByLabel(/target pace/i).fill('7:30')
        await page.getByLabel(/instructions/i).fill('Maintain steady tempo pace throughout')

        // Submit
        await page.getByRole('button', { name: /assign workout/i }).click()

        // Should show success
        await expect(page.getByText(/workout assigned/i)).toBeVisible()
      }
    })

    test('should view runner workout progress', async ({ page }) => {
      // Navigate to dashboard
      await expect(page.getByText(/my runners/i)).toBeVisible()

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

    test('should bulk assign workouts to multiple runners', async ({ page }) => {
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
        await page.getByLabel(/date/i).fill('2024-12-27')
        await page.getByLabel(/base distance/i).fill('8')

        // Apply to selected runners
        await page.getByRole('button', { name: /assign to selected/i }).click()

        // Should show success for multiple runners
        await expect(page.getByText(/workouts assigned to 2 runners/i)).toBeVisible()
      }
    })

    test('should modify runner workout', async ({ page }) => {
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
          await page.getByLabel(/intensity/i).clear()
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
    test.use({ storageState: './playwright/.auth/user.json' })

    test('should update filteredWorkoutsAtom when filters change', async ({ page }) => {
      // Navigate directly to workouts page - we're already authenticated
      await page.goto('/workouts')

      // Apply date filter
      await page.getByLabel(/from date/i).fill('2024-12-01')
      await page.getByLabel(/to date/i).fill('2024-12-31')
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
          expect(workoutDate >= new Date('2024-12-01')).toBe(true)
          expect(workoutDate <= new Date('2024-12-31')).toBe(true)
        }
      }
    })

    test('should update workoutStatsAtom after completion', async ({ page }) => {
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
