/**
 * Critical Fixes E2E Tests
 *
 * Tests for the critical fixes implemented to resolve user-facing issues:
 * - Workout sort order (ULT-45): Today/yesterday workouts appear first
 * - Session persistence (ULT-46): Sessions persist across page refresh
 * - Authentication compatibility (ULT-47): New users can authenticate properly
 * - Workout display (ULT-48): Workouts appear immediately after creation
 *
 * These tests prevent regression of the major issues that went undetected.
 */
import { expect, test } from '@playwright/test'
import { addDays, format, isToday, isYesterday, parseISO, subDays } from 'date-fns'

import { TEST_RUNNER_EMAIL, TEST_RUNNER_PASSWORD, navigateToDashboard } from '../utils/test-helpers'

test.describe('Critical Fixes Validation', () => {
  test.describe('Workout Sort Order Fix (ULT-45)', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should display workouts with correct sort order - today and yesterday first', async ({
      page,
    }) => {
      // Navigate to workouts page
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')

      // Wait for workouts to load (Suspense boundary)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000) // Allow for async data loading

      // Check if workouts exist
      const workoutCards = page.locator('[data-testid="workout-card"]')
      const workoutCount = await workoutCards.count()

      if (workoutCount === 0) {
        // No workouts to test sort order - this is valid for new users
        console.log('No workouts found - skipping sort order test')
        return
      }

      // Collect all workout dates for sort validation
      const workoutDates: Date[] = []

      for (let i = 0; i < Math.min(workoutCount, 10); i++) {
        const workoutCard = workoutCards.nth(i)
        const dateElement = workoutCard.locator('[data-testid="workout-date"]')

        if (await dateElement.isVisible()) {
          const dateText = await dateElement.textContent()
          if (dateText) {
            // Parse date text - may be in different formats
            let parsedDate: Date
            try {
              // Try parsing as ISO first
              parsedDate = parseISO(dateText)
              if (isNaN(parsedDate.getTime())) {
                // Fallback to Date constructor
                parsedDate = new Date(dateText)
              }
            } catch (error) {
              // Skip if can't parse date
              continue
            }

            if (!isNaN(parsedDate.getTime())) {
              workoutDates.push(parsedDate)
            }
          }
        }
      }

      // Validate sort order if we have dates
      if (workoutDates.length > 1) {
        // Apply smart sort order ranking: Today=0, Yesterday=1, Future=2, Past=3
        const today = new Date()
        const rank = (d: Date) => {
          if (isToday(d)) return 0 // Today
          if (isYesterday(d)) return 1 // Yesterday
          if (d > today) return 2 // Future
          return 3 // Past
        }

        // Assert that ranks are non-decreasing (proper sort order)
        for (let i = 1; i < workoutDates.length; i++) {
          const currentRank = rank(workoutDates[i])
          const previousRank = rank(workoutDates[i - 1])
          expect(currentRank).toBeGreaterThanOrEqual(previousRank)
        }

        // Log findings for debugging
        const categories = workoutDates.reduce(
          (acc, date) => {
            const r = rank(date)
            acc[r] = (acc[r] || 0) + 1
            return acc
          },
          {} as Record<number, number>
        )

        console.log(
          `Sort order test completed - Today: ${categories[0] || 0}, Yesterday: ${categories[1] || 0}, Future: ${categories[2] || 0}, Past: ${categories[3] || 0}`
        )
      }
    })

    test('should show today workouts first on runner dashboard', async ({ page }) => {
      // Navigate to runner dashboard
      await navigateToDashboard(page, 'runner')

      // Check upcoming workouts section
      const upcomingSection = page.locator('[data-testid="upcoming-workouts-section"]')
      if (await upcomingSection.isVisible()) {
        const upcomingWorkouts = page.locator('[data-testid="upcoming-workout-card"]')
        const upcomingCount = await upcomingWorkouts.count()

        if (upcomingCount > 0) {
          // Check if first workout is today's or in near future
          const firstWorkout = upcomingWorkouts.first()
          const workoutDate = firstWorkout.locator('[data-testid="workout-date"]')

          if (await workoutDate.isVisible()) {
            const dateText = await workoutDate.textContent()
            if (dateText) {
              const parsedDate = new Date(dateText)
              // First workout should be today or in near future (not old workouts)
              const daysDiff = Math.ceil(
                (parsedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              )
              expect(daysDiff).toBeGreaterThanOrEqual(-1) // Today or yesterday at earliest
            }
          }
        }
      }
    })
  })

  test.describe('Session Persistence Fix (ULT-46)', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should maintain authentication across page refresh', async ({ page }) => {
      // Start on runner dashboard (authenticated page)
      await navigateToDashboard(page, 'runner')

      // Verify we're authenticated and on correct dashboard
      await expect(page).toHaveURL('/dashboard/runner')
      const dashboardTitle = page.locator('h1, h2').filter({ hasText: /Dashboard|Base Camp/i })
      await expect(dashboardTitle.first()).toBeVisible({ timeout: 10000 })

      // Refresh the page
      await page.reload()
      await page.waitForLoadState('domcontentloaded')

      // Should still be on dashboard (not redirected to signin)
      await expect(page).toHaveURL('/dashboard/runner')
      await expect(page).not.toHaveURL('/auth/signin')

      // Dashboard content should still be visible
      await expect(dashboardTitle.first()).toBeVisible({ timeout: 10000 })
    })

    test('should maintain authentication across protected route navigation', async ({ page }) => {
      // Start on runner dashboard
      await navigateToDashboard(page, 'runner')

      // Navigate to other protected routes
      const protectedRoutes = ['/workouts', '/training-plans', '/calendar', '/profile']

      for (const route of protectedRoutes) {
        await page.goto(route)
        await page.waitForLoadState('domcontentloaded')

        // Should not be redirected to signin
        await expect(page).not.toHaveURL('/auth/signin')
        await expect(page).toHaveURL(route)

        // Wait for page content to load
        await page.waitForTimeout(1000)
      }
    })

    test('should handle page refresh on any protected route', async ({ page }) => {
      const protectedRoutes = ['/dashboard/runner', '/workouts', '/training-plans']

      for (const route of protectedRoutes) {
        // Navigate to the route
        await page.goto(route)
        await page.waitForLoadState('domcontentloaded')
        await expect(page).toHaveURL(route)

        // Refresh the page
        await page.reload()
        await page.waitForLoadState('domcontentloaded')

        // Should still be on the same route (session persisted)
        await expect(page).toHaveURL(route)
        await expect(page).not.toHaveURL('/auth/signin')
      }
    })
  })

  test.describe('Authentication Compatibility Fix (ULT-47)', () => {
    // These tests use existing authentication (storageState)
    // Testing that the Better Auth integration works properly

    test('should successfully authenticate with existing test users', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies()

      // Navigate to signin page
      await page.goto('/auth/signin')
      await expect(page).toHaveURL('/auth/signin')

      // Fill in credentials
      await page.locator('input[type="email"]').fill(TEST_RUNNER_EMAIL)
      await page.locator('input[type="password"]').fill(TEST_RUNNER_PASSWORD)

      // Submit form
      await page.locator('button[type="submit"], button:has-text(/sign in/i)').click()

      // Should redirect to dashboard
      await page.waitForURL('**/dashboard/runner', { timeout: 20000 })
      await expect(page).toHaveURL('/dashboard/runner')

      // Should show authenticated content
      const dashboardContent = page.locator('[data-testid="runner-dashboard-content"]')
      await expect(dashboardContent).toBeVisible({ timeout: 10000 })
    })

    test('should handle sign out properly', async ({ page }) => {
      // Start authenticated
      await navigateToDashboard(page, 'runner')

      // Click user menu/avatar
      const userMenu = page.locator('[data-testid="user-menu"], button:has(img)')
      await expect(userMenu).toBeVisible({ timeout: 15000 })
      await userMenu.click()

      // Click sign out
      const signOutButton = page.locator(
        'button:has-text(/sign out/i), [role="menuitem"]:has-text(/sign out/i)'
      )
      await signOutButton.click()

      // Should redirect to home
      await expect(page).toHaveURL('/')

      // Should show signin options
      const signInLink = page.locator('a:has-text(/sign in/i), button:has-text(/sign in/i)')
      await expect(signInLink.first()).toBeVisible({ timeout: 10000 })

      // Protected routes should redirect to signin
      await page.goto('/dashboard/runner')
      await page.waitForURL('**/auth/signin', { timeout: 10000 })
      await expect(page).toHaveURL('/auth/signin')
    })
  })

  test.describe('Workout Display Fix (ULT-48)', () => {
    test.use({ storageState: './playwright/.auth/coach.json' })

    test.skip('should display new workout immediately after creation', async ({ page }) => {
      // Skip this test for now - requires workout creation functionality to be implemented
      // This would test that when a coach creates a workout, it appears immediately in the UI
      // without requiring a page refresh

      console.log('Workout creation test skipped - requires implementation of workout creation UI')
    })

    test('should display existing workouts immediately on page load', async ({ page }) => {
      // Navigate to workouts page
      await page.goto('/workouts')
      await expect(page).toHaveURL('/workouts')

      // Wait for initial load
      await page.waitForLoadState('domcontentloaded')

      // Check for either workouts or empty state (both are valid)
      const workoutCards = page.locator('[data-testid="workout-card"]')
      const emptyState = page.locator('text=/no workouts found|no training sessions found/i')

      // Either workouts should be visible OR empty state should be visible
      // (but not loading state indefinitely)
      await expect(workoutCards.first().or(emptyState)).toBeVisible({ timeout: 10000 })

      // Verify no infinite loading states
      const loadingSpinner = page.locator('[data-testid="loading"], .loading, text=Loading')
      await expect(loadingSpinner).not.toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Regression Prevention', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should not show workouts in wrong chronological order', async ({ page }) => {
      await page.goto('/workouts')
      await page.waitForLoadState('domcontentloaded')

      const workoutCards = page.locator('[data-testid="workout-card"]')
      const count = await workoutCards.count()

      if (count >= 2) {
        // Get first two workout dates
        const firstDate = await workoutCards
          .first()
          .locator('[data-testid="workout-date"]')
          .textContent()
        const secondDate = await workoutCards
          .nth(1)
          .locator('[data-testid="workout-date"]')
          .textContent()

        if (firstDate && secondDate) {
          const first = new Date(firstDate)
          const second = new Date(secondDate)

          // First workout should not be significantly older than second
          // (prevents old workouts appearing first)
          if (isToday(second) || isYesterday(second)) {
            const daysDiff = Math.ceil((second.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
            expect(daysDiff).toBeLessThanOrEqual(1) // First should be today/yesterday if second is
          }
        }
      }
    })

    test('should not lose authentication on page navigation', async ({ page }) => {
      await navigateToDashboard(page, 'runner')

      // Navigate through multiple pages quickly
      const routes = ['/workouts', '/dashboard/runner', '/training-plans', '/dashboard/runner']

      for (const route of routes) {
        await page.goto(route)
        await page.waitForLoadState('domcontentloaded')

        // Should never be redirected to signin during navigation
        await expect(page).not.toHaveURL('/auth/signin')
        await expect(page).toHaveURL(route)
      }
    })
  })
})
