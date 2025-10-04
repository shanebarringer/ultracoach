import { Page, expect } from '@playwright/test'

/**
 * HeroUI-specific test helpers for Playwright
 *
 * HeroUI components often render in portals and have animations,
 * requiring special handling in tests.
 */

// Timeout configuration - CI needs longer timeouts
const TIMEOUTS = {
  short: process.env.CI ? 5000 : 2000,
  medium: process.env.CI ? 10000 : 5000,
  long: process.env.CI ? 20000 : 10000,
}

/**
 * Wait for HeroUI components to be fully ready
 * Handles React hydration, loading states, and animations
 */
export async function waitForHeroUIReady(page: Page, options: { timeout?: number } = {}) {
  const { timeout = TIMEOUTS.long } = options

  // Wait for React hydration (critical for Next.js + HeroUI)
  // Note: Caller should handle page.goto with appropriate waitUntil option
  // This function focuses on React/HeroUI-specific readiness
  await page
    .locator('[data-hydrated="true"], #__next')
    .waitFor({ timeout: TIMEOUTS.medium })
    .catch(() => {
      // Fallback: if no hydration marker, wait briefly for React to initialize
      if (process.env.DEBUG_TESTS) {
        console.log('No hydration marker found, using fallback timeout')
      }
      return page.waitForTimeout(process.env.CI ? 1000 : 500)
    })

  // Wait for any loading indicators to disappear
  const loadingIndicators = [
    '[aria-busy="true"]',
    'text=Loading...',
    '.heroui-spinner',
    '[data-loading="true"]',
    'text=Loading connected runners...',
  ]

  for (const indicator of loadingIndicators) {
    try {
      const element = page.locator(indicator).first()
      // Check visibility first to avoid waiting for elements that don't exist
      // Only wait for hiding if element is currently visible
      const isVisible = await element.isVisible().catch(() => false)

      if (isVisible) {
        await element.waitFor({ state: 'hidden', timeout }).catch(() => {
          if (process.env.DEBUG_TESTS) {
            console.log(`Loading indicator still visible after timeout: ${indicator}`)
          }
        })
      }
    } catch (error) {
      // Element not found or already hidden, continue
      if (process.env.DEBUG_TESTS) {
        console.log(`Error checking loading indicator ${indicator}:`, error)
      }
    }
  }
}

/**
 * Select an option from a HeroUI Select component
 * Handles portal rendering and animations
 */
export async function selectHeroUIOption(
  page: Page,
  selectLabel: string | RegExp,
  optionText: string | RegExp,
  options: { timeout?: number; waitForLoading?: boolean } = {}
) {
  const { timeout = 10000, waitForLoading = true } = options

  // Wait for any loading to complete first
  if (waitForLoading) {
    await waitForHeroUIReady(page)
  }

  // Find and click the select trigger button
  // HeroUI Select renders as a button with the label
  const selectTrigger = page
    .getByRole('button', { name: selectLabel })
    .or(page.getByLabel(selectLabel))
    .or(page.locator('button').filter({ hasText: selectLabel }))

  await selectTrigger.waitFor({ state: 'visible', timeout })

  // Check if still loading
  const triggerText = await selectTrigger.textContent()
  if (triggerText?.includes('Loading')) {
    // Wait for loading to finish with a shorter timeout
    try {
      await page.waitForFunction(
        () => {
          const buttons = document.querySelectorAll('button')
          for (const button of buttons) {
            if (
              button.textContent?.includes('Select Runner') &&
              !button.textContent?.includes('Loading')
            ) {
              return true
            }
          }
          return false
        },
        { timeout: Math.min(5000, timeout) } // Max 5s wait for loading
      )
    } catch (loadingTimeout) {
      // Loading timed out - this might mean no runners are available
    }
  }

  // Click to open dropdown
  await selectTrigger.click()

  // Wait for dropdown to open by checking for visible options
  await page
    .waitForSelector('[role="option"], [data-key], [data-value]', {
      state: 'visible',
      timeout: 2000,
    })
    .catch(() => {
      // If no options appear, the dropdown might be empty or still loading
    })

  // Look for option in portal (HeroUI renders dropdowns at body level)
  // Try multiple selector strategies
  const optionSelectors = [
    page.getByRole('option', { name: optionText }),
    page.locator('[role="option"]').filter({ hasText: optionText }),
    page.locator('[data-key]').filter({ hasText: optionText }),
    page.locator('[data-value]').filter({ hasText: optionText }),
    page.getByText(optionText, { exact: false }),
  ]

  let clicked = false
  for (const selector of optionSelectors) {
    try {
      await selector.first().click({ timeout: 2000 })
      clicked = true
      break
    } catch {
      continue
    }
  }

  if (!clicked) {
    throw new Error(`Could not select option: ${optionText.toString()}`)
  }

  // Wait for dropdown to close by checking that options are no longer visible
  await page
    .waitForSelector('[role="option"], [data-key], [data-value]', {
      state: 'hidden',
      timeout: 2000,
    })
    .catch(() => {
      // Options might already be hidden or dropdown closed
    })
}

/**
 * Click a button with retry logic
 * Handles dynamic rendering and timing issues
 */
export async function clickButtonWithRetry(
  page: Page,
  buttonText: string | RegExp,
  options: { maxRetries?: number; timeout?: number } = {}
) {
  const { maxRetries = 3, timeout = 5000 } = options

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try multiple selector strategies
      const buttonSelectors = [
        page.getByRole('button', { name: buttonText }),
        page.locator('button').filter({ hasText: buttonText }),
        page.getByText(buttonText).locator('..').filter({ hasText: buttonText }),
      ]

      let button
      for (const selector of buttonSelectors) {
        try {
          await expect(selector).toBeVisible({ timeout: 1000 })
          button = selector
          break
        } catch {
          // Try next selector
        }
      }

      if (!button) {
        throw new Error(`Button not found: ${buttonText}`)
      }

      await button.click()
      return
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error
      }
      await page.waitForTimeout(1000)
    }
  }
}

/**
 * Wait for all loading states to complete
 * This is a lighter-weight alternative to waitForHeroUIReady
 * for cases where you just need to wait for loading indicators
 */
export async function waitForLoadingComplete(page: Page, options: { timeout?: number } = {}) {
  const { timeout = TIMEOUTS.medium } = options

  // Wait for specific loading texts
  const loadingTexts = [
    'Loading...',
    'Loading connected runners...',
    'Loading conversations...',
    'Fetching...',
    'Please wait...',
  ]

  for (const text of loadingTexts) {
    try {
      const loader = page.getByText(text, { exact: false }).first()
      const isVisible = await loader.isVisible().catch(() => false)

      if (isVisible) {
        await loader.waitFor({ state: 'hidden', timeout }).catch(() => {
          if (process.env.DEBUG_TESTS) {
            console.log(`Loading text still visible after timeout: ${text}`)
          }
        })
      }
    } catch (error) {
      // Not visible or already hidden
      if (process.env.DEBUG_TESTS) {
        console.log(`Error checking loading text ${text}:`, error)
      }
    }
  }

  // Wait for aria-busy
  try {
    const busyElements = page.locator('[aria-busy="true"]')
    const hasBusy = (await busyElements.count()) > 0

    if (hasBusy) {
      await page
        .waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: TIMEOUTS.short })
        .catch(() => {
          if (process.env.DEBUG_TESTS) {
            console.log('aria-busy elements still present after timeout')
          }
        })
    }
  } catch {
    // No busy elements or already not busy
  }
}

/**
 * Select from a HeroUI dropdown menu (different from Select)
 */
export async function selectHeroUIDropdownOption(
  page: Page,
  triggerSelector: string,
  optionText: string
) {
  // Click trigger (could be a button with dots icon)
  const trigger = page.locator(triggerSelector)
  await trigger.waitFor({ state: 'visible' })
  await trigger.click()

  // Wait for menu to open by checking for visible menu items
  await page
    .waitForSelector('[role="menuitem"]', {
      state: 'visible',
      timeout: 2000,
    })
    .catch(() => {
      // Menu might be empty or still loading
    })

  // Click option in dropdown menu
  const option = page
    .getByRole('menuitem', { name: optionText })
    .or(page.locator(`[role="menuitem"]:has-text("${optionText}")`))

  await option.click()
}

/**
 * Type in a HeroUI Input or Textarea with clearing
 */
export async function typeInHeroUIInput(
  page: Page,
  label: string | RegExp,
  text: string,
  options: { clear?: boolean } = {}
) {
  const { clear = true } = options

  const input = page
    .getByLabel(label)
    .or(page.getByPlaceholder(label))
    .or(page.locator(`input[name="${label}"], textarea[name="${label}"]`))

  await input.waitFor({ state: 'visible' })

  if (clear) {
    await input.fill('')
  }

  await input.fill(text)
}

/**
 * Check if a HeroUI modal is open
 */
export async function isModalOpen(page: Page, modalTitle?: string | RegExp) {
  if (modalTitle) {
    return await page
      .getByRole('dialog')
      .filter({ hasText: modalTitle })
      .isVisible()
      .catch(() => false)
  }

  return await page
    .getByRole('dialog')
    .isVisible()
    .catch(() => false)
}

/**
 * Close a HeroUI modal
 */
export async function closeModal(page: Page) {
  // Try multiple close strategies
  const closeStrategies = [
    () => page.getByRole('button', { name: /close/i }).click(),
    () => page.getByLabel('Close').click(),
    () => page.locator('[aria-label="Close"]').click(),
    () => page.keyboard.press('Escape'),
  ]

  for (const strategy of closeStrategies) {
    try {
      await strategy()
      // Wait for modal to close by checking if dialog is no longer visible
      await page
        .waitForSelector('[role="dialog"]', {
          state: 'hidden',
          timeout: 2000,
        })
        .catch(() => {
          // Modal might already be closed
        })
      if (!(await isModalOpen(page))) {
        return
      }
    } catch {
      continue
    }
  }
}
