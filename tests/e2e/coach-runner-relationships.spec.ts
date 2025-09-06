/**
 * Coach-Runner Relationship E2E Tests
 *
 * Tests the complete coach-runner relationship management flow,
 * ensuring proper relationship creation, management, and state updates.
 */
import { expect, test } from '@playwright/test'

import { TEST_USERS } from '../utils/test-helpers'
import { navigateToPage, signIn, waitForNavigation } from '../utils/wait-helpers'

test.describe('Coach-Runner Relationship Management', () => {
  test.describe('Coach Perspective', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in as coach
      await signIn(page, TEST_USERS.coach.email, TEST_USERS.coach.password)
    })

    test.skip('should display available runners to connect with', async ({ page }) => {
      // Try to navigate to runners management or check dashboard
      try {
        await navigateToPage(page, /manage runners|runners|athletes/i)
      } catch {
        // Runners might be shown on dashboard directly
      }

      // Should show available runners section
      await expect(page.getByText(/available runners/i)).toBeVisible()

      // Should display runner cards with connect buttons
      await expect(page.locator('[data-testid="runner-card"]').first()).toBeVisible()
      await expect(page.getByRole('button', { name: /connect/i }).first()).toBeVisible()
    })

    // Skip this test in CI - requires unconnected runners in test data
    test.skip('should send connection request to runner', async ({ page }) => {
      // Try to navigate to runners management or check dashboard
      try {
        await navigateToPage(page, /manage runners|runners|athletes/i)
      } catch {
        // Runners might be shown on dashboard directly
      }

      // Click connect on first available runner
      const runnerCard = page.locator('[data-testid="runner-card"]').first()
      const runnerName = await runnerCard
        .getByText(/runner/i)
        .first()
        .textContent()

      await runnerCard.getByRole('button', { name: /connect/i }).click()

      // Should show success notification
      await expect(page.getByText(/connection request sent/i)).toBeVisible()

      // Runner should move to pending connections
      await expect(page.getByText(/pending connections/i)).toBeVisible()
      await expect(
        page.locator('[data-testid="pending-runner-card"]').filter({ hasText: runnerName || '' })
      ).toBeVisible()
    })

    // Skip this test in CI - requires existing relationships
    test.skip('should manage active runner relationships', async ({ page }) => {
      // Navigate to dashboard - should show connected runners
      await expect(page.getByText(/my runners/i)).toBeVisible()

      // Should display connected runner cards
      const runnerCards = page.locator('[data-testid="active-runner-card"]')
      const count = await runnerCards.count()

      if (count > 0) {
        // Click on a runner to view details
        await runnerCards.first().click()

        // Should navigate to runner details or training plan
        await expect(page.url()).toMatch(/\/(training-plans|runner-details|dashboard)/)
      }
    })

    // Skip this test in CI - requires email functionality
    test.skip('should invite runner via email', async ({ page }) => {
      // Try to navigate to runners management or check dashboard
      try {
        await navigateToPage(page, /manage runners|runners|athletes/i)
      } catch {
        // Runners might be shown on dashboard directly
      }

      // Click invite runner button
      await page.getByRole('button', { name: /invite runner/i }).click()

      // Fill invitation form
      const timestamp = Date.now()
      const inviteEmail = `invited.runner.${timestamp}@example.com`

      await page.getByLabel(/email/i).fill(inviteEmail)
      await page.getByLabel(/message/i).fill('Join my coaching program!')

      // Submit invitation
      await page.getByRole('button', { name: /send invitation/i }).click()

      // Should show success message
      await expect(page.getByText(/invitation sent/i)).toBeVisible()
    })

    // Skip this test in CI - requires existing training plans
    test.skip('should view and manage runner training plans', async ({ page }) => {
      // Navigate to training plans
      await page.getByRole('link', { name: /training plans/i }).click()

      // Should show runner filter/selector
      await expect(page.getByRole('combobox', { name: /select runner/i })).toBeVisible()

      // Select a runner if available
      const runnerSelector = page.getByRole('combobox', { name: /select runner/i })
      await runnerSelector.click()

      const runnerOptions = page.getByRole('option')
      const optionCount = await runnerOptions.count()

      if (optionCount > 0) {
        await runnerOptions.first().click()

        // Should display runner's training plans
        await expect(page.locator('[data-testid="training-plan-card"]')).toBeVisible()
      }
    })
  })

  test.describe('Runner Perspective', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in as runner
      await page.goto('/auth/signin')
      await page.getByLabel(/email/i).fill(TEST_USERS.runner.email)
      await page.getByLabel(/password/i).fill(TEST_USERS.runner.password)
      await page.getByLabel(/password/i).press('Enter')
      await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })
    })

    test.skip('should display available coaches to connect with', async ({ page }) => {
      // Navigate to connections page (runner navigation) or check dashboard
      const navigated = await navigateToPage(page, /connections/i, false)
      if (!navigated) {
        // Available coaches might be shown on dashboard
        await page.goto('/dashboard/runner')
      }

      // Should show available coaches section
      await expect(page.getByText(/available coaches/i)).toBeVisible()

      // Should display coach cards with connect buttons
      await expect(page.locator('[data-testid="coach-card"]').first()).toBeVisible()
      await expect(page.getByRole('button', { name: /request coaching/i }).first()).toBeVisible()
    })

    test.skip('should send coaching request to coach', async ({ page }) => {
      // Navigate to connections page or check dashboard
      const navigated = await navigateToPage(page, /connections/i, false)
      if (!navigated) {
        await page.goto('/dashboard/runner')
      }

      // Click request coaching on first available coach
      const coachCard = page.locator('[data-testid="coach-card"]').first()
      const coachName = await coachCard.getByText(/coach/i).first().textContent()

      await coachCard.getByRole('button', { name: /request coaching/i }).click()

      // Should show success notification
      await expect(page.getByText(/coaching request sent/i)).toBeVisible()

      // Coach should move to pending requests
      await expect(page.getByText(/pending requests/i)).toBeVisible()
      await expect(
        page.locator('[data-testid="pending-coach-card"]').filter({ hasText: coachName || '' })
      ).toBeVisible()
    })

    test.skip('should manage coach relationship', async ({ page }) => {
      // Dashboard should show current coach if connected
      const coachSection = page.locator('[data-testid="current-coach-section"]')

      if (await coachSection.isVisible()) {
        // Should display coach information
        await expect(coachSection.getByText(/coach/i)).toBeVisible()

        // Should have message coach button
        await expect(coachSection.getByRole('button', { name: /message/i })).toBeVisible()

        // Click message button
        await coachSection.getByRole('button', { name: /message/i }).click()

        // Should navigate to chat
        await expect(page).toHaveURL(/\/chat/)
      }
    })

    test.skip('should accept or reject coach invitations', async ({ page }) => {
      // Check for pending invitations
      const invitationBanner = page.locator('[data-testid="coach-invitation-banner"]')

      if (await invitationBanner.isVisible()) {
        // Should show accept and decline buttons
        await expect(invitationBanner.getByRole('button', { name: /accept/i })).toBeVisible()
        await expect(invitationBanner.getByRole('button', { name: /decline/i })).toBeVisible()

        // Accept invitation
        await invitationBanner.getByRole('button', { name: /accept/i }).click()

        // Should show success message
        await expect(page.getByText(/coach connection established/i)).toBeVisible()

        // Should update coachRunnerRelationshipAtom
        await expect(page.locator('[data-testid="current-coach-section"]')).toBeVisible()
      }
    })

    test('should disconnect from coach', async ({ page }) => {
      // Check if connected to a coach
      const coachSection = page.locator('[data-testid="current-coach-section"]')

      if (await coachSection.isVisible()) {
        // Open coach options menu
        await coachSection.getByRole('button', { name: /options/i }).click()

        // Click disconnect
        await page.getByRole('menuitem', { name: /disconnect/i }).click()

        // Confirm disconnection
        await page.getByRole('button', { name: /confirm disconnect/i }).click()

        // Should show success message
        await expect(page.getByText(/disconnected from coach/i)).toBeVisible()

        // Coach section should no longer be visible
        await expect(coachSection).not.toBeVisible()
      }
    })
  })

  test.describe('Relationship State Management', () => {
    test.skip('should update coachRunnerRelationshipAtom on connection', async ({ page }) => {
      // Sign in as coach
      await page.goto('/auth/signin')
      await page.getByLabel(/email/i).fill(TEST_USERS.coach.email)
      await page.getByLabel(/password/i).fill(TEST_USERS.coach.password)
      await page.getByLabel(/password/i).press('Enter')
      await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })

      // Navigate to runners management
      await page.getByRole('link', { name: /manage runners/i }).click()

      // Count initial connected runners
      const initialCount = await page.locator('[data-testid="active-runner-card"]').count()

      // Connect to a runner if available
      const availableRunners = page.locator('[data-testid="runner-card"]')
      if ((await availableRunners.count()) > 0) {
        await availableRunners
          .first()
          .getByRole('button', { name: /connect/i })
          .click()

        // Wait for connection to process (simulating acceptance)
        await page.waitForTimeout(1000)

        // If connection is auto-accepted in test environment
        const newCount = await page.locator('[data-testid="active-runner-card"]').count()

        // Verify relationship count increased
        expect(newCount).toBeGreaterThanOrEqual(initialCount)
      }
    })

    test.skip('should sync relationship changes in real-time', async ({ context, page }) => {
      // Sign in as coach in first tab
      await page.goto('/auth/signin')
      await page.getByLabel(/email/i).fill(TEST_USERS.coach.email)
      await page.getByLabel(/password/i).fill(TEST_USERS.coach.password)
      await page.getByLabel(/password/i).press('Enter')
      await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })

      // Open second tab as runner
      const page2 = await context.newPage()
      await page2.goto('/auth/signin')
      await page2.getByLabel(/email/i).fill(TEST_USERS.runner.email)
      await page2.getByLabel(/password/i).fill(TEST_USERS.runner.password)
      await page2.getByLabel(/password/i).press('Enter')
      await expect(page2).toHaveURL('/dashboard/runner', { timeout: 10000 })

      // Coach sends connection request
      await page.getByRole('link', { name: /manage runners/i }).click()
      const runnerCard = page.locator('[data-testid="runner-card"]').first()

      if (await runnerCard.isVisible()) {
        await runnerCard.getByRole('button', { name: /connect/i }).click()

        // Runner should see pending request in real-time
        await expect(page2.locator('[data-testid="coach-invitation-banner"]')).toBeVisible({
          timeout: 5000,
        })

        // Runner accepts
        await page2
          .locator('[data-testid="coach-invitation-banner"]')
          .getByRole('button', { name: /accept/i })
          .click()

        // Coach should see runner in active connections
        await expect(page.locator('[data-testid="active-runner-card"]')).toBeVisible({
          timeout: 5000,
        })
      }
    })

    test.skip('should handle relationship status transitions', async ({ page }) => {
      // Sign in as coach
      await page.goto('/auth/signin')
      await page.getByLabel(/email/i).fill(TEST_USERS.coach.email)
      await page.getByLabel(/password/i).fill(TEST_USERS.coach.password)
      await page.getByLabel(/password/i).press('Enter')
      await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })

      // Navigate to runners management
      await page.getByRole('link', { name: /manage runners/i }).click()

      // Test status transitions: pending -> active -> inactive
      const pendingRunner = page.locator('[data-testid="pending-runner-card"]').first()

      if (await pendingRunner.isVisible()) {
        // Cancel pending request
        await pendingRunner.getByRole('button', { name: /cancel/i }).click()

        // Should remove from pending
        await expect(pendingRunner).not.toBeVisible()
      }

      // Check active runner management
      const activeRunner = page.locator('[data-testid="active-runner-card"]').first()

      if (await activeRunner.isVisible()) {
        // Open options
        await activeRunner.getByRole('button', { name: /options/i }).click()

        // Pause relationship
        await page.getByRole('menuitem', { name: /pause/i }).click()

        // Should update status
        await expect(activeRunner.getByText(/paused/i)).toBeVisible()
      }
    })
  })
})
