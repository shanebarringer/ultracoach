import { Page, expect } from '@playwright/test'

/**
 * HeroUI-specific test helpers for Playwright
 *
 * HeroUI components often render in portals and have animations,
 * requiring special handling in tests.
 */

/**
 * Wait for HeroUI components to be fully ready
 * Handles React hydration, loading states, and animations
 */
export async function waitForHeroUIReady(page: Page) {
  // Wait for DOM
  await page.waitForLoadState('domcontentloaded')

  // Wait for React hydration (critical for Next.js + HeroUI)
  await page.waitForTimeout(process.env.CI ? 3000 : 2000)

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
      try {
        await expect(element).toBeVisible({ timeout: 100 })
        await element.waitFor({ state: 'hidden', timeout: 10000 })
      } catch {
        // Element not visible, continue
      }
    } catch {
      // Element not found or already hidden, continue
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

  // Wait for dropdown animation
  await page.waitForTimeout(500)

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

  // Wait for dropdown to close
  await page.waitForTimeout(300)
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
        page.locator(`button:has-text("${buttonText}")`),
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
 */
export async function waitForLoadingComplete(page: Page, timeout = 10000) {
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
      try {
        await expect(loader).toBeVisible({ timeout: 100 })
        await loader.waitFor({ state: 'hidden', timeout })
      } catch {
        // Not visible, continue
      }
    } catch {
      // Not visible or already hidden
    }
  }

  // Wait for aria-busy
  try {
    await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 1000 })
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

  // Wait for menu animation
  await page.waitForTimeout(300)

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
      // Wait for modal to close
      await page.waitForTimeout(300)
      if (!(await isModalOpen(page))) {
        return
      }
    } catch {
      continue
    }
  }
}
