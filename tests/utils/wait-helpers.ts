import { Page, expect } from '@playwright/test'

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
      await expect(selector).toBeVisible({ timeout: 1000 })
      await selector.click()
      clicked = true
      break
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
 * Wait until a locator is attached, visible and enabled, then click.
 * Provides clearer error messages than a bare click on flaky UIs.
 */
export async function clickWhenReady(locator: import('@playwright/test').Locator, timeout = 10000) {
  const start = Date.now()
  await locator.waitFor({ state: 'attached', timeout })
  await locator.waitFor({ state: 'visible', timeout })
  await expect(locator).toBeEnabled({ timeout })
  try {
    await locator.click({ timeout })
  } catch (err) {
    const ms = Date.now() - start
    throw new Error(`clickWhenReady failed after ${ms}ms: ${String(err)}`)
  }
}

export async function waitUntilVisible(
  locator: import('@playwright/test').Locator,
  timeout = 10000
) {
  await locator.waitFor({ state: 'visible', timeout })
}

export async function waitUntilHidden(
  locator: import('@playwright/test').Locator,
  timeout = 10000
) {
  await locator.waitFor({ state: 'hidden', timeout })
}
