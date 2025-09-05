import { Page } from '@playwright/test'

/**
 * Wait for the page to be fully loaded and ready for interaction
 * This is more reliable than waitForLoadState alone
 */
export async function waitForPageReady(page: Page) {
  // Wait for initial HTML load
  await page.waitForLoadState('domcontentloaded')

  // Wait for network to settle (but with a reasonable timeout)
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 })
  } catch {
    // Continue even if network doesn't fully settle
  }

  // Wait for React hydration by checking for interactive elements
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

  // Wait a bit for React hydration
  await page.waitForTimeout(500)
}

/**
 * Sign in helper with proper waits
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/signin')
  await waitForPageReady(page)

  // Fill credentials
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)

  // Submit form
  await page.getByLabel(/password/i).press('Enter')

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
    await page.waitForTimeout(500) // Small delay for React
  }

  return clicked
}
