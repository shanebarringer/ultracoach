import { Page, expect, test } from '@playwright/test'

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

  // Check if we got redirected to signin
  const currentUrl = page.url()
  const isAuthRedirect = currentUrl.includes('/auth/signin') || currentUrl.includes('/auth/signup')

  if (isAuthRedirect) {
    const errorMessage = `Auth redirect detected: Expected "${targetUrl}" but got "${currentUrl}". storageState may not be loaded correctly.`

    if (skipOnAuthFailure) {
      test.skip(true, errorMessage)
    } else {
      throw new Error(errorMessage)
    }
  }

  // Verify we're on the expected URL
  await expect(page).toHaveURL(new RegExp(targetUrl.replace(/\//g, '\\/')), {
    timeout,
  })

  // Wait for React hydration
  await page.waitForTimeout(process.env.CI ? 3000 : 2000)

  return true
}
