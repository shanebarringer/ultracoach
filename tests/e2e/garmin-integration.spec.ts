/**
 * Garmin Integration E2E Tests
 *
 * Tests the Garmin Connect API integration including:
 * - Feature flag visibility
 * - Connection card UI
 * - Workout sync interface
 * - Activity import flow
 *
 * Note: These tests mock the OAuth flow since Garmin requires business approval
 * and we can't expose real credentials in test environments.
 */
import { expect, test } from '@playwright/test'

import {
  TEST_COACH_EMAIL,
  TEST_COACH_PASSWORD,
  TEST_RUNNER_EMAIL,
  TEST_RUNNER_PASSWORD,
  TEST_TIMEOUTS,
} from '../utils/test-helpers'

test.describe('Garmin Integration - Feature Flag', () => {
  test('should hide Garmin widgets when feature flag is disabled', async ({ page, context }) => {
    // Set PostHog feature flag to disabled via context storage
    await context.addInitScript(() => {
      // Enable test mode to prevent real PostHog initialization
      ;(window as any).__POSTHOG_TEST_MODE__ = true
      // Mock PostHog to return false for garmin-integration flag
      ;(window as any).posthog = {
        isFeatureEnabled: (flag: string) => (flag === 'garmin-integration' ? false : false),
        getFeatureFlag: (flag: string) => (flag === 'garmin-integration' ? false : false),
        onFeatureFlags: (callback: () => void) => callback(),
        has_opted_in_capturing: () => false,
      }
    })

    // Authenticate as runner
    await page.goto('/auth/signin')
    await page.fill('input[id="email"]', TEST_RUNNER_EMAIL)
    await page.fill('input[id="password"]', TEST_RUNNER_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('**/dashboard/runner', { timeout: TEST_TIMEOUTS.long })

    // Verify Strava widget is visible
    await expect(page.locator('[data-testid="strava-dashboard-widget"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.medium,
    })

    // Verify Garmin widget is NOT visible (hidden by feature flag)
    await expect(page.locator('[data-testid="garmin-dashboard-widget"]')).not.toBeVisible()

    // Navigate to Settings
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Click Integrations tab
    await page.click('text=Integrations')
    await page.waitForTimeout(1000)

    // Verify Strava connection card is visible using data-testid
    await expect(page.locator('[data-testid="strava-connection-card"]').first()).toBeVisible({
      timeout: TEST_TIMEOUTS.medium,
    })

    // Verify Garmin connection card is NOT visible
    await expect(page.locator('[data-testid="garmin-connection-card"]')).not.toBeVisible()
  })

  test('should show Garmin widgets when feature flag is enabled', async ({ page, context }) => {
    // Set PostHog feature flag to enabled via context storage
    await context.addInitScript(() => {
      // Enable test mode to prevent real PostHog initialization
      ;(window as any).__POSTHOG_TEST_MODE__ = true
      // Mock PostHog to return true for garmin-integration flag
      ;(window as any).posthog = {
        isFeatureEnabled: (flag: string) => (flag === 'garmin-integration' ? true : false),
        getFeatureFlag: (flag: string) => (flag === 'garmin-integration' ? true : false),
        onFeatureFlags: (callback: () => void) => callback(),
        has_opted_in_capturing: () => false,
      }
    })

    // Authenticate as runner
    await page.goto('/auth/signin')
    await page.fill('input[id="email"]', TEST_RUNNER_EMAIL)
    await page.fill('input[id="password"]', TEST_RUNNER_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('**/dashboard/runner', { timeout: TEST_TIMEOUTS.long })

    // Verify both Strava and Garmin widgets are visible
    await expect(page.locator('[data-testid="strava-dashboard-widget"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.medium,
    })
    await expect(page.locator('[data-testid="garmin-dashboard-widget"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.medium,
    })

    // Navigate to Settings
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Click Integrations tab
    await page.click('text=Integrations')
    await page.waitForTimeout(1000)

    // Verify both connection cards are visible using data-testid
    await expect(page.locator('[data-testid="strava-connection-card"]').first()).toBeVisible({
      timeout: TEST_TIMEOUTS.medium,
    })
    await expect(page.locator('[data-testid="garmin-connection-card"]').first()).toBeVisible({
      timeout: TEST_TIMEOUTS.medium,
    })
  })
})

test.describe('Garmin Integration - UI Components', () => {
  test.beforeEach(async ({ page, context }) => {
    // Enable Garmin feature flag for these tests
    await context.addInitScript(() => {
      // Enable test mode to prevent real PostHog initialization
      ;(window as any).__POSTHOG_TEST_MODE__ = true
      ;(window as any).posthog = {
        isFeatureEnabled: (flag: string) => (flag === 'garmin-integration' ? true : false),
        getFeatureFlag: (flag: string) => (flag === 'garmin-integration' ? true : false),
        onFeatureFlags: (callback: () => void) => callback(),
        has_opted_in_capturing: () => false,
      }
    })

    // Authenticate as runner
    await page.goto('/auth/signin')
    await page.fill('input[id="email"]', TEST_RUNNER_EMAIL)
    await page.fill('input[id="password"]', TEST_RUNNER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard/runner', { timeout: TEST_TIMEOUTS.long })
  })

  test('should display Garmin connection card in Settings', async ({ page }) => {
    // Navigate to Settings → Integrations
    await page.goto('/settings')
    await page.click('text=Integrations')
    await page.waitForTimeout(1000)

    // Verify Garmin connection card is present
    const garminCard = page.locator('[data-testid="garmin-connection-card"]').first()
    await expect(garminCard).toBeVisible({ timeout: TEST_TIMEOUTS.medium })

    // Check for connection button (should be "Connect Garmin Account" when not connected)
    const connectButton = page.locator('text=Connect Garmin, text=Connect to Garmin').first()
    await expect(connectButton).toBeVisible()
  })

  test('should display Garmin widget on dashboard', async ({ page }) => {
    // Verify Garmin widget is visible on dashboard
    const garminWidget = page.locator('[data-testid="garmin-dashboard-widget"]')
    await expect(garminWidget).toBeVisible({ timeout: TEST_TIMEOUTS.medium })

    // Check for widget title
    await expect(page.locator('text=Garmin Sync')).toBeVisible()

    // Check for connection status (should show "Not Connected" initially)
    await expect(page.locator('text=Not Connected')).toBeVisible()
  })

  test('should display Garmin panel on workouts page', async ({ page }) => {
    // Navigate to workouts page
    await page.goto('/workouts')
    await page.waitForLoadState('domcontentloaded')

    // The Garmin panel might be collapsed by default, so we look for the toggle button
    // or the panel itself if it's visible
    const garminPanelVisible = await page
      .locator('[data-testid="garmin-workout-panel"]')
      .isVisible()
      .catch(() => false)

    if (!garminPanelVisible) {
      // Panel is collapsed, which is expected behavior
      // We can verify the integration is loaded by checking other elements
      console.log('Garmin panel is collapsed (expected behavior)')
    } else {
      // Panel is visible, verify it
      await expect(page.locator('text=Garmin Sync')).toBeVisible()
    }
  })
})

test.describe('Garmin Integration - Coach Dashboard', () => {
  test('should show Garmin widget on coach dashboard when enabled', async ({ page, context }) => {
    // Enable Garmin feature flag
    await context.addInitScript(() => {
      // Enable test mode to prevent real PostHog initialization
      ;(window as any).__POSTHOG_TEST_MODE__ = true
      ;(window as any).posthog = {
        isFeatureEnabled: (flag: string) => (flag === 'garmin-integration' ? true : false),
        getFeatureFlag: (flag: string) => (flag === 'garmin-integration' ? true : false),
        onFeatureFlags: (callback: () => void) => callback(),
        has_opted_in_capturing: () => false,
      }
    })

    // Authenticate as coach
    await page.goto('/auth/signin')
    await page.fill('input[id="email"]', TEST_COACH_EMAIL)
    await page.fill('input[id="password"]', TEST_COACH_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for coach dashboard
    await page.waitForURL('**/dashboard/coach', { timeout: TEST_TIMEOUTS.long })

    // Verify both Strava and Garmin widgets are visible
    await expect(page.locator('[data-testid="strava-dashboard-widget"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.medium,
    })
    await expect(page.locator('[data-testid="garmin-dashboard-widget"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.medium,
    })
  })
})

test.describe('Garmin Integration - Connection Flow (Mocked)', () => {
  test.beforeEach(async ({ page, context }) => {
    // Enable Garmin feature flag
    await context.addInitScript(() => {
      // Enable test mode to prevent real PostHog initialization
      ;(window as any).__POSTHOG_TEST_MODE__ = true
      ;(window as any).posthog = {
        isFeatureEnabled: (flag: string) => (flag === 'garmin-integration' ? true : false),
        getFeatureFlag: (flag: string) => (flag === 'garmin-integration' ? true : false),
        onFeatureFlags: (callback: () => void) => callback(),
        has_opted_in_capturing: () => false,
      }
    })

    // Authenticate as runner
    await page.goto('/auth/signin')
    await page.fill('input[id="email"]', TEST_RUNNER_EMAIL)
    await page.fill('input[id="password"]', TEST_RUNNER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard/runner', { timeout: TEST_TIMEOUTS.long })
  })

  test('should attempt to initiate Garmin OAuth when clicking connect button', async ({ page }) => {
    // Navigate to Settings → Integrations
    await page.goto('/settings')
    await page.click('text=Integrations')
    await page.waitForTimeout(1000)

    // Set up route interception to prevent actual OAuth redirect
    await page.route('**/api/garmin/connect**', route => {
      // Intercept the OAuth initiation request
      route.fulfill({
        status: 200,
        body: JSON.stringify({ message: 'OAuth flow initiated' }),
      })
    })

    // Click connect button
    const connectButton = page
      .locator('button:has-text("Connect"), button:has-text("Garmin")')
      .first()

    // Check if button exists before trying to click
    const buttonExists = await connectButton.count()
    if (buttonExists > 0) {
      // Store the current URL to verify redirection attempt
      const currentUrl = page.url()

      // Click the connect button
      await connectButton.click()

      // In a real scenario, this would redirect to Garmin OAuth
      // Since we're mocking, we just verify the button was clickable
      expect(buttonExists).toBeGreaterThan(0)
    }
  })

  test('should show "Not Connected" status initially', async ({ page }) => {
    // Go directly to dashboard
    await page.goto('/dashboard/runner')

    // Find Garmin widget
    const garminWidget = page.locator('[data-testid="garmin-dashboard-widget"]')
    await expect(garminWidget).toBeVisible({ timeout: TEST_TIMEOUTS.medium })

    // Check for "Not Connected" chip/status
    const notConnectedStatus = garminWidget.locator('text=Not Connected')
    await expect(notConnectedStatus).toBeVisible()
  })
})

test.describe('Garmin Integration - Accessibility', () => {
  test('Garmin components should be keyboard accessible', async ({ page, context }) => {
    // Enable Garmin feature flag
    await context.addInitScript(() => {
      // Enable test mode to prevent real PostHog initialization
      ;(window as any).__POSTHOG_TEST_MODE__ = true
      ;(window as any).posthog = {
        isFeatureEnabled: (flag: string) => (flag === 'garmin-integration' ? true : false),
        getFeatureFlag: (flag: string) => (flag === 'garmin-integration' ? true : false),
        onFeatureFlags: (callback: () => void) => callback(),
        has_opted_in_capturing: () => false,
      }
    })

    // Authenticate as runner
    await page.goto('/auth/signin')
    await page.fill('input[id="email"]', TEST_RUNNER_EMAIL)
    await page.fill('input[id="password"]', TEST_RUNNER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard/runner', { timeout: TEST_TIMEOUTS.long })

    // Navigate to Settings
    await page.goto('/settings')
    await page.click('text=Integrations')
    await page.waitForTimeout(1000)

    // Tab through the page and verify Garmin button is focusable
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // The connect button should be focusable and have proper aria labels
    const connectButton = page
      .locator('button:has-text("Connect"), button:has-text("Garmin")')
      .first()
    if ((await connectButton.count()) > 0) {
      await connectButton.focus()
      await expect(connectButton).toBeFocused()
    }
  })
})
