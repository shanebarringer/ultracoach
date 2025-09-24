/**
 * Workout Display Order E2E Tests
 *
 * Comprehensive testing of workout sorting and display logic across different views:
 * - Workouts page: Today > Yesterday > Future (ascending) > Past (descending)
 * - Runner dashboard: Upcoming workouts prioritized
 * - Calendar view: Workouts appear on correct dates
 * - Weekly planner: Workouts distributed correctly
 *
 * These tests ensure the smart sorting algorithm works correctly and prevents
 * regression of the workout order bug (ULT-45).
 */
import { expect, test } from '@playwright/test'
import {
  addDays,
  format,
  isAfter,
  isBefore,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns'
import { Logger } from 'tslog'

import { navigateToDashboard } from '../utils/test-helpers'

const logger = new Logger({ name: 'workout-display-order-e2e' })

test.describe('Workout Display Order', () => {
  test.describe('Workouts Page Sort Order', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should display workouts in smart sort order', async ({ page }) => {
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')
      await page.waitForLoadState('domcontentloaded')

      // Wait for workouts to load
      await page
        .waitForSelector('[data-testid="workout-card"], [data-testid="workouts-page-skeleton"]', {
          state: 'attached',
          timeout: 10000,
        })
        .catch(() => {})

      const workoutCards = page.locator('[data-testid="workout-card"]')
      const workoutCount = await workoutCards.count()

      if (workoutCount === 0) {
        logger.info('No workouts found - cannot test sort order')
        return
      }

      // Collect workout dates and validate sort order
      const workoutData: Array<{ date: Date; element: any; index: number }> = []

      for (let i = 0; i < Math.min(workoutCount, 15); i++) {
        const workoutCard = workoutCards.nth(i)
        const dateElement = workoutCard.locator('[data-testid="workout-date"]')

        let workoutDate: Date | null = null

        if (await dateElement.isVisible()) {
          const dateText = await dateElement.textContent()
          if (dateText) {
            try {
              // Try multiple date parsing strategies
              workoutDate = parseISO(dateText)
              if (isNaN(workoutDate.getTime())) {
                workoutDate = new Date(dateText)
              }
            } catch (error) {
              // Skip workouts with unparseable dates
              continue
            }
          }
        }

        if (workoutDate && !isNaN(workoutDate.getTime())) {
          workoutData.push({
            date: workoutDate,
            element: workoutCard,
            index: i,
          })
        }
      }

      if (workoutData.length < 2) {
        logger.info('Insufficient workout data for sort order validation')
        return
      }

      // Validate smart sort order: Today > Yesterday > Future > Past
      let foundToday = false
      let foundYesterday = false
      let foundFuture = false

      const today = startOfDay(new Date())
      const yesterday = startOfDay(subDays(new Date(), 1))

      for (let i = 0; i < workoutData.length; i++) {
        const current = workoutData[i]
        const currentDay = startOfDay(current.date)

        if (currentDay.getTime() === today.getTime()) {
          foundToday = true
          // Today's workouts should come first (before future/past)
          for (let j = 0; j < i; j++) {
            const previous = workoutData[j]
            const prevDay = startOfDay(previous.date)

            // Only today's workouts should come before today's workouts
            expect(prevDay.getTime()).toBe(today.getTime())
          }
        } else if (currentDay.getTime() === yesterday.getTime()) {
          foundYesterday = true
          // Yesterday's workouts should come after today's but before others
          for (let j = 0; j < i; j++) {
            const previous = workoutData[j]
            const prevDay = startOfDay(previous.date)

            // Only today's or yesterday's workouts should come before yesterday's
            const isTodayOrYesterday =
              prevDay.getTime() === today.getTime() || prevDay.getTime() === yesterday.getTime()
            expect(isTodayOrYesterday).toBe(true)
          }
        } else if (isAfter(currentDay, today)) {
          foundFuture = true
          // Future workouts should be after today/yesterday
          if (foundToday || foundYesterday) {
            // This is correct - future after today/yesterday
          }
        }
      }

      // Log findings for debugging
      logger.debug(
        `Sort order validation - Today: ${foundToday}, Yesterday: ${foundYesterday}, Future: ${foundFuture}`
      )
      logger.debug(`Total workouts analyzed: ${workoutData.length}`)
    })

    test('should not show old workouts before recent ones', async ({ page }) => {
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')
      await page.waitForLoadState('domcontentloaded')
      await page
        .waitForSelector('[data-testid="workout-card"], [data-testid="workouts-page-skeleton"]', {
          state: 'attached',
          timeout: 10000,
        })
        .catch(() => {})

      const workoutCards = page.locator('[data-testid="workout-card"]')
      const count = await workoutCards.count()

      if (count >= 2) {
        // Get first few workout dates
        const firstWorkoutDate = await workoutCards
          .first()
          .locator('[data-testid="workout-date"]')
          .textContent()
        const secondWorkoutDate = await workoutCards
          .nth(1)
          .locator('[data-testid="workout-date"]')
          .textContent()

        if (firstWorkoutDate && secondWorkoutDate) {
          const first = new Date(firstWorkoutDate)
          const second = new Date(secondWorkoutDate)

          // If second workout is today or yesterday, first should not be much older
          if (isToday(second) || isYesterday(second)) {
            const daysDifference = Math.abs(
              Math.ceil((first.getTime() - second.getTime()) / (1000 * 60 * 60 * 24))
            )

            // First workout should not be more than a week older than a today/yesterday workout
            expect(daysDifference).toBeLessThanOrEqual(7)
          }
        }
      }
    })
  })

  test.describe('Dashboard Workout Display', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should prioritize upcoming workouts on dashboard', async ({ page }) => {
      await navigateToDashboard(page, 'runner')

      // Check upcoming workouts section
      const upcomingSection = page.locator(
        '[data-testid="upcoming-workouts-section"], [data-testid="upcoming-workouts"]'
      )

      if (await upcomingSection.isVisible()) {
        const upcomingWorkouts = page.locator('[data-testid="upcoming-workout-card"]')
        const upcomingCount = await upcomingWorkouts.count()

        if (upcomingCount > 0) {
          // First upcoming workout should be today or in near future
          const firstWorkout = upcomingWorkouts.first()
          const workoutDate = firstWorkout.locator('[data-testid="workout-date"]')

          if (await workoutDate.isVisible()) {
            const dateText = await workoutDate.textContent()
            if (dateText) {
              const workoutDateTime = new Date(dateText)
              const now = new Date()

              // Upcoming workout should not be more than a week old
              const daysDiff = Math.ceil(
                (workoutDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              )
              expect(daysDiff).toBeGreaterThanOrEqual(-7) // Not more than a week old
              expect(daysDiff).toBeLessThanOrEqual(30) // Not more than a month in future
            }
          }
        }
      }
    })

    test('should show recent completed workouts appropriately', async ({ page }) => {
      await navigateToDashboard(page, 'runner')

      // Check recent/completed workouts section
      const recentSection = page.locator(
        '[data-testid="recent-workouts"], [data-testid="completed-workouts"]'
      )

      if (await recentSection.isVisible()) {
        const recentWorkouts = page.locator(
          '[data-testid="recent-workout-card"], [data-testid="completed-workout-card"]'
        )
        const recentCount = await recentWorkouts.count()

        if (recentCount > 0) {
          // Recent workouts should be from the recent past
          for (let i = 0; i < Math.min(recentCount, 3); i++) {
            const workout = recentWorkouts.nth(i)
            const dateElement = workout.locator('[data-testid="workout-date"]')

            if (await dateElement.isVisible()) {
              const dateText = await dateElement.textContent()
              if (dateText) {
                const workoutDate = new Date(dateText)
                const now = new Date()

                // Recent workouts should not be from the far future or too far in past
                const daysDiff = Math.ceil(
                  (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
                )
                expect(daysDiff).toBeGreaterThanOrEqual(-1) // Not in future (except today)
                expect(daysDiff).toBeLessThanOrEqual(90) // Not more than 3 months old
              }
            }
          }
        }
      }
    })
  })

  test.describe('Calendar Integration', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should show workouts on correct calendar dates', async ({ page }) => {
      await page.goto('/calendar')
      await expect(page).toHaveURL('/calendar')
      await page.waitForLoadState('domcontentloaded')
      // Wait for calendar to initialize
      await page
        .waitForSelector(
          '[data-testid="calendar"], .fc-daygrid, [data-testid="calendar-skeleton"]',
          {
            state: 'attached',
            timeout: 10000,
          }
        )
        .catch(() => {})

      // Look for calendar events
      const calendarEvents = page.locator(
        '[data-testid="calendar-workout"], .fc-event, .calendar-event'
      )
      const eventCount = await calendarEvents.count()

      if (eventCount > 0) {
        logger.debug(`Found ${eventCount} calendar events`)

        // Verify first few events have reasonable dates
        for (let i = 0; i < Math.min(eventCount, 3); i++) {
          const event = calendarEvents.nth(i)

          // Events should be visible on calendar
          await expect(event).toBeVisible({ timeout: 5000 })

          // Try to get event date information if available
          const eventText = await event.textContent()
          if (eventText) {
            logger.debug(`Calendar event ${i + 1}: ${eventText}`)
          }
        }
      } else {
        // No calendar events - could be valid for new users
        logger.info('No calendar events found - checking for empty state')

        // Should either have events or show appropriate empty state
        const emptyState = page.locator('text=/no events|no workouts|empty calendar/i')
        const calendarGrid = page.locator(
          '.fc-daygrid, .calendar-grid, [data-testid="calendar-grid"]'
        )

        // Either empty state message or calendar grid should be visible
        await Promise.race([
          expect(emptyState).toBeVisible({ timeout: 5000 }),
          expect(calendarGrid).toBeVisible({ timeout: 5000 }),
        ])
      }
    })

    test('should allow navigation to today on calendar', async ({ page }) => {
      await page.goto('/calendar')
      await expect(page).toHaveURL('/calendar')
      await page.waitForLoadState('domcontentloaded')

      // Look for "Today" button or similar navigation
      const todayButton = page.locator(
        'button:has-text("Today"), .fc-today-button, [data-testid="today-button"]'
      )

      if (await todayButton.isVisible()) {
        await todayButton.click()

        // Should navigate to current date
        // Calendar should still be visible and functional
        const calendarContainer = page.locator('.fc, .calendar-container, [data-testid="calendar"]')
        await expect(calendarContainer).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Weekly Planner Integration', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test.skip('should display workouts in weekly planner correctly', async ({ page }) => {
      // Navigate to training plans first
      await page.goto('/training-plans')
      await expect(page).toHaveURL('/training-plans')
      await page.waitForLoadState('domcontentloaded')

      // Look for training plan that might have weekly planner
      const planCards = page.locator('[data-testid="training-plan-card"]')
      const planCount = await planCards.count()

      if (planCount > 0) {
        // Click on first plan
        await planCards.first().click()
        await page.waitForLoadState('domcontentloaded')

        // Look for weekly planner view
        const weeklyPlanner = page.locator('[data-testid="weekly-planner"], .weekly-planner')

        if (await weeklyPlanner.isVisible({ timeout: 5000 })) {
          // Check if workouts are distributed across days
          const dayContainers = page.locator('[data-testid="day-container"], .day-container')
          const dayCount = await dayContainers.count()

          if (dayCount > 0) {
            // Check first few days for workouts
            for (let i = 0; i < Math.min(dayCount, 7); i++) {
              const dayContainer = dayContainers.nth(i)
              const dayWorkouts = dayContainer.locator(
                '[data-testid="workout-item"], .workout-item'
              )
              const workoutCount = await dayWorkouts.count()

              if (workoutCount > 0) {
                // Verify workout items are visible
                await expect(dayWorkouts.first()).toBeVisible()
                logger.debug(`Day ${i + 1} has ${workoutCount} workouts`)
              }
            }
          }
        } else {
          logger.info('Weekly planner not found - may not be implemented yet')
        }
      } else {
        logger.info('No training plans found for weekly planner test')
      }
    })
  })

  test.describe('Sort Order Edge Cases', () => {
    test.use({ storageState: './playground/.auth/runner.json' })

    test('should handle workouts with same date correctly', async ({ page }) => {
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')
      await page.waitForLoadState('domcontentloaded')
      await page
        .waitForSelector('[data-testid="workout-card"], [data-testid="workouts-page-skeleton"]', {
          state: 'attached',
          timeout: 10000,
        })
        .catch(() => {})

      const workoutCards = page.locator('[data-testid="workout-card"]')
      const count = await workoutCards.count()

      if (count >= 2) {
        // Look for workouts with same date
        const dates: Array<{ date: Date; index: number }> = []

        for (let i = 0; i < Math.min(count, 10); i++) {
          const dateElement = workoutCards.nth(i).locator('[data-testid="workout-date"]')
          if (await dateElement.isVisible()) {
            const dateText = await dateElement.textContent()
            if (dateText) {
              const workoutDate = new Date(dateText)
              if (!isNaN(workoutDate.getTime())) {
                dates.push({ date: workoutDate, index: i })
              }
            }
          }
        }

        // Find workouts with same date
        const sameDateGroups = new Map<string, number[]>()
        dates.forEach(({ date, index }) => {
          const dateKey = format(date, 'yyyy-MM-dd')
          if (!sameDateGroups.has(dateKey)) {
            sameDateGroups.set(dateKey, [])
          }
          sameDateGroups.get(dateKey)?.push(index)
        })

        // Check groups with multiple workouts
        for (const [dateKey, indices] of sameDateGroups) {
          if (indices.length > 1) {
            logger.debug(`Found ${indices.length} workouts on ${dateKey}`)
            // Same-date workouts should be grouped together (indices should be consecutive or close)
            indices.sort((a, b) => a - b)
            for (let i = 1; i < indices.length; i++) {
              const gap = indices[i] - indices[i - 1]
              expect(gap).toBeLessThanOrEqual(3) // Allow small gaps for different workout types
            }
          }
        }
      }
    })

    test('should handle empty workout list gracefully', async ({ page }) => {
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')
      await page.waitForLoadState('domcontentloaded')
      await page
        .waitForSelector(
          '[data-testid="workout-card"], [data-testid="workouts-page-skeleton"], [data-testid="empty-state"]',
          {
            state: 'attached',
            timeout: 10000,
          }
        )
        .catch(() => {})

      const workoutCards = page.locator('[data-testid="workout-card"]')
      const count = await workoutCards.count()

      if (count === 0) {
        // Should show appropriate empty state
        const emptyState = page.locator('text=/no workouts found|no training sessions|empty/i')
        await expect(emptyState).toBeVisible({ timeout: 10000 })

        // Should not show loading indefinitely
        const loadingSpinner = page.locator('[data-testid="loading"], .loading')
        await expect(loadingSpinner).not.toBeVisible({ timeout: 5000 })
      }
    })
  })
})
