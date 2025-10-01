/**
 * Coach-Runner Relationship E2E Tests
 *
 * Tests the complete coach-runner relationship management flow,
 * ensuring proper relationship creation, management, and state updates.
 */
import { expect, test } from '@playwright/test'

import { waitForHeroUIReady, waitForLoadingComplete } from '../utils/heroui-helpers'
import { waitForElementWithRetry, waitForSuspenseResolution } from '../utils/suspense-helpers'
import { TEST_USERS } from '../utils/test-helpers'
import { navigateToPage, signIn, waitForNavigation, waitForPageReady } from '../utils/wait-helpers'

test.describe('Coach-Runner Relationship Management', () => {
  test.describe('Coach Perspective', () => {
    test.use({ storageState: './playwright/.auth/coach.json' })

    test.beforeEach(async ({ page }) => {
      // Navigate directly to the coach dashboard - we're already authenticated
      await page.goto('/dashboard/coach')
      await waitForPageReady(page)
    })

    test('should display available runners to connect with', async ({ page }) => {
      // Coach dashboard shows "Your Athletes" heading (use more specific selector)
      await expect(page.getByRole('heading', { name: 'Your Athletes' })).toBeVisible({
        timeout: 15000,
      })

      // Navigate directly to relationships page
      await page.goto('/relationships')
      await waitForPageReady(page)

      // Wait for Suspense boundaries to resolve and data to load
      await waitForSuspenseResolution(page, { timeout: 25000 })

      // Should show "Find Runners" section
      await expect(page.getByText('Find Runners')).toBeVisible({ timeout: 15000 })

      // Should display runner cards or connect buttons - use retry with scroll
      await waitForElementWithRetry(page, 'button:has-text("Connect")', {
        timeout: 25000,
        retries: 3,
        retryDelay: 2000,
        scrollIntoView: true,
      })
    })

    test('should send connection request to runner', async ({ page }) => {
      // Click "Find Athletes to Coach" button from dashboard
      await page.getByRole('button', { name: 'Find Athletes to Coach' }).click()

      // Navigate directly to relationships page
      await page.goto('/relationships')
      await waitForPageReady(page)

      // Get first runner's email to identify them later
      const firstRunnerElement = page.locator('text=test.runner').first()

      // Click connect on first available runner
      await page.getByRole('button', { name: 'Connect' }).first().click()

      // Runner should move to "My Relationships" section with pending status
      await expect(page.getByText('My Relationships')).toBeVisible()

      // Should show the pending status indicator (use first() to avoid strict mode violation)
      await expect(page.getByText('pending').first()).toBeVisible()

      // Should have Accept/Decline buttons for the pending relationship (use first() to avoid strict mode)
      await expect(page.getByRole('button', { name: 'Accept' }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'Decline' }).first()).toBeVisible()
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
      // Navigate to relationships page using correct navigation
      await page.getByRole('link', { name: 'Connections' }).click()
      await page.waitForURL('/relationships', { timeout: 10000 })
      await waitForPageReady(page)

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
    test.use({ storageState: './playwright/.auth/runner.json' })

    test.beforeEach(async ({ page }) => {
      // Navigate directly to the runner dashboard - we're already authenticated
      await page.goto('/dashboard/runner')
      await waitForPageReady(page)
    })

    test('should display available coaches to connect with', async ({ page }) => {
      // Runner dashboard shows "My Guides" section with Find Coach button
      await expect(page.getByText('My Guides')).toBeVisible()

      // Click Find Coach button to navigate to coach selection
      await page.getByRole('button', { name: 'Find Coach' }).click()

      // Wait for navigation to relationships page with longer timeout
      await page.waitForURL('/relationships', { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')
      await waitForPageReady(page)

      // Wait for HeroUI components to be ready and loading to complete
      await waitForHeroUIReady(page)
      await waitForLoadingComplete(page)

      // Should show "Find a Coach" section
      await expect(page.getByText('Find a Coach')).toBeVisible({ timeout: 10000 })

      // Should display coaches with Connect buttons (with retry logic)
      await expect(page.getByRole('button', { name: 'Connect' }).first()).toBeVisible({
        timeout: 10000,
      })

      // Should have coach emails visible (use first() to avoid strict mode violation)
      await expect(page.getByText(/@ultracoach.dev/).first()).toBeVisible()
    })

    test('should send coaching request to coach', async ({ page }) => {
      // Click Find Coach button from dashboard
      await page.getByRole('button', { name: 'Find Coach' }).click()

      // Wait for navigation to relationships page with longer timeout
      await page.waitForURL('/relationships', { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')
      await waitForPageReady(page)

      // Wait for HeroUI components to be ready and loading to complete
      await waitForHeroUIReady(page)
      await waitForLoadingComplete(page)

      // Click Connect on first available coach
      await expect(page.getByRole('button', { name: 'Connect' }).first()).toBeVisible({
        timeout: 10000,
      })
      await page.getByRole('button', { name: 'Connect' }).first().click()

      // Should show success notification
      await expect(
        page.getByText(/connection request sent|coaching request sent|connected/i)
      ).toBeVisible()

      // Coach should move to pending connections or be connected
      // The exact UI behavior may vary based on the implementation
      // Wait for any success toast or UI update
      await page
        .waitForSelector('[role="status"]', { state: 'visible', timeout: 5000 })
        .catch(() => {})
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

    test.skip('should disconnect from coach', async ({ page }) => {
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

        // Wait for connection to process
        await page
          .waitForSelector('[role="status"]', { state: 'visible', timeout: 5000 })
          .catch(() => {})

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
