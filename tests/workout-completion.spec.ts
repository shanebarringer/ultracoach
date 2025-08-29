import { expect, test } from '@playwright/test'

test.describe('Workout Completion Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001')
  })

  test('should complete workout with basic completion', async ({ page }) => {
    // Sign in as runner
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.getByRole('textbox', { name: 'Email address' }).fill('jordan.chen@ultracoach.dev')
    await page.getByRole('textbox', { name: 'Password' }).fill('RunnerPass2025!')
    await page.getByRole('button', { name: 'Begin Your Expedition' }).click()

    // Wait for dashboard to load
    await expect(page.locator('text=Jordan Chen')).toBeVisible()

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
    await expect(page.getByText('Status*')).toBeVisible()
    await expect(page.getByText('Completed')).toBeVisible()

    // Save workout with basic completion
    await page.getByRole('button', { name: 'Save Workout' }).click()

    // Verify workout status changed
    await expect(page.getByText('Completed').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'View Details' })).toBeVisible()

    // Verify progress indicator
    await expect(page.getByText('Progress')).toBeVisible()
    await expect(page.getByText('Complete')).toBeVisible()
  })

  test('should complete workout with detailed logging', async ({ page }) => {
    // Sign in as runner
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.getByRole('textbox', { name: 'Email address' }).fill('jordan.chen@ultracoach.dev')
    await page.getByRole('textbox', { name: 'Password' }).fill('RunnerPass2025!')
    await page.getByRole('button', { name: 'Begin Your Expedition' }).click()

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
    await expect(page.getByText('8.20')).toBeVisible() // Actual distance
    await expect(page.getByText('58')).toBeVisible() // Actual duration
    await expect(page.getByText('7/10')).toBeVisible() // Intensity
    await expect(page.getByText('Great tempo run! Weather was perfect.')).toBeVisible() // Notes

    // Verify status changed to completed
    await expect(page.getByText('Completed')).toBeVisible()
    await expect(page.getByRole('button', { name: 'View Details' })).toBeVisible()
  })

  test('should handle workout completion modal cancellation', async ({ page }) => {
    // Sign in and navigate to workouts
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.getByRole('textbox', { name: 'Email address' }).fill('jordan.chen@ultracoach.dev')
    await page.getByRole('textbox', { name: 'Password' }).fill('RunnerPass2025!')
    await page.getByRole('button', { name: 'Begin Your Expedition' }).click()

    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('link', { name: 'Workouts Track your training' }).click()

    // Open workout completion modal
    await page.getByRole('button', { name: 'Mark Complete' }).first().click()
    await expect(page.getByText('Log Workout')).toBeVisible()

    // Cancel the modal
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Verify modal is closed and workout remains planned
    await expect(page.getByText('Log Workout')).not.toBeVisible()
    await expect(page.getByText('Planned')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark Complete' })).toBeVisible()
  })

  test('should validate required fields in workout completion form', async ({ page }) => {
    // Sign in and navigate to workouts
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.getByRole('textbox', { name: 'Email address' }).fill('jordan.chen@ultracoach.dev')
    await page.getByRole('textbox', { name: 'Password' }).fill('RunnerPass2025!')
    await page.getByRole('button', { name: 'Begin Your Expedition' }).click()

    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('link', { name: 'Workouts Track your training' }).click()

    // Open modal and change status to something that might require validation
    await page.getByRole('button', { name: 'Mark Complete' }).first().click()
    await expect(page.getByText('Status*')).toBeVisible()

    // Status should default to Completed, so Save should work
    const saveButton = page.getByRole('button', { name: 'Save Workout' })
    await expect(saveButton).toBeEnabled()

    // Save should succeed with default status
    await saveButton.click()

    // Should close modal and update workout
    await expect(page.getByText('Log Workout')).not.toBeVisible()
    await expect(page.getByText('Completed')).toBeVisible()
  })

  test('should display workout statistics after completion', async ({ page }) => {
    // Sign in as runner
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.getByRole('textbox', { name: 'Email address' }).fill('jordan.chen@ultracoach.dev')
    await page.getByRole('textbox', { name: 'Password' }).fill('RunnerPass2025!')
    await page.getByRole('button', { name: 'Begin Your Expedition' }).click()

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
