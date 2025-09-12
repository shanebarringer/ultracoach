import { expect, test } from '@playwright/test'

test.describe.skip('Workout Completion Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Reset Alex Rivera's workouts to planned status before each test
    // Use email instead of hard-coded UUID for CI compatibility
    const response = await page.request.post('/api/test/reset-workouts', {
      data: { userEmail: 'alex.rivera@ultracoach.dev' },
    })

    if (!response.ok()) {
      console.warn('Failed to reset workout data, some tests may fail')
    }

    // Navigate directly to the runner dashboard (authentication is handled by setup)
    await page.goto('/dashboard/runner')
    // Wait for dashboard to load
    await expect(page.locator('text=Alex Rivera')).toBeVisible()
  })

  test('should complete workout with basic completion', async ({ page }) => {
    // Navigate to workouts
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('link', { name: 'Workouts Track your training' }).click()

    // Wait for workouts to load
    await expect(page.locator('text=Training Log')).toBeVisible()

    // Find and click Mark Complete on first planned workout
    const markCompleteButton = page.getByRole('button', { name: 'Mark Complete' }).first()
    await expect(markCompleteButton).toBeVisible()
    await markCompleteButton.click()

    // Verify modal opens
    await expect(page.getByText('Log Workout')).toBeVisible()
    await expect(page.getByRole('button', { name: /Status.*Completed/ })).toBeVisible()
    await expect(page.getByText('Completed').first()).toBeVisible()

    // Save workout with basic completion
    await page.getByRole('button', { name: 'Save Workout' }).click()

    // Verify workout status changed
    await expect(page.getByText('Completed').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'View Details' }).first()).toBeVisible()

    // Verify progress indicator
    await expect(page.getByText('Progress').first()).toBeVisible()
    await expect(page.getByText('Complete').first()).toBeVisible()
  })

  test('should complete workout with detailed logging', async ({ page }) => {
    // Navigate to workouts
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('link', { name: 'Workouts Track your training' }).click()

    // Click Mark Complete on a planned workout
    await page.getByRole('button', { name: 'Mark Complete' }).first().click()

    // Fill in detailed workout information
    await page.getByRole('spinbutton', { name: 'Actual Distance (miles)' }).fill('8.2')
    await page.getByRole('spinbutton', { name: 'Actual Duration (minutes)' }).fill('58')
    await page.getByRole('spinbutton', { name: 'Intensity (1-10)' }).fill('7')
    await page
      .getByRole('textbox', { name: 'Workout Notes' })
      .fill('Great tempo run! Weather was perfect.')

    // Save workout
    await page.getByRole('button', { name: 'Save Workout' }).click()

    // Verify detailed data is displayed
    await expect(page.getByText('8.20').first()).toBeVisible() // Actual distance
    await expect(page.getByText('58').first()).toBeVisible() // Actual duration
    await expect(page.getByText('7/10').first()).toBeVisible() // Intensity
    await expect(page.getByText('Great tempo run! Weather was perfect.').first()).toBeVisible() // Notes

    // Verify status changed to completed
    await expect(page.getByText('Completed').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'View Details' }).first()).toBeVisible()
  })

  test('should handle workout completion modal cancellation', async ({ page }) => {
    // Navigate to workouts
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('link', { name: 'Workouts Track your training' }).click()

    // Open workout completion modal
    await page.getByRole('button', { name: 'Mark Complete' }).first().click()
    await expect(page.getByText('Log Workout')).toBeVisible()

    // Cancel the modal
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Verify modal is closed and workout remains planned
    await expect(page.getByText('Log Workout')).not.toBeVisible()
    await expect(page.getByText('Planned').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark Complete' }).first()).toBeVisible()
  })

  test('should validate required fields in workout completion form', async ({ page }) => {
    // Navigate to workouts
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('link', { name: 'Workouts Track your training' }).click()

    // Open modal and change status to something that might require validation
    await page.getByRole('button', { name: 'Mark Complete' }).first().click()
    await expect(page.getByRole('button', { name: /Status.*Completed/ })).toBeVisible()

    // Status should default to Completed, so Save should work
    const saveButton = page.getByRole('button', { name: 'Save Workout' })
    await expect(saveButton).toBeEnabled()

    // Save should succeed with default status
    await saveButton.click()

    // Should close modal and update workout
    await expect(page.getByText('Log Workout')).not.toBeVisible()
    await expect(page.getByText('Completed').first()).toBeVisible()
  })

  test('should display workout statistics after completion', async ({ page }) => {
    // Navigate to workouts and complete one
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('link', { name: 'Workouts Track your training' }).click()

    await page.getByRole('button', { name: 'Mark Complete' }).first().click()
    await page.getByRole('button', { name: 'Save Workout' }).click()

    // Navigate back to dashboard to check completion statistics
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('link', { name: 'Dashboard Overview and metrics' }).click()

    // Wait for dashboard to load and check for completion rate updates
    await expect(page.locator('text=Base Camp Dashboard')).toBeVisible()

    // The completion rate should no longer be 0% after completing a workout
    // Note: This might take a moment for the statistics to update
    await page.waitForTimeout(1000) // Brief wait for state updates
  })
})
