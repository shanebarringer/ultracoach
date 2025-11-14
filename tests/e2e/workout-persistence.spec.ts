import { expect, test } from '@playwright/test'

import { gotoWeeklyPlannerForFirstRunner } from '../utils/test-helpers'

/**
 * E2E Test: Weekly Planner Workout Persistence
 *
 * This test verifies that workouts added in the weekly planner:
 * 1. Are saved to the database (not just local React state)
 * 2. Persist across page refreshes
 * 3. Are loaded correctly from the database on subsequent visits
 *
 * Related to: fix/workout-persistence-hydration branch
 * Addresses: Race condition causing workouts to disappear on refresh
 */

test.describe('Weekly Planner Workout Persistence', () => {
  test.use({ storageState: './playwright/.auth/coach.json' })

  test('should persist workouts across page refresh', async ({ page }) => {
    // Navigate to weekly planner and select first runner
    await gotoWeeklyPlannerForFirstRunner(page)

    // Find Monday's card (first day of the week)
    const mondayCard = page.getByTestId('day-card-monday')
    await expect(mondayCard).toBeVisible({ timeout: 10000 })

    // STEP 1: Fill in workout type first (this will make More button appear)
    const workoutTypeSelect = mondayCard.getByTestId('workout-type-select-monday')
    await expect(workoutTypeSelect).toBeVisible({ timeout: 5000 })
    await workoutTypeSelect.click()

    // Wait for dropdown to open and option to be available
    const easyRunOption = page.getByRole('option', { name: 'Easy Run' })
    await expect(easyRunOption).toBeVisible({ timeout: 5000 })
    await easyRunOption.click()

    // Wait for the Select value to update (React re-render)
    await expect(workoutTypeSelect).toContainText(/easy run/i, { timeout: 5000 })

    // STEP 2: Now that workout type is selected, More button should appear
    const moreButton = mondayCard.getByRole('button', { name: /more/i })
    await expect(moreButton).toBeVisible({ timeout: 5000 })
    await moreButton.click()

    // STEP 3: Wait for expansion by checking that notes field becomes visible
    const workoutNotes = mondayCard.getByTestId('workout-notes-textarea-monday')
    await expect(workoutNotes).toBeVisible({ timeout: 2000 })

    // Fill in distance (always visible when workout type is not Rest)
    const workoutDistance = mondayCard.getByTestId('workout-distance-input-monday')
    await workoutDistance.fill('5')

    // STEP 4: Fill in notes (already visible since card is expanded)
    await workoutNotes.fill('Test workout - persistence check')

    // Save the week
    const saveButton = page.getByRole('button', { name: /save week/i })
    await expect(saveButton).toBeVisible({ timeout: 5000 })
    await saveButton.click()

    // Wait for save to complete (look for success toast with flexible matching)
    await expect(page.getByRole('status')).toContainText(/saved|success/i, { timeout: 10000 })

    // Refresh the page to test persistence
    await page.reload()
    await expect(page.getByTestId('day-card-monday')).toBeVisible({ timeout: 10000 })

    // Verify the workout persisted after refresh
    const mondayCardAfterRefresh = page.getByTestId('day-card-monday')

    // Verify workout type persisted (Easy Run shows More button)
    const typeSelectAfterRefresh = mondayCardAfterRefresh.getByTestId('workout-type-select-monday')
    await expect(typeSelectAfterRefresh).toContainText(/easy run/i)

    // Expand the card to see notes (More button should exist for Easy Run)
    const moreButtonAfterRefresh = mondayCardAfterRefresh.getByRole('button', { name: /more/i })
    await expect(moreButtonAfterRefresh).toBeVisible({ timeout: 5000 })
    await moreButtonAfterRefresh.click()

    // Wait for expansion by checking that notes field becomes visible
    const notesAfterRefresh = mondayCardAfterRefresh.getByTestId('workout-notes-textarea-monday')
    await expect(notesAfterRefresh).toBeVisible({ timeout: 2000 })

    // Verify distance and notes persisted
    const distanceAfterRefresh = mondayCardAfterRefresh.getByTestId('workout-distance-input-monday')

    await expect(distanceAfterRefresh).toHaveValue('5')
    await expect(notesAfterRefresh).toHaveValue('Test workout - persistence check')
  })

  test('should load workouts from database on initial visit', async ({ page, context }) => {
    // First visit: Add a workout
    await gotoWeeklyPlannerForFirstRunner(page)
    const currentUrl = page.url()

    const mondayCard = page.getByTestId('day-card-monday')
    await expect(mondayCard).toBeVisible({ timeout: 10000 })

    // Fill in workout using HeroUI components (select type first)
    const workoutTypeSelect = mondayCard.getByTestId('workout-type-select-monday')
    await workoutTypeSelect.click()
    await page.getByRole('option', { name: 'Tempo Run' }).click()

    // Now that workout type is selected, expand the card to access all fields
    const moreButton = mondayCard.getByRole('button', { name: /more/i })
    await expect(moreButton).toBeVisible({ timeout: 5000 })
    await moreButton.click()

    await mondayCard.getByTestId('workout-distance-input-monday').fill('8')
    await mondayCard.getByTestId('workout-notes-textarea-monday').fill('Tempo run test')

    await page.getByRole('button', { name: /save week/i }).click()
    await expect(page.getByRole('status')).toContainText(/saved|success/i, { timeout: 10000 })

    // Close the page to clear React state
    await page.close()

    // Create a new page with fresh browser context
    const newPage = await context.newPage()

    // Navigate directly to the same runner's weekly planner
    await newPage.goto(currentUrl)

    // Verify the workout loads from the database (not from local state)
    const mondayCardNew = newPage.getByTestId('day-card-monday')
    await expect(mondayCardNew).toBeVisible({ timeout: 10000 })

    // Expand the card to see all fields
    const moreButtonNew = mondayCardNew.getByRole('button', { name: /more/i })
    if (await moreButtonNew.isVisible()) {
      await moreButtonNew.click()
    }

    // Verify persisted data
    const typeSelectNew = mondayCardNew.getByTestId('workout-type-select-monday')
    await expect(typeSelectNew).toContainText(/tempo run/i)

    await expect(mondayCardNew.getByTestId('workout-distance-input-monday')).toHaveValue('8')
    await expect(mondayCardNew.getByTestId('workout-notes-textarea-monday')).toHaveValue(
      'Tempo run test'
    )

    await newPage.close()
  })

  test('should handle multiple workouts in a week', async ({ page }) => {
    await gotoWeeklyPlannerForFirstRunner(page)

    // Add workouts to multiple days
    const dayNames = ['monday', 'wednesday', 'saturday']
    const workoutData = [
      { type: 'Easy Run', distance: '5', notes: 'Easy Monday' },
      { type: 'Tempo Run', distance: '8', notes: 'Tempo Wednesday' },
      { type: 'Long Run', distance: '15', notes: 'Long Saturday' },
    ]

    for (let i = 0; i < dayNames.length; i++) {
      const dayName = dayNames[i]
      const workout = workoutData[i]
      const dayCard = page.getByTestId(`day-card-${dayName}`)

      await expect(dayCard).toBeVisible({ timeout: 5000 })

      // Fill in workout using HeroUI components (select type first)
      const typeSelect = dayCard.getByTestId(`workout-type-select-${dayName}`)
      await typeSelect.click()
      await page.getByRole('option', { name: workout.type }).click()

      // Now that workout type is selected, expand card to access all fields
      const moreButton = dayCard.getByRole('button', { name: /more/i })
      await expect(moreButton).toBeVisible({ timeout: 5000 })
      await moreButton.click()

      await dayCard.getByTestId(`workout-distance-input-${dayName}`).fill(workout.distance)
      await dayCard.getByTestId(`workout-notes-textarea-${dayName}`).fill(workout.notes)
    }

    // Save the week
    await page.getByRole('button', { name: /save week/i }).click()
    await expect(page.getByRole('status')).toContainText(/saved|success/i, { timeout: 10000 })

    // Refresh and verify all workouts persisted
    await page.reload()

    for (let i = 0; i < dayNames.length; i++) {
      const dayName = dayNames[i]
      const workout = workoutData[i]
      const dayCard = page.getByTestId(`day-card-${dayName}`)

      await expect(dayCard).toBeVisible({ timeout: 10000 })

      // Verify workout type persisted first (this determines if More button appears)
      const typeSelect = dayCard.getByTestId(`workout-type-select-${dayName}`)
      await expect(typeSelect).toContainText(workout.type)

      // Now expand card to see all fields (More button appears for non-Rest workouts)
      const moreButton = dayCard.getByRole('button', { name: /more/i })
      await expect(moreButton).toBeVisible({ timeout: 5000 })
      await moreButton.click()

      await expect(dayCard.getByTestId(`workout-distance-input-${dayName}`)).toHaveValue(
        workout.distance
      )
      await expect(dayCard.getByTestId(`workout-notes-textarea-${dayName}`)).toHaveValue(
        workout.notes
      )
    }
  })

  /**
   * CRITICAL TEST: Immediate Reload (No Cache Expiry Wait)
   *
   * This test reloads IMMEDIATELY after save without waiting 1 second.
   * Before the cache fix, this test would FAIL because the 1-second cache
   * would return empty/stale data on immediate reload.
   *
   * This test verifies the fix in commit e822b9c where we:
   * 1. Removed the 1-second workoutsCache that caused stale data
   * 2. Read directly from asyncWorkoutsAtom instead of synced workoutsAtom
   * 3. Trigger refresh via refreshWorkoutsAtom (Jotai setter pattern - no await needed)
   * Result: Immediate refetch of fresh data without cache interference
   */
  test('should persist workouts on immediate reload (cache race condition test)', async ({
    page,
  }) => {
    // Navigate to weekly planner and select first runner
    await gotoWeeklyPlannerForFirstRunner(page)

    // Add a workout to Monday
    const mondayCard = page.getByTestId('day-card-monday')
    await expect(mondayCard).toBeVisible({ timeout: 10000 })

    // Expand card to access all fields
    const moreButton = mondayCard.getByRole('button', { name: /more/i })
    if (await moreButton.isVisible()) {
      await moreButton.click()
    }

    // Fill in workout using HeroUI components
    const typeSelect = mondayCard.getByTestId('workout-type-select-monday')
    await typeSelect.click()
    await page.getByRole('option', { name: 'Interval Training' }).click()

    await mondayCard.getByTestId('workout-distance-input-monday').fill('10')
    await mondayCard
      .getByTestId('workout-notes-textarea-monday')
      .fill('Immediate reload test - no cache wait')

    // Save the week
    await page.getByRole('button', { name: /save week/i }).click()
    await expect(page.getByRole('status')).toContainText(/saved|success/i, { timeout: 10000 })

    // CRITICAL: Reload IMMEDIATELY without waiting for cache to expire
    // Before cache fix: This would FAIL (workouts disappear)
    // After cache fix: This should PASS (workouts persist)
    await page.reload()

    // Verify workout persisted on immediate reload
    const mondayCardAfterReload = page.getByTestId('day-card-monday')
    await expect(mondayCardAfterReload).toBeVisible({ timeout: 10000 })

    // Expand card to see all fields
    const moreButtonAfterReload = mondayCardAfterReload.getByRole('button', { name: /more/i })
    if (await moreButtonAfterReload.isVisible()) {
      await moreButtonAfterReload.click()
    }

    // Verify data persisted
    const typeSelectAfterReload = mondayCardAfterReload.getByTestId('workout-type-select-monday')
    await expect(typeSelectAfterReload).toContainText(/interval training/i)

    await expect(mondayCardAfterReload.getByTestId('workout-distance-input-monday')).toHaveValue(
      '10'
    )
    await expect(mondayCardAfterReload.getByTestId('workout-notes-textarea-monday')).toHaveValue(
      'Immediate reload test - no cache wait'
    )
  })

  /**
   * CRITICAL TEST: Multiple Rapid Reloads
   *
   * This test performs 3 rapid reloads in succession to ensure
   * data consistency under rapid refresh conditions.
   *
   * Before the cache fix, this would be flaky due to race conditions
   * between cache expiry and fresh data fetching.
   */
  test('should maintain consistency across multiple rapid reloads', async ({ page }) => {
    // Navigate to weekly planner and select first runner
    await gotoWeeklyPlannerForFirstRunner(page)

    // Add workouts to two days
    const dayNames = ['monday', 'wednesday']
    const workoutData = [
      { type: 'Easy Run', distance: '6', notes: 'Rapid reload test - Monday' },
      { type: 'Tempo Run', distance: '12', notes: 'Rapid reload test - Wednesday' },
    ]

    for (let i = 0; i < dayNames.length; i++) {
      const dayName = dayNames[i]
      const workout = workoutData[i]
      const dayCard = page.getByTestId(`day-card-${dayName}`)

      await expect(dayCard).toBeVisible({ timeout: 5000 })

      // Fill in workout using HeroUI components (select type first)
      const typeSelect = dayCard.getByTestId(`workout-type-select-${dayName}`)
      await typeSelect.click()
      await page.getByRole('option', { name: workout.type }).click()

      // Now that workout type is selected, expand card to access all fields
      const moreButton = dayCard.getByRole('button', { name: /more/i })
      await expect(moreButton).toBeVisible({ timeout: 5000 })
      await moreButton.click()

      await dayCard.getByTestId(`workout-distance-input-${dayName}`).fill(workout.distance)
      await dayCard.getByTestId(`workout-notes-textarea-${dayName}`).fill(workout.notes)
    }

    // Save the week
    await page.getByRole('button', { name: /save week/i }).click()
    await expect(page.getByRole('status')).toContainText(/saved|success/i, { timeout: 10000 })

    // Perform 3 rapid reloads and verify consistency
    for (let i = 1; i <= 3; i++) {
      await page.reload()

      // Wait for first day card to be visible as readiness indicator
      await expect(page.getByTestId('day-card-monday')).toBeVisible({ timeout: 10000 })

      for (let j = 0; j < dayNames.length; j++) {
        const dayName = dayNames[j]
        const workout = workoutData[j]
        const dayCard = page.getByTestId(`day-card-${dayName}`)

        await expect(dayCard).toBeVisible({ timeout: 5000 })

        // Expand card to see all fields
        const moreButton = dayCard.getByRole('button', { name: /more/i })
        if (await moreButton.isVisible()) {
          await moreButton.click()
        }

        // Verify data persisted
        const typeSelect = dayCard.getByTestId(`workout-type-select-${dayName}`)
        await expect(typeSelect).toContainText(workout.type)

        await expect(dayCard.getByTestId(`workout-distance-input-${dayName}`)).toHaveValue(
          workout.distance
        )
        await expect(dayCard.getByTestId(`workout-notes-textarea-${dayName}`)).toHaveValue(
          workout.notes
        )
      }
    }
  })
})
