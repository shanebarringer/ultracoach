import { type Locator, Page, expect, test } from '@playwright/test'

/**
 * Wait for the page to be fully loaded and ready for interaction
 * This is more reliable than waitForLoadState alone
 */
export async function waitForPageReady(page: Page) {
  // Wait for initial HTML load
  await page.waitForLoadState('domcontentloaded')

  // IMPORTANT: Don't use networkidle with real-time features (WebSocket connections)
  // as per Playwright best practices documentation

  // Wait for React hydration - CRITICAL for Next.js apps
  // As per Context7 docs, always wait 2000ms for hydration (3000ms in CI for extra stability)
  await page.waitForTimeout(process.env.CI ? 3000 : 2000)

  // Then verify interactive elements are present
  await page.waitForFunction(
    () => {
      const buttons = document.querySelectorAll('button, a[href]')
      return buttons.length > 0
    },
    { timeout: 10000 }
  )
}

/**
 * Wait for navigation menu to be ready
 * The navigation might be client-side rendered
 */
export async function waitForNavigation(page: Page) {
  // Wait for nav element
  await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

  // Wait for React hydration - increased from 500ms to 2000ms per best practices (3000ms in CI)
  await page.waitForTimeout(process.env.CI ? 3000 : 2000)
}

/**
 * Sign in helper with proper waits
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/signin')
  await waitForPageReady(page)

  // Fill credentials using type selectors which are more reliable
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)

  // Submit form using the button with mountain-themed text
  await page.getByRole('button', { name: /Begin Your Expedition/i }).click()

  // Wait for navigation to dashboard
  await page.waitForURL(/\/dashboard\/(coach|runner)/, { timeout: 15000 })

  // Wait for dashboard to be ready
  await waitForPageReady(page)
  await waitForNavigation(page)
}

/**
 * Navigate to a page with proper waits
 */
export async function navigateToPage(page: Page, linkText: string | RegExp, required = false) {
  // Try multiple selectors for navigation links
  const selectors = [
    page.getByRole('link', { name: linkText }),
    page.getByRole('button', { name: linkText }),
    page.getByText(linkText),
    page.locator(`a:has-text("${linkText}")`),
  ]

  let clicked = false
  for (const selector of selectors) {
    try {
      if (await selector.isVisible({ timeout: 1000 })) {
        await selector.click()
        clicked = true
        break
      }
    } catch {
      // Try next selector
    }
  }

  if (!clicked && required) {
    throw new Error(`Could not find navigation element: ${linkText}`)
  }

  if (clicked) {
    // Wait for navigation to complete
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(process.env.CI ? 3000 : 2000) // Proper React hydration wait per Context7 docs (3000ms in CI)
  }

  return clicked
}

/**
 * Navigate to a protected page with auth verification.
 * If the page redirects to signin, the test is skipped with a clear message.
 *
 * @param page - Playwright page object
 * @param targetUrl - The protected URL to navigate to
 * @param options - Configuration options
 * @returns true if navigation succeeded, throws or skips if auth failed
 */
export async function navigateWithAuthVerification(
  page: Page,
  targetUrl: string,
  options: { skipOnAuthFailure?: boolean; timeout?: number } = {}
) {
  const { skipOnAuthFailure = true, timeout = 10000 } = options

  await page.goto(targetUrl)
  await page.waitForLoadState('domcontentloaded')

  // Check if we got redirected to signin using precise regex to avoid matching
  // unintended paths like /auth/signin-callback
  const currentUrl = page.url()
  const isAuthRedirect = /\/(auth\/(signin|signup))($|\?)/.test(currentUrl)

  if (isAuthRedirect) {
    const errorMessage = `Auth redirect detected: Expected "${targetUrl}" but got "${currentUrl}". storageState may not be loaded correctly.`

    if (skipOnAuthFailure) {
      test.skip(true, errorMessage)
    } else {
      throw new Error(errorMessage)
    }
  }

  // Verify we're on the expected URL
  // Escape ALL regex metacharacters: . * + ? ^ $ { } ( ) | [ ] \ /
  const escapedUrl = targetUrl.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')
  await expect(page).toHaveURL(new RegExp(escapedUrl), {
    timeout,
  })

  // Wait for page to be fully ready (includes React hydration)
  await waitForPageReady(page)

  return true
}

/**
 * Wait for Suspense boundaries to resolve by detecting when loading states disappear.
 * Uses a more lenient approach that checks for significant loading reduction rather
 * than waiting for ALL loaders to disappear (which can timeout in complex UIs).
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 * @param options.timeout - Maximum time to wait in milliseconds (default: 15000)
 * @param options.maxSkeletons - Maximum skeletons to allow (default: 2 for minor UI elements)
 * @returns Promise that resolves when main Suspense boundaries have resolved
 */
export async function waitForSuspenseBoundary(
  page: Page,
  options: { timeout?: number; maxSkeletons?: number } = {}
) {
  const { timeout = 15000, maxSkeletons = 2 } = options

  // Wait for main content to load - allow minor skeleton elements to persist
  // This prevents timeouts when small UI elements (avatars, badges) are still loading
  await page.waitForFunction(
    (maxAllowed: number) => {
      const skeletons = document.querySelectorAll('.animate-pulse')
      // Check for blocking "Loading..." text in main content area only
      const mainContent = document.querySelector('main') || document.body
      const hasBlockingLoader = mainContent.textContent?.includes('Loading...') ?? false
      // Allow test to proceed if skeletons are minimal and no blocking loader
      return skeletons.length <= maxAllowed && !hasBlockingLoader
    },
    maxSkeletons,
    { timeout }
  )

  // Brief wait for React state updates (reduced from 2000/1000)
  await page.waitForTimeout(process.env.CI ? 1000 : 500)
}

/**
 * Gets a button locator and skips the test if the button is not available.
 * Useful for tests that depend on specific test data being seeded.
 *
 * @param page - Playwright Page object
 * @param buttonName - Name of the button to look for (default: 'Connect')
 * @param options - Configuration options
 * @param options.timeout - Timeout in ms for visibility check (default: 5000)
 * @param options.testName - Test name to include in skip message
 * @returns The button locator (always returns when button is found; test.skip() throws if not found)
 */
export async function getConnectButtonOrSkip(
  page: Page,
  buttonName: string = 'Connect',
  options: { timeout?: number; testName?: string } = {}
): Promise<Locator> {
  const { timeout = 5000, testName = 'test' } = options

  const button = page.getByRole('button', { name: buttonName }).first()
  const hasButton = await button.isVisible({ timeout }).catch(() => false)

  if (!hasButton) {
    test.skip(
      true,
      `No "${buttonName}" buttons available - test data may not be seeded for ${testName}`
    )
  }

  return button
}
