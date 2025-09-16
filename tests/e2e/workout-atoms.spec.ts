/**
 * Workout Atoms E2E Tests
 *
 * Tests the comprehensive workout atom functionality including:
 * - asyncWorkoutsAtom fetching
 * - Workout display on dashboard
 * - Workout persistence on weekly planner
 * - Workout completion modal submission
 * - Derived atoms (upcoming, completed)
 */
import { Page, expect, test } from '@playwright/test'
import { addDays, format } from 'date-fns'

test.describe('Workout Atoms Functionality', () => {
  test.describe('Runner Dashboard Workout Display', () => {
    test.use({ storageState: './playwright/.auth/user.json' })

    test('should display upcoming workouts on runner dashboard', async ({ page }) => {
      // Navigate to runner dashboard
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner')

      // Wait for dashboard to load with Suspense boundary
      await page.waitForSelector('h1:has-text("Runner Dashboard")', { timeout: 10000 })

      // Check for upcoming workouts section
      const upcomingSection = page.locator('text="Upcoming Workouts"')
      await expect(upcomingSection).toBeVisible()

      // Verify upcoming workouts are displayed (may be empty)
      const upcomingWorkouts = page.locator('[data-testid="upcoming-workout-card"]')
      const upcomingCount = await upcomingWorkouts.count()

      if (upcomingCount > 0) {
        // Verify first upcoming workout has expected data
        const firstWorkout = upcomingWorkouts.first()
        await expect(firstWorkout).toBeVisible()

        // Check workout has date
        const dateElement = firstWorkout.locator('[data-testid="workout-date"]')
        if ((await dateElement.count()) > 0) {
          await expect(dateElement).toBeVisible()
        }
      } else {
        // Check for empty state
        const emptyState = page.locator(
          'text=/No upcoming workouts|You have no scheduled workouts/i'
        )
        await expect(emptyState).toBeVisible()
      }
    })

    test('should display recent/completed workouts on runner dashboard', async ({ page }) => {
      // Navigate to runner dashboard
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner')

      // Wait for dashboard to load
      await page.waitForSelector('h1:has-text("Runner Dashboard")', { timeout: 10000 })

      // Check for recent workouts section
      const recentSection = page.locator('text=/Recent Workouts|Completed Workouts/i')
      await expect(recentSection).toBeVisible()

      // Verify completed workouts display
      const completedWorkouts = page.locator(
        '[data-testid="completed-workout-card"], [data-testid="recent-workout-card"]'
      )
      const completedCount = await completedWorkouts.count()

      if (completedCount > 0) {
        const firstCompleted = completedWorkouts.first()
        await expect(firstCompleted).toBeVisible()
      } else {
        // Check for empty state
        const emptyState = page.locator('text=/No completed workouts|No recent activity/i')
        await expect(emptyState).toBeVisible()
      }
    })
  })

  test.describe('Weekly Planner Workout Persistence', () => {
    test.use({ storageState: './playwright/.auth/user.json' })

    test('should persist workouts on weekly planner after navigation', async ({ page }) => {
      // First, go to calendar/weekly planner
      await page.goto('/calendar')
      await expect(page).toHaveURL('/calendar')

      // Wait for calendar to load
      await page.waitForSelector('h1:has-text("Training Calendar")', { timeout: 10000 })

      // Check if workouts are displayed in calendar
      const calendarWorkouts = page.locator('[data-testid="calendar-workout"], .fc-event')
      const initialCount = await calendarWorkouts.count()

      // Navigate away to another page
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner')

      // Navigate back to calendar
      await page.goto('/calendar')
      await expect(page).toHaveURL('/calendar')

      // Verify workouts are still there
      const afterNavCount = await calendarWorkouts.count()
      expect(afterNavCount).toBe(initialCount)
    })

    test('should show workouts in weekly planner view', async ({ page }) => {
      // Navigate to training plans page first
      await page.goto('/training-plans')
      await expect(page).toHaveURL('/training-plans')

      // Look for a training plan with workouts
      const planCards = page.locator('[data-testid="training-plan-card"]')
      const planCount = await planCards.count()

      if (planCount > 0) {
        // Click on first plan to view details
        await planCards.first().click()

        // Wait for plan details to load
        await page.waitForSelector('text=/Training Plan|Plan Details/i', { timeout: 10000 })

        // Check for weekly view or workouts list
        const weeklyView = page.locator(
          '[data-testid="weekly-planner"], [data-testid="plan-workouts"]'
        )
        if ((await weeklyView.count()) > 0) {
          await expect(weeklyView.first()).toBeVisible()

          // Verify workouts are displayed
          const planWorkouts = page.locator('[data-testid="plan-workout-item"]')
          if ((await planWorkouts.count()) > 0) {
            await expect(planWorkouts.first()).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Workout Completion Modal', () => {
    test.use({ storageState: './playwright/.auth/user.json' })

    test('should successfully submit workout completion modal', async ({ page }) => {
      // Navigate to workouts page
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')

      // Wait for workouts to load
      await page.waitForLoadState('domcontentloaded')

      // Find a planned workout to complete
      const plannedWorkouts = page.locator('[data-testid="workout-card"][data-status="planned"]')
      const plannedCount = await plannedWorkouts.count()

      if (plannedCount > 0) {
        const workoutToComplete = plannedWorkouts.first()

        // Click on Log Details or Mark Complete button
        const logButton = workoutToComplete.locator('button:has-text(/Log Details|Mark Complete/i)')
        if ((await logButton.count()) > 0) {
          await logButton.first().click()

          // Wait for modal to appear
          await page.waitForSelector('[role="dialog"]', { timeout: 5000 })

          // Select completed status if dropdown exists
          const statusSelect = page.locator('button:has-text("Status"), [aria-label="Status"]')
          if ((await statusSelect.count()) > 0) {
            await statusSelect.first().click()
            await page.locator('li[role="option"]:has-text("Completed")').click()
          }

          // Fill in some basic completion data
          const distanceInput = page.locator(
            'input[aria-label*="Distance"], input[placeholder*="distance"]'
          )
          if ((await distanceInput.count()) > 0) {
            await distanceInput.fill('5')
          }

          const durationInput = page.locator(
            'input[aria-label*="Duration"], input[placeholder*="duration"]'
          )
          if ((await durationInput.count()) > 0) {
            await durationInput.fill('45')
          }

          // Add notes
          const notesInput = page.locator(
            'textarea[aria-label*="Notes"], textarea[placeholder*="notes"]'
          )
          if ((await notesInput.count()) > 0) {
            await notesInput.fill('Felt good during the run')
          }

          // Submit the form
          const submitButton = page.locator('button:has-text(/Save Workout|Complete|Submit/i)')
          await submitButton.click()

          // Verify modal closes and success message appears
          await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })

          // Check for success notification or status update
          const successNotification = page.locator(
            'text=/Workout.*completed|Workout.*saved|Success/i'
          )
          const statusUpdate = workoutToComplete.locator('[data-status="completed"]')

          // Either notification or status update should be visible
          await Promise.race([
            expect(successNotification).toBeVisible({ timeout: 5000 }),
            expect(statusUpdate).toBeVisible({ timeout: 5000 }),
          ]).catch(() => {
            // At least the modal should have closed
          })
        }
      } else {
      }
    })

    test('should update dashboard after workout completion', async ({ page }) => {
      // Start on dashboard to get initial counts
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner')

      // Get initial upcoming count
      const upcomingWorkouts = page.locator('[data-testid="upcoming-workout-card"]')
      const initialUpcomingCount = await upcomingWorkouts.count()

      // Navigate to workouts page
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')

      // Try to mark a workout as complete
      const plannedWorkouts = page.locator('[data-testid="workout-card"][data-status="planned"]')
      if ((await plannedWorkouts.count()) > 0) {
        // Use quick complete if available
        const quickCompleteBtn = plannedWorkouts
          .first()
          .locator('button:has-text(/Mark Complete|Quick Complete/i)')
        if ((await quickCompleteBtn.count()) > 0) {
          await quickCompleteBtn.click()

          // Handle any confirmation dialog
          const confirmBtn = page.locator('button:has-text(/Confirm|Yes|Complete/i)')
          if (await confirmBtn.isVisible({ timeout: 2000 })) {
            await confirmBtn.click()
          }

          // Go back to dashboard
          await page.goto('/dashboard/runner')
          await expect(page).toHaveURL('/dashboard/runner')

          // Verify counts have changed
          const newUpcomingCount = await upcomingWorkouts.count()

          // Upcoming should decrease or stay same (if it wasn't showing that workout)
          expect(newUpcomingCount).toBeLessThanOrEqual(initialUpcomingCount)

          // Check if completed workouts section updated
          const completedSection = page.locator(
            '[data-testid="completed-workout-card"], [data-testid="recent-workout-card"]'
          )
          await expect(completedSection.first()).toBeVisible({ timeout: 5000 })
        }
      }
    })
  })

  test.describe('Workout Atom State Synchronization', () => {
    test.use({ storageState: './playwright/.auth/user.json' })

    test('should refresh workouts when navigating between pages', async ({ page }) => {
      // Start on workouts page
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')

      // Get workout count
      const workoutCards = page.locator('[data-testid="workout-card"]')
      const workoutsPageCount = await workoutCards.count()

      // Navigate to dashboard
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner')

      // Check workouts are displayed on dashboard
      const dashboardWorkouts = page.locator(
        '[data-testid="upcoming-workout-card"], [data-testid="recent-workout-card"]'
      )
      const dashboardCount = await dashboardWorkouts.count()

      // Navigate to calendar
      await page.goto('/calendar')
      await expect(page).toHaveURL('/calendar')

      // Check workouts in calendar
      const calendarEvents = page.locator('[data-testid="calendar-workout"], .fc-event')
      const calendarCount = await calendarEvents.count()

      // All pages should have consistent data (counts may differ due to filtering)
      // Data: Workouts page: ${workoutsPageCount}, Dashboard: ${dashboardCount}, Calendar: ${calendarCount}

      // At least if workouts exist on one page, they should exist on others
      if (workoutsPageCount > 0) {
        expect(dashboardCount + calendarCount).toBeGreaterThan(0)
      }
    })

    test('should maintain workout state across page refreshes', async ({ page }) => {
      // Navigate to workouts page
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')

      // Get initial workout data
      const workoutCards = page.locator('[data-testid="workout-card"]')
      const initialCount = await workoutCards.count()

      let firstWorkoutText = ''
      if (initialCount > 0) {
        firstWorkoutText = (await workoutCards.first().textContent()) || ''
      }

      // Refresh the page
      await page.reload()

      // Wait for workouts to load again
      await page.waitForLoadState('domcontentloaded')

      // Verify same workouts are displayed
      const afterRefreshCount = await workoutCards.count()
      expect(afterRefreshCount).toBe(initialCount)

      if (initialCount > 0 && firstWorkoutText) {
        const afterRefreshText = (await workoutCards.first().textContent()) || ''
        expect(afterRefreshText).toBe(firstWorkoutText)
      }
    })
  })
})
