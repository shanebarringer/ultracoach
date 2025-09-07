import { Page } from '@playwright/test'

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
  // As per Context7 docs, always wait 2000ms for hydration
  await page.waitForTimeout(2000)

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

  // Wait for React hydration - increased from 500ms to 2000ms per best practices
  await page.waitForTimeout(2000)
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
    await page.waitForTimeout(2000) // Proper React hydration wait per Context7 docs
  }

  return clicked
}
