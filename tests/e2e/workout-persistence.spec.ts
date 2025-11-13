import { expect, test } from '@playwright/test'

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
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3001'

    // Navigate to weekly planner
    await page.goto(`${baseUrl}/weekly-planner`)
    await page.waitForLoadState('networkidle')

    // Select a runner from the grid (first available runner)
    const runnerCard = page.locator('[data-testid*="runner-card"]').first()
    await expect(runnerCard).toBeVisible({ timeout: 10000 })
    await runnerCard.click()

    // Wait for weekly planner to load
    await page.waitForURL(/\/weekly-planner\/[a-f0-9-]+/)
    await page.waitForLoadState('networkidle')

    // Find Monday's card (first day of the week)
    const mondayCard = page.locator('[data-testid*="day-card"]').first()
    await expect(mondayCard).toBeVisible({ timeout: 10000 })

    // Fill in workout details for Monday
    const workoutType = mondayCard.locator('select[name="type"]')
    const workoutDistance = mondayCard.locator('input[name="distance"]')
    const workoutNotes = mondayCard.locator('textarea[name="notes"]')

    await expect(workoutType).toBeVisible({ timeout: 5000 })

    await workoutType.selectOption('easy')
    await workoutDistance.fill('5')
    await workoutNotes.fill('Test workout - persistence check')

    // Save the week
    const saveButton = page.getByRole('button', { name: /save week/i })
    await expect(saveButton).toBeVisible({ timeout: 5000 })
    await saveButton.click()

    // Wait for save to complete (look for success toast)
    await expect(page.locator('text=Week saved successfully')).toBeVisible({ timeout: 10000 })

    // Give database time to commit the transaction
    await page.waitForTimeout(1000)

    // Refresh the page to test persistence
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify the workout is still there after refresh
    const mondayCardAfterRefresh = page.locator('[data-testid*="day-card"]').first()
    await expect(mondayCardAfterRefresh).toBeVisible({ timeout: 10000 })

    // Check that the workout data persisted
    const typeAfterRefresh = mondayCardAfterRefresh.locator('select[name="type"]')
    const distanceAfterRefresh = mondayCardAfterRefresh.locator('input[name="distance"]')
    const notesAfterRefresh = mondayCardAfterRefresh.locator('textarea[name="notes"]')

    await expect(typeAfterRefresh).toHaveValue('easy')
    await expect(distanceAfterRefresh).toHaveValue('5')
    await expect(notesAfterRefresh).toHaveValue('Test workout - persistence check')
  })

  test('should load workouts from database on initial visit', async ({ page, context }) => {
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3001'

    // First visit: Add a workout
    await page.goto(`${baseUrl}/weekly-planner`)
    await page.waitForLoadState('networkidle')

    const runnerCard = page.locator('[data-testid*="runner-card"]').first()
    await expect(runnerCard).toBeVisible({ timeout: 10000 })
    await runnerCard.click()

    await page.waitForURL(/\/weekly-planner\/[a-f0-9-]+/)
    const currentUrl = page.url()
    await page.waitForLoadState('networkidle')

    const mondayCard = page.locator('[data-testid*="day-card"]').first()
    await mondayCard.locator('select[name="type"]').selectOption('tempo')
    await mondayCard.locator('input[name="distance"]').fill('8')
    await mondayCard.locator('textarea[name="notes"]').fill('Tempo run test')

    await page.getByRole('button', { name: /save week/i }).click()
    await expect(page.locator('text=Week saved successfully')).toBeVisible({ timeout: 10000 })

    // Close the page to clear React state
    await page.close()

    // Create a new page with fresh browser context
    const newPage = await context.newPage()

    // Navigate directly to the same runner's weekly planner
    await newPage.goto(currentUrl)
    await newPage.waitForLoadState('networkidle')

    // Verify the workout loads from the database (not from local state)
    const mondayCardNew = newPage.locator('[data-testid*="day-card"]').first()
    await expect(mondayCardNew).toBeVisible({ timeout: 10000 })

    await expect(mondayCardNew.locator('select[name="type"]')).toHaveValue('tempo')
    await expect(mondayCardNew.locator('input[name="distance"]')).toHaveValue('8')
    await expect(mondayCardNew.locator('textarea[name="notes"]')).toHaveValue('Tempo run test')

    await newPage.close()
  })

  test('should handle multiple workouts in a week', async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3001'

    await page.goto(`${baseUrl}/weekly-planner`)
    await page.waitForLoadState('networkidle')

    const runnerCard = page.locator('[data-testid*="runner-card"]').first()
    await runnerCard.click()

    await page.waitForURL(/\/weekly-planner\/[a-f0-9-]+/)
    await page.waitForLoadState('networkidle')

    // Add workouts to multiple days
    const dayCards = page.locator('[data-testid*="day-card"]')
    const workoutData = [
      { type: 'easy', distance: '5', notes: 'Easy Monday' },
      { type: 'tempo', distance: '8', notes: 'Tempo Wednesday' },
      { type: 'long_run', distance: '15', notes: 'Long Saturday' },
    ]

    // Add workouts to days 0, 2, and 5 (Monday, Wednesday, Saturday)
    const dayIndices = [0, 2, 5]

    for (let i = 0; i < dayIndices.length; i++) {
      const dayIndex = dayIndices[i]
      const workout = workoutData[i]
      const dayCard = dayCards.nth(dayIndex)

      await dayCard.locator('select[name="type"]').selectOption(workout.type)
      await dayCard.locator('input[name="distance"]').fill(workout.distance)
      await dayCard.locator('textarea[name="notes"]').fill(workout.notes)
    }

    // Save the week
    await page.getByRole('button', { name: /save week/i }).click()
    await expect(page.locator('text=Week saved successfully')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    // Refresh and verify all workouts persisted
    await page.reload()
    await page.waitForLoadState('networkidle')

    const dayCardsAfterRefresh = page.locator('[data-testid*="day-card"]')

    for (let i = 0; i < dayIndices.length; i++) {
      const dayIndex = dayIndices[i]
      const workout = workoutData[i]
      const dayCard = dayCardsAfterRefresh.nth(dayIndex)

      await expect(dayCard.locator('select[name="type"]')).toHaveValue(workout.type)
      await expect(dayCard.locator('input[name="distance"]')).toHaveValue(workout.distance)
      await expect(dayCard.locator('textarea[name="notes"]')).toHaveValue(workout.notes)
    }
  })
})
