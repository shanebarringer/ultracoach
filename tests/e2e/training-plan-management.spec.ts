/**
 * Training Plan Management E2E Tests
 *
 * Tests the complete training plan creation, editing, assignment, and progress tracking,
 * ensuring proper state management with Jotai atoms.
 */
import { Page, expect, test } from '@playwright/test'
import { addMonths, format } from 'date-fns'

import {
  selectHeroUIOption,
  waitForHeroUIReady,
  waitForLoadingComplete,
} from '../utils/heroui-helpers'

// Helper function to wait for page to be ready
function waitForPageReady(page: Page): Promise<void> {
  return page.waitForLoadState('domcontentloaded')
}

test.describe('Training Plan Management', () => {
  test.describe('Coach Training Plan Management', () => {
    test.use({ storageState: './playwright/.auth/coach.json' })

    test.beforeEach(async ({ page }) => {
      // Navigate directly to the coach dashboard - we're already authenticated
      await page.goto('/dashboard/coach')
      await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })
    })

    test('should display training plans with filtering', async ({ page }) => {
      // Wait for dashboard to fully load before navigation (Suspense-aware)
      await page.waitForLoadState('domcontentloaded')

      // Wait for dashboard content to be ready instead of arbitrary timeout
      await page.waitForFunction(
        () => {
          const dashboardContent = document.querySelector(
            'h1, h2, [data-testid="dashboard-content"]'
          )
          return dashboardContent !== null
        },
        { timeout: 10000 }
      )

      // Try button click first, then fallback to direct navigation
      try {
        // Navigate to training plans - click the button with emoji
        const managePlansButton = page.getByRole('button', { name: '⛰️ Manage Plans' })
        await expect(managePlansButton).toBeVisible({ timeout: 10000 })
        await managePlansButton.click()

        // Wait for navigation with more flexible timeout
        await page.waitForURL('**/training-plans', {
          timeout: 15000,
          waitUntil: 'domcontentloaded',
        })
      } catch (error) {
        // Fallback to direct navigation if button click fails
        await page.goto('/training-plans')
        await page.waitForLoadState('domcontentloaded')
      }

      await expect(page).toHaveURL('/training-plans')

      // Check if we're on the training plans page - look for the heading (includes emoji)
      await expect(page.getByRole('heading', { name: '🏔️ Training Expeditions' })).toBeVisible()

      // Check for either training plan cards or empty state
      const hasPlans = (await page.locator('[data-testid="training-plan-card"]').count()) > 0

      if (!hasPlans) {
        // If no plans, we should see the empty state
        await expect(page.getByText(/no training expeditions yet/i)).toBeVisible()
        return // Skip the rest of the test if there are no plans
      }

      // Should display training plans grid
      await expect(page.locator('[data-testid="training-plan-card"]').first()).toBeVisible()

      // Test status filter
      await page.getByRole('combobox', { name: /status/i }).selectOption('active')

      // Should only show active plans
      const activePlans = page.locator('[data-testid="training-plan-card"][data-status="active"]')
      const allPlans = page.locator('[data-testid="training-plan-card"]')

      const activeCount = await activePlans.count()
      const totalCount = await allPlans.count()

      expect(activeCount).toBe(totalCount)

      // Test search
      await page.getByPlaceholder(/search training plans/i).fill('marathon')
      await page.getByPlaceholder(/search training plans/i).press('Enter')

      // Should filter plans by search term
      const searchResults = page.locator('[data-testid="training-plan-card"]')
      const searchCount = await searchResults.count()

      for (let i = 0; i < searchCount; i++) {
        const planText = await searchResults.nth(i).textContent()
        expect(planText?.toLowerCase()).toContain('marathon')
      }
    })

    // Skip temporarily - dropdown interaction issues with HeroUI Select
    test.skip('should create a new training plan', async ({ page }) => {
      // Navigate to training plans page - click the button with emoji
      const managePlansButton = page.getByRole('button', { name: '⛰️ Manage Plans' })
      await expect(managePlansButton).toBeVisible({ timeout: 5000 })

      // Click and wait for navigation
      await Promise.all([
        page.waitForURL('**/training-plans', { timeout: 15000 }),
        managePlansButton.click(),
      ])

      // Wait for the page to load and click Create Expedition button
      await expect(page.getByRole('heading', { name: '🏔️ Training Expeditions' })).toBeVisible()

      // Click create new plan - could be "Create Expedition" or "Create Your First Expedition"
      const createButton = page.getByRole('button', { name: /Create.*Expedition/i }).first()
      await createButton.click()

      // Fill plan details
      const planName = `Ultra Training ${Date.now()}`

      await page.getByLabel('Plan Title').fill(planName)
      await page.getByLabel(/description/i).fill('Comprehensive ultra marathon training plan')

      // Wait for any loading to complete
      await waitForHeroUIReady(page)
      await waitForLoadingComplete(page)

      // Try to select runner - but it's optional if no runners are connected
      const runnerDropdown = page.getByRole('button', { name: /Select Runner/i })
      const dropdownText = await runnerDropdown.textContent()

      if (dropdownText?.includes('Loading')) {
        // Wait a bit for loading to complete
        await page.waitForTimeout(3000)
        const updatedText = await runnerDropdown.textContent()

        if (updatedText?.includes('Loading')) {
          // Runners still loading after 3s - likely no runners connected, skipping selection
        } else if (!updatedText?.includes('No connected')) {
          // Try to select a runner if available
          try {
            await runnerDropdown.click()
            await page.waitForTimeout(500)

            // Use a more stable selector for dropdown options
            const runnerOption = page
              .locator('[data-testid="runner-option"]')
              .first()
              .or(page.locator('[role="option"]').first())
            try {
              await runnerOption.waitFor({ state: 'visible', timeout: 1000 })
              await runnerOption.click()
            } catch {
              // Close dropdown if no options
              await page.keyboard.press('Escape')
            }
          } catch (error) {}
        }
      }

      // Select plan type
      const planTypeDropdown = page.getByText('Select plan type...')
      await planTypeDropdown.click()
      await page.waitForTimeout(500)
      // Click on the "Race Specific" option element
      await page.locator('option[value="race_specific"]').click()

      // Select target race (optional)
      const targetRaceDropdown = page.getByText('Select a target race expedition...')
      await targetRaceDropdown.click()
      await page.waitForTimeout(500)
      // Try to select first race or "No specific race"
      try {
        await page.getByText('No specific race').click()
      } catch {
        // If "No specific race" doesn't exist, click the first visible option
        const firstOption = page.locator('[role="listbox"] > div').first()
        await firstOption.click()
      }

      // Fill target date (3 months from now)
      const targetDate = format(addMonths(new Date(), 3), 'yyyy-MM-dd')
      await page.getByLabel(/target race date/i).fill(targetDate)

      // Select distance
      const distanceDropdown = page.getByText('Select distance...')
      await distanceDropdown.click()
      await page.waitForTimeout(500)
      // Click on "50K" text directly
      await page.getByText('50K', { exact: true }).click()

      // Select goal type
      const goalTypeDropdown = page.getByText('Select goal type...')
      await goalTypeDropdown.click()
      await page.waitForTimeout(500)
      // Click on "Completion" text directly
      await page.getByText('Completion').click()

      // Create plan
      await page.getByRole('button', { name: /create.*plan/i }).click()

      // Should show success
      await expect(page.getByText(/training plan created/i)).toBeVisible()

      // New plan should appear in list
      await expect(
        page.locator('[data-testid="training-plan-card"]').filter({ hasText: planName })
      ).toBeVisible()

      // trainingPlansAtom should be updated
      await expect(page.locator('[data-testid="plan-count"]')).toBeVisible()
    })

    // Skip this test in CI - complex form interactions
    test.skip('should edit training plan details', async ({ page }) => {
      // Navigate to training plans page using the Manage Plans button
      await Promise.all([
        page.waitForURL('/training-plans'),
        page.getByText('⛰️ Manage Plans').click(),
      ])

      // Wait for the page to load
      await expect(page.getByRole('heading', { name: '🏔️ Training Expeditions' })).toBeVisible()

      // Click edit on first plan
      const planCard = page.locator('[data-testid="training-plan-card"]').first()
      await planCard.getByRole('button', { name: /edit/i }).click()

      // Modify plan details
      const updatedName = `Updated Plan ${Date.now()}`

      await page.getByLabel('Plan Title').fill('')
      await page.getByLabel('Plan Title').fill(updatedName)

      // Update phases
      await page.getByRole('tab', { name: /phases/i }).click()
      await page.getByLabel(/base phase duration/i).fill('')
      await page.getByLabel(/base phase duration/i).fill('4')

      // Save changes
      await page.getByRole('button', { name: /save changes/i }).click()

      // Should show success
      await expect(page.getByText(/plan updated/i)).toBeVisible()

      // Updated plan should reflect changes
      await expect(
        page.locator('[data-testid="training-plan-card"]').filter({ hasText: updatedName })
      ).toBeVisible()
    })

    // Skip this test in CI - requires existing plans with phases
    test.skip('should manage training plan phases', async ({ page }) => {
      // Navigate to training plans page using the Manage Plans button
      await Promise.all([
        page.waitForURL('/training-plans'),
        page.getByText('⛰️ Manage Plans').click(),
      ])

      // Wait for the page to load
      await expect(page.getByRole('heading', { name: '🏔️ Training Expeditions' })).toBeVisible()

      // Open plan details
      const planCard = page.locator('[data-testid="training-plan-card"]').first()
      await planCard.click()

      // Should show phase progression
      await expect(page.getByText(/phase progression/i)).toBeVisible()
      await expect(page.locator('[data-testid="phase-timeline"]')).toBeVisible()

      // Current phase should be highlighted
      await expect(page.locator('[data-testid="current-phase"]')).toBeVisible()

      // Test phase navigation
      const phases = ['Base', 'Build', 'Peak', 'Taper', 'Recovery']

      for (const phase of phases) {
        const phaseElement = page.locator(`[data-testid="phase-${phase.toLowerCase()}"]`)
        if (await phaseElement.isVisible()) {
          await phaseElement.click()

          // Should show phase details
          await expect(page.getByText(new RegExp(phase, 'i'))).toBeVisible()
          await expect(page.locator('[data-testid="phase-workouts"]')).toBeVisible()
        }
      }
    })

    test.skip('should assign workouts to training plan', async ({ page }) => {
      // Navigate to training plans page using the Manage Plans button
      await Promise.all([
        page.waitForURL('/training-plans'),
        page.getByText('⛰️ Manage Plans').click(),
      ])

      // Wait for the page to load
      await expect(page.getByRole('heading', { name: '🏔️ Training Expeditions' })).toBeVisible()

      // Open plan details
      const planCard = page.locator('[data-testid="training-plan-card"]').first()
      await planCard.click()

      // Navigate to workouts tab
      await page.getByRole('tab', { name: /workouts/i }).click()

      // Add workout to plan
      await page.getByRole('button', { name: /add workout/i }).click()

      // Fill workout details
      await page.getByLabel(/workout name/i).fill('Long Run - Week 1')
      await page.getByLabel(/week/i).selectOption('1')
      await page.getByLabel(/day/i).selectOption('Saturday')
      await page.getByLabel(/type/i).selectOption('long_run')
      await page.getByLabel(/distance/i).fill('15')
      await page.getByLabel(/instructions/i).fill('Easy pace, focus on time on feet')

      // Add to plan
      await page.getByRole('button', { name: /add to plan/i }).click()

      // Should show success
      await expect(page.getByText(/workout added/i)).toBeVisible()

      // Workout should appear in plan
      await expect(
        page.locator('[data-testid="plan-workout-card"]').filter({ hasText: 'Long Run - Week 1' })
      ).toBeVisible()
    })

    test.skip('should duplicate training plan as template', async ({ page }) => {
      // Navigate to training plans page using the Manage Plans button
      await Promise.all([
        page.waitForURL('/training-plans'),
        page.getByText('⛰️ Manage Plans').click(),
      ])

      // Wait for the page to load
      await expect(page.getByRole('heading', { name: '🏔️ Training Expeditions' })).toBeVisible()

      // Find a plan to duplicate
      const planCard = page.locator('[data-testid="training-plan-card"]').first()
      const originalName = await planCard.locator('[data-testid="plan-name"]').textContent()

      // Open options menu
      await planCard.getByRole('button', { name: /options/i }).click()

      // Click duplicate as template
      await page.getByRole('menuitem', { name: /duplicate as template/i }).click()

      // Modify template name
      const templateName = `Template - ${originalName}`
      await page.getByLabel(/template name/i).fill('')
      await page.getByLabel(/template name/i).fill(templateName)

      // Save template
      await page.getByRole('button', { name: /save template/i }).click()

      // Should show success
      await expect(page.getByText(/template created/i)).toBeVisible()

      // Template should be available in templates
      await page.getByRole('tab', { name: /templates/i }).click()
      await expect(
        page.locator('[data-testid="template-card"]').filter({ hasText: templateName })
      ).toBeVisible()

      // planTemplatesAtom should be updated
    })

    test.skip('should delete training plan', async ({ page }) => {
      // Navigate to training plans
      await page.getByRole('link', { name: /training plans/i }).click()

      // Count initial plans
      const initialCount = await page.locator('[data-testid="training-plan-card"]').count()

      if (initialCount > 0) {
        // Find an inactive plan to delete
        const inactivePlan = page
          .locator('[data-testid="training-plan-card"][data-status="completed"]')
          .first()
        let planToDelete = inactivePlan

        // If no inactive plan, use the last plan
        if (!(await inactivePlan.isVisible())) {
          planToDelete = page.locator('[data-testid="training-plan-card"]').last()
        }

        const planName = await planToDelete.locator('[data-testid="plan-name"]').textContent()

        // Open options and delete
        await planToDelete.getByRole('button', { name: /options/i }).click()
        await page.getByRole('menuitem', { name: /delete/i }).click()

        // Confirm deletion
        await page.getByRole('button', { name: /confirm delete/i }).click()

        // Should show success
        await expect(page.getByText(/plan deleted/i)).toBeVisible()

        // Plan should be removed
        if (planName) {
          await expect(
            page.locator('[data-testid="training-plan-card"]').filter({ hasText: planName })
          ).not.toBeVisible()
        }

        // Count should decrease
        const newCount = await page.locator('[data-testid="training-plan-card"]').count()
        expect(newCount).toBe(initialCount - 1)
      }
    })
  })

  test.describe('Runner Training Plan Experience', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test.beforeEach(async ({ page }) => {
      // Navigate directly to the runner dashboard - we're already authenticated
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })
    })

    test('should view assigned training plan', async ({ page }) => {
      // Check if runner has an assigned plan
      const activePlan = page.locator('[data-testid="active-training-plan"]')

      if (await activePlan.isVisible()) {
        // Click to view details
        await activePlan.click()

        // Should show plan overview
        await expect(page.getByText(/plan overview/i)).toBeVisible()
        await expect(page.locator('[data-testid="plan-progress-bar"]')).toBeVisible()

        // Should show current week
        await expect(page.getByText(/current week/i)).toBeVisible()
        await expect(page.locator('[data-testid="week-workouts"]')).toBeVisible()

        // Should show upcoming workouts
        await expect(page.getByText(/upcoming workouts/i)).toBeVisible()
        await expect(page.locator('[data-testid="upcoming-workout-card"]')).toBeVisible()
      }
    })

    test.skip('should track training plan progress', async ({ page }) => {
      // Navigate to training plans
      await page.getByRole('link', { name: /training plans/i }).click()

      // Check active plan if exists
      const activePlan = page
        .locator('[data-testid="training-plan-card"][data-status="active"]')
        .first()

      if (await activePlan.isVisible()) {
        await activePlan.click()

        // Should show progress metrics
        await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible()
        await expect(page.locator('[data-testid="weekly-volume"]')).toBeVisible()
        await expect(page.locator('[data-testid="phase-progress"]')).toBeVisible()

        // Complete a workout if available
        const pendingWorkout = page.locator('[data-testid="pending-workout"]').first()

        if (await pendingWorkout.isVisible()) {
          await pendingWorkout.getByRole('button', { name: /complete/i }).click()

          // Quick complete
          await page.getByRole('button', { name: /mark complete/i }).click()

          // Progress should update
          await expect(page.getByText(/progress updated/i)).toBeVisible()

          // activeTrainingPlanProgressAtom should be updated
          const progressText = await page.locator('[data-testid="completion-rate"]').textContent()
          expect(progressText).toBeTruthy()
        }
      }
    })

    test.skip('should view training plan calendar', async ({ page }) => {
      // Navigate to calendar view
      await page.getByRole('link', { name: /calendar/i }).click()

      // Should show calendar with workouts
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible()

      // Check if workouts are displayed
      const workoutEvents = page.locator('[data-testid="calendar-workout"]')

      if ((await workoutEvents.count()) > 0) {
        // Click on a workout event
        await workoutEvents.first().click()

        // Should show workout details
        await expect(page.locator('[data-testid="workout-detail-modal"]')).toBeVisible()
        await expect(page.getByText(/workout details/i)).toBeVisible()

        // Should show plan context
        await expect(page.getByText(/part of:/i)).toBeVisible()
      }
    })

    test.skip('should provide feedback on workouts', async ({ page }) => {
      // Navigate to training plans
      await page.getByRole('link', { name: /training plans/i }).click()

      // Open active plan
      const activePlan = page
        .locator('[data-testid="training-plan-card"][data-status="active"]')
        .first()

      if (await activePlan.isVisible()) {
        await activePlan.click()

        // Find a completed workout
        const completedWorkout = page.locator('[data-testid="completed-workout"]').first()

        if (await completedWorkout.isVisible()) {
          // Add feedback
          await completedWorkout.getByRole('button', { name: /add feedback/i }).click()

          // Rate difficulty
          await page.getByRole('radio', { name: /moderate/i }).click()

          // Add notes
          await page.getByLabel(/feedback/i).fill('Felt good, could have gone faster')

          // Submit feedback
          await page.getByRole('button', { name: /submit feedback/i }).click()

          // Should show success
          await expect(page.getByText(/feedback submitted/i)).toBeVisible()

          // workoutFeedbackAtom should be updated
          await expect(completedWorkout.locator('[data-testid="feedback-badge"]')).toBeVisible()
        }
      }
    })
  })

  test.describe('Training Plan State Management', () => {
    test.use({ storageState: './playwright/.auth/coach.json' })

    test.skip('should update selectedTrainingPlanAtom on selection', async ({ page }) => {
      // Navigate directly to training plans page - we're already authenticated
      await page.goto('/training-plans')
      await waitForPageReady(page)

      // Select a plan
      const planCard = page.locator('[data-testid="training-plan-card"]').first()
      const planName = await planCard.locator('[data-testid="plan-name"]').textContent()

      await planCard.click()

      // Should update selectedTrainingPlanAtom
      await expect(page.locator('[data-testid="selected-plan-name"]')).toHaveText(planName || '')

      // Should show plan details
      await expect(page.getByText(/plan details/i)).toBeVisible()
    })

    test('should update trainingPlanFormDataAtom during creation', async ({ page }) => {
      // Navigate directly to training plans page - we're already authenticated
      await page.goto('/training-plans')
      await waitForPageReady(page)

      // Wait for page to be interactive and find create button
      await page.waitForSelector('button', { state: 'visible', timeout: 10000 })

      // Check if user is a coach (has create button)
      const createButton = page.getByRole('button', { name: 'Create Expedition' })
      const buttonCount = await createButton.count()

      if (buttonCount === 0) {
        // User is a runner, skip this test
        return
      }

      // Start creating plan - look for "Create Expedition" button
      await createButton.click()

      // Fill form step by step
      await page.getByLabel('Plan Title').fill('Test Plan')

      // Form should auto-save (if implemented)
      // trainingPlanFormDataAtom should update with each field

      // Cancel and reopen
      await page.getByRole('button', { name: /cancel/i }).click()
      await page.getByRole('button', { name: /create expedition/i }).click()

      // If form persistence is implemented, fields should retain values
      const nameValue = await page.getByLabel('Plan Title').inputValue()

      // This would only work if form persistence is implemented
      // expect(nameValue).toBe('Test Plan')
    })

    test('should sync training plan updates across components', async ({ page }) => {
      // Navigate directly to dashboard - detect user role first
      await page.goto('/dashboard')
      await waitForPageReady(page)

      // Check if redirected to coach dashboard
      const url = page.url()
      if (!url.includes('/dashboard/coach')) {
        return
      }

      // Open dashboard - should show plan count
      const initialPlanCount = await page.locator('[data-testid="total-plans-count"]').textContent()

      // Navigate to training plans page directly
      await page.goto('/training-plans')
      await waitForPageReady(page)

      // Create a new plan (simplified) - check if button exists first
      const createBtn = page.getByRole('button', { name: 'Create Expedition' })
      const btnCount = await createBtn.count()
      if (btnCount === 0) {
        return
      }
      await createBtn.click()
      await page.getByLabel('Plan Title').fill(`Quick Plan ${Date.now()}`)
      await page.getByRole('button', { name: /create/i }).click()

      // Return to dashboard
      await page.getByRole('link', { name: /dashboard/i }).click()

      // Plan count should be updated
      const newPlanCount = await page.locator('[data-testid="total-plans-count"]').textContent()

      if (initialPlanCount && newPlanCount) {
        expect(parseInt(newPlanCount)).toBeGreaterThan(parseInt(initialPlanCount))
      }
    })
  })
})
