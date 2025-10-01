/**
 * Suspense-Aware Test Utilities
 *
 * Helper functions for testing React components that use Suspense boundaries.
 * These utilities follow Playwright best practices and Context7 recommendations.
 */
import { Page, expect } from '@playwright/test'

import type { TestLogger } from './test-logger'

/**
 * Waits for dashboard content to be loaded and ready for interaction.
 * This is Suspense-aware and handles both coach and runner dashboards.
 */
export async function waitForDashboardReady(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      const dashboardContent = document.querySelector(
        'h1, h2, h3, [data-testid="dashboard-content"]'
      )
      return dashboardContent !== null
    },
    { timeout }
  )
}

/**
 * Waits for authentication flow to complete and dashboard to be accessible.
 * Uses URL verification instead of specific welcome messages.
 */
export async function waitForAuthenticationSuccess(
  page: Page,
  expectedRole: 'runner' | 'coach',
  timeout = 15000
): Promise<void> {
  // Wait for redirect to dashboard
  await page.waitForURL(`**/dashboard/${expectedRole}`, { timeout })

  // Verify URL is correct
  await expect(page).toHaveURL(`/dashboard/${expectedRole}`)

  // Wait for dashboard content to load
  await waitForDashboardReady(page, timeout)

  // Verify we're not redirected back to signin
  await expect(page).not.toHaveURL('/auth/signin')
}

/**
 * Waits for async form submission to complete.
 * Handles both success and error states.
 */
export async function waitForFormSubmission(page: Page, timeout = 15000): Promise<void> {
  await page.waitForFunction(
    () => {
      // Look for success indicators, error messages, or URL changes
      const successElement = document.querySelector(
        '[data-testid="success"], .success, text=/success|created|updated/i'
      )
      const errorElement = document.querySelector(
        '[data-testid="error"], .error, text=/error|failed/i'
      )
      const currentUrl = window.location.pathname
      const hasRedirected = !currentUrl.includes('/auth/')

      return successElement !== null || errorElement !== null || hasRedirected
    },
    { timeout }
  )
}

/**
 * Waits for file upload processing to complete.
 * Uses data-testid attributes and Context7-approved waiting strategies.
 */
export async function waitForFileUploadProcessing(
  page: Page,
  expectedContent?: string | RegExp,
  timeout = 90000,
  logger?: TestLogger
): Promise<void> {
  logger?.info?.('Starting waitForFileUploadProcessing', { expectedContent })
  const waitTimeout = timeout ?? 30000

  // First wait for any loading indicators to appear and disappear
  try {
    await page.locator('text=/processing|uploading|parsing|loading/i').waitFor({ timeout: 5000 })
    await page
      .locator('text=/processing|uploading|parsing|loading/i')
      .waitFor({ state: 'hidden', timeout: waitTimeout })
    logger?.debug?.('Loading indicators cleared')
  } catch {
    logger?.debug?.('No loading indicators detected')
  }

  // Wait for preview content to be visible (deterministic readiness signal)
  try {
    // Prefer the actual content render over brittle tab aria attributes
    const previewPanel = page.getByTestId('preview-content')
    await previewPanel.waitFor({ state: 'visible', timeout: waitTimeout })
    logger?.debug?.('Preview content visible')
  } catch (error) {
    logger?.error?.('Preview content error', { error })
    throw error
  }

  if (expectedContent) {
    logger?.info?.('Waiting for specific content', { expectedContent })

    // Wait for race list to be populated
    const raceList = page.getByTestId('race-list')
    await raceList.waitFor({ state: 'visible', timeout: waitTimeout })

    // Wait for the specific race name to appear
    try {
      const raceElement = raceList.getByText(expectedContent)
      await raceElement.waitFor({ state: 'visible', timeout: waitTimeout })
      logger?.info?.('Found expected race content', { expectedContent })
    } catch (error) {
      // Check if there are any error messages instead
      const errorSelectors = [
        'text=/error|failed|invalid/i',
        '[data-testid*="error"]',
        '.text-danger',
      ]

      for (const selector of errorSelectors) {
        try {
          const errorElement = page.locator(selector).first()
          if (await errorElement.isVisible()) {
            const errorText = await errorElement.textContent()
            logger?.warn?.('Found error message instead', { errorText, expectedContent })
            throw new Error(`Expected "${expectedContent}" but found error: ${errorText}`)
          }
        } catch {
          // Continue to next selector
        }
      }

      logger?.warn?.('Content not found and no errors detected', { expectedContent })
      throw error
    }
  }
}

/**
 * Waits for a page component to be ready for interaction.
 * This is a generic helper for any Suspense-rendered component.
 */
export async function waitForComponentReady(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    sel => {
      const element = document.querySelector(sel)
      return element !== null && element.textContent !== ''
    },
    selector,
    { timeout }
  )
}

/**
 * Waits for navigation to complete with proper Suspense handling.
 * Uses domcontentloaded instead of networkidle per Context7 recommendations.
 */
export async function waitForNavigationComplete(
  page: Page,
  expectedUrl?: string | RegExp,
  timeout = 10000
): Promise<void> {
  if (expectedUrl) {
    await page.waitForURL(expectedUrl, { timeout })
  }

  await page.waitForLoadState('domcontentloaded')

  // Wait for main content to be ready
  await page.waitForFunction(
    () => {
      const mainContent = document.querySelector('main, [role="main"], h1, h2')
      return mainContent !== null
    },
    { timeout }
  )
}

/**
 * Helper for testing role-based dashboard access.
 * Verifies the correct dashboard loads for the user's role.
 */
export async function verifyDashboardAccess(
  page: Page,
  expectedRole: 'runner' | 'coach',
  timeout = 30000
): Promise<void> {
  await expect(page).toHaveURL(`/dashboard/${expectedRole}`)

  await waitForDashboardReady(page, timeout)

  // Role-specific content verification
  if (expectedRole === 'coach') {
    const coachElements = page.locator('text=/Summit|Coach|Your Athletes|Training Expeditions/i')
    await expect(coachElements.first()).toBeVisible({ timeout })
  } else {
    const runnerElements = page.locator('text=/Base Camp|Runner|Training|Workouts/i')
    await expect(runnerElements.first()).toBeVisible({ timeout })
  }
}

/**
 * Waits for file upload error conditions without expecting preview tab selection.
 * Used for invalid files that fail to parse or process.
 */
export async function waitForFileUploadError(
  page: Page,
  timeout = 30000,
  logger?: TestLogger
): Promise<void> {
  logger?.info?.('Starting waitForFileUploadError - waiting for error conditions')

  // First wait for any loading indicators to appear and disappear
  try {
    await page.locator('text=/processing|uploading|parsing|loading/i').waitFor({ timeout: 5000 })
    await page
      .locator('text=/processing|uploading|parsing|loading/i')
      .waitFor({ state: 'hidden', timeout: Math.min(15000, timeout) })
    logger?.debug?.('Loading indicators cleared')
  } catch {
    logger?.debug?.('No loading indicators detected')
  }

  // Wait for preview tab to appear (it will exist but not be selected for errors)
  try {
    const previewTab = page.getByTestId('preview-tab')
    await previewTab.waitFor({ state: 'visible', timeout: Math.min(15000, timeout) })
    logger?.debug?.('Preview tab visible (but may not be selected for errors)')
  } catch (error) {
    logger?.debug?.('Preview tab not found - this is OK for error cases')
  }

  // For error cases, we just wait a bit for any error messages to appear
  // Don't expect preview tab to be selected since parsing failed
  await page.waitForTimeout(3000)
  logger?.debug?.('Error processing wait completed')
}

/**
 * Waits for real-time data updates to propagate.
 * Useful for chat, notifications, and live updates.
 */
export async function waitForRealTimeUpdate(
  page: Page,
  dataSelector: string,
  expectedChange: string | RegExp,
  timeout = 30000
): Promise<void> {
  await page.waitForFunction(
    (selector, change) => {
      const element = document.querySelector(selector)
      if (!element) return false

      const content = element.textContent || ''
      if (typeof change === 'string') {
        return content.includes(change)
      } else {
        return change.test(content)
      }
    },
    dataSelector,
    expectedChange,
    { timeout }
  )
}

/**
 * Waits for Suspense boundaries to resolve and content to be rendered.
 * This helper specifically targets React Suspense loading states in CI environments.
 *
 * @param page - Playwright Page object
 * @param options - Configuration options
 * @param options.timeout - Maximum wait time (default: 20000ms for CI)
 * @param options.selector - Optional specific selector to wait for
 * @param options.logger - Optional test logger for debugging
 */
export async function waitForSuspenseResolution(
  page: Page,
  options: {
    timeout?: number
    selector?: string
    logger?: TestLogger
  } = {}
): Promise<void> {
  const { timeout = 20000, selector, logger } = options

  logger?.info?.('Starting Suspense resolution wait', { selector, timeout })

  // Step 1: Wait for any Suspense fallback UI to appear and disappear
  try {
    const loadingIndicators = page.locator(
      'text=/loading|fetching|preparing|initializing/i, [data-loading="true"], [role="progressbar"]'
    )
    await loadingIndicators.first().waitFor({ timeout: 3000 })
    logger?.debug?.('Suspense fallback detected')

    await loadingIndicators.first().waitFor({ state: 'hidden', timeout })
    logger?.debug?.('Suspense fallback resolved')
  } catch {
    logger?.debug?.('No Suspense fallback detected (content may have loaded immediately)')
  }

  // Step 2: If selector provided, wait for it specifically
  if (selector) {
    await page.waitForSelector(selector, { state: 'visible', timeout })
    logger?.debug?.('Target selector visible', { selector })
  }

  // Step 3: Wait for Jotai atoms to hydrate (check for data-hydrated attribute or content)
  await page.waitForFunction(
    () => {
      // Check if main content area has actual data (not just skeleton/loading state)
      const mainContent = document.querySelector('main, [role="main"]')
      if (!mainContent) return false

      // Look for signs of hydration: actual text content, data attributes, or interactive elements
      const hasContent = mainContent.textContent && mainContent.textContent.trim().length > 50
      const hasInteractiveElements =
        mainContent.querySelectorAll('button:not([disabled]), a[href]').length > 0

      return hasContent || hasInteractiveElements
    },
    { timeout }
  )

  logger?.debug?.('Suspense resolution complete - content hydrated')
}

/**
 * Waits for a modal/dialog with route handlers to be ready for interaction.
 * This is specifically for modals that intercept API routes (e.g., race import duplicate detection).
 *
 * @param page - Playwright Page object
 * @param routePattern - The API route pattern being intercepted (e.g., '/api/races/import')
 * @param options - Configuration options
 */
export async function waitForModalWithRouteHandler(
  page: Page,
  routePattern: string,
  options: {
    timeout?: number
    logger?: TestLogger
  } = {}
): Promise<void> {
  const { timeout = 15000, logger } = options

  logger?.info?.('Waiting for modal with route handler', { routePattern })

  // Step 1: Ensure route handler is registered
  await page.waitForTimeout(500) // Allow route.fulfill() to register

  // Step 2: Wait for dialog to be visible
  const dialog = page.locator('[role="dialog"], .modal')
  await dialog.waitFor({ state: 'visible', timeout })
  logger?.debug?.('Modal visible')

  // Step 3: Wait for modal content to be interactive (not just skeleton)
  await page.waitForFunction(
    () => {
      const modal = document.querySelector('[role="dialog"], .modal')
      if (!modal) return false

      // Check for actual content (not loading state)
      const hasContent = modal.textContent && modal.textContent.trim().length > 20
      const hasButtons = modal.querySelectorAll('button:not([disabled])').length > 0

      return hasContent && hasButtons
    },
    { timeout }
  )

  logger?.debug?.('Modal with route handler ready for interaction')
}

/**
 * Waits for an element with retry logic and better error messages.
 * This is useful for elements that may take time to appear in CI due to Suspense/hydration delays.
 *
 * @param page - Playwright Page object
 * @param selector - Element selector (testid, role, text, etc.)
 * @param options - Configuration options
 */
export async function waitForElementWithRetry(
  page: Page,
  selector: string,
  options: {
    timeout?: number
    retries?: number
    retryDelay?: number
    scrollIntoView?: boolean
    logger?: TestLogger
  } = {}
): Promise<void> {
  const {
    timeout = 15000,
    retries = 3,
    retryDelay = 2000,
    scrollIntoView = false,
    logger,
  } = options

  logger?.info?.('Waiting for element with retry', { selector, retries })

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const element = page.locator(selector)

      // If scrollIntoView requested, try to scroll first
      if (scrollIntoView) {
        try {
          await element.scrollIntoViewIfNeeded({ timeout: 5000 })
          logger?.debug?.('Scrolled element into view', { attempt })
        } catch {
          logger?.debug?.('Could not scroll (element may not exist yet)', { attempt })
        }
      }

      await element.waitFor({ state: 'visible', timeout: timeout / retries })
      logger?.debug?.('Element visible', { attempt })
      return // Success!
    } catch (error) {
      if (attempt === retries) {
        // Last attempt failed - throw detailed error
        const currentUrl = page.url()
        const pageTitle = await page.title().catch(() => 'Unknown')

        logger?.error?.('Element not visible after all retries', {
          selector,
          retries,
          currentUrl,
          pageTitle,
        })

        throw new Error(
          `Element "${selector}" not visible after ${retries} attempts. URL: ${currentUrl}, Title: ${pageTitle}`
        )
      }

      // Wait before retry
      logger?.warn?.('Element not visible, retrying...', { attempt, retries })
      await page.waitForTimeout(retryDelay)
    }
  }
}
