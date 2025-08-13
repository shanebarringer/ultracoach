import { expect, test } from '@playwright/test'
import { Logger } from 'tslog'

const logger = new Logger({
  name: 'PlaywrightSignupTest',
  minLevel: 0, // info level
})

test.describe('Signup Flow Test', () => {
  test('should signup as coach and assign correct userType', async ({ page }) => {
    // Generate unique email to prevent conflicts with existing users
    const timestamp = Date.now()
    const uniqueEmail = `testcoach${timestamp}@example.com`

    // Navigate to signup page
    await page.goto('/auth/signup')

    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('input[type="email"]', { state: 'visible' })

    logger.info('🧪 Testing coach signup flow with email:', uniqueEmail)

    // Fill form fields
    await page.fill('input[name="fullName"]', 'Test Coach User')
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', 'TestPassword123!')

    // Select coach role - Use programmatic approach to bypass HeroUI interaction
    logger.info('🎯 Setting coach role programmatically...')

    // Use JavaScript to directly set the form field value
    await page.evaluate(() => {
      // Find the React Hook Form instance and set the role field
      const form = document.querySelector('form')
      if (form) {
        // Dispatch a change event to simulate selection
        const roleField =
          document.querySelector('input[name="role"]') ||
          document.querySelector('[data-testid="role-select"]')

        // Try to find the HeroUI select button and simulate selection
        const selectButton =
          document.querySelector('[role="combobox"]') ||
          Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent && btn.textContent.includes('Choose your path')
          )

        if (selectButton) {
          // Create and dispatch events to simulate selection
          const changeEvent = new Event('change', { bubbles: true })
          const inputEvent = new Event('input', { bubbles: true })

          // Try to set the value directly on the select element
          selectButton.setAttribute('data-selected', 'coach')
          selectButton.dispatchEvent(changeEvent)
          selectButton.dispatchEvent(inputEvent)
        }
      }
    })

    // Also try clicking the coach option directly if still visible
    try {
      const selectButton = page.locator('button:has-text("Choose your path")')
      await selectButton.click()
      await page.waitForTimeout(300)

      // Try to click coach option with multiple strategies
      const coachSelectors = [
        '[data-key="coach"]',
        'li:has-text("Mountain Guide")',
        '[role="option"]:has-text("Mountain Guide")',
      ]

      for (const selector of coachSelectors) {
        try {
          const element = page.locator(selector)
          if (await element.isVisible({ timeout: 1000 })) {
            await element.click()
            logger.info(`✅ Successfully clicked coach option with: ${selector}`)
            break
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }

      await page.waitForTimeout(500)
    } catch (e) {
      logger.warn('⚠️ Backup click selection failed, relying on programmatic approach')
    }

    logger.info('✅ Completed coach role selection')

    // Submit form
    await page.click('button[type="submit"]')

    // In test environment, expect direct redirect to dashboard without onboarding modal
    logger.info('✅ Signup submitted, waiting for redirect to dashboard')

    // Should redirect to coach dashboard
    await expect(page).toHaveURL(/dashboard\/coach/, { timeout: 15000 })
    logger.info('✅ Successfully redirected to coach dashboard')

    // Take screenshot
    await page.screenshot({ path: 'successful-coach-signup.png' })
  })

  test('should signup as runner and assign correct userType', async ({ page }) => {
    // Generate unique email to prevent conflicts with existing users
    const timestamp = Date.now()
    const uniqueEmail = `testrunner${timestamp}@example.com`

    // Navigate to signup page
    await page.goto('/auth/signup')

    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('input[type="email"]', { state: 'visible' })

    logger.info('🧪 Testing runner signup flow with email:', uniqueEmail)

    // Fill form fields
    await page.fill('input[name="fullName"]', 'Test Runner User')
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', 'TestPassword123!')

    // Select runner role - Direct React Hook Form field manipulation
    logger.info('🎯 Setting runner role via React Hook Form...')

    // Try multiple approaches to ensure selection sticks
    let selectionSuccess = false

    try {
      const selectButton = page.locator('button:has-text("Choose your path")')
      await selectButton.click()
      await page.waitForTimeout(300)

      // Try to click runner option and verify it's selected
      const runnerOption = page.locator('[data-key="runner"]')
      if (await runnerOption.isVisible({ timeout: 2000 })) {
        await runnerOption.click()
        logger.info('✅ Clicked runner option')
        await page.waitForTimeout(500)

        // Wait for the selection to appear in the button text
        try {
          await page.waitForSelector('button:has-text("Trail Runner")', { timeout: 3000 })
          logger.info('✅ Verified runner selection appeared in UI')
          selectionSuccess = true
        } catch (e) {
          logger.warn('⚠️ Runner selection did not appear in UI, trying double-click')
          // Try double-clicking as a fallback
          await selectButton.click()
          await page.waitForTimeout(300)
          await runnerOption.click()
          await page.waitForTimeout(500)

          // Check again
          try {
            await page.waitForSelector('button:has-text("Trail Runner")', { timeout: 2000 })
            logger.info('✅ Double-click approach worked - runner selected')
            selectionSuccess = true
          } catch (e2) {
            logger.warn('⚠️ Double-click also failed')
          }
        }
      }
    } catch (e) {
      logger.warn('⚠️ Click selection failed:', e instanceof Error ? e.message : 'Unknown error')
    }

    if (!selectionSuccess) {
      logger.warn('⚠️ UI selection failed, trying programmatic approach as last resort')

      // Try to force the selection by manipulating the DOM directly
      await page.evaluate(() => {
        // Try to find any form element with a role value and set it
        const inputs = document.querySelectorAll('input, select, [name]')
        for (const input of inputs) {
          const element = input as HTMLInputElement | HTMLSelectElement
          if (element.name === 'role' || element.getAttribute('data-testid') === 'role-select') {
            element.value = 'runner'
            element.dispatchEvent(new Event('change', { bubbles: true }))
            element.dispatchEvent(new Event('input', { bubbles: true }))
            console.log('Set role via direct DOM manipulation')
            return true
          }
        }
        return false
      })
    }

    logger.info('✅ Completed runner role selection')

    // Submit form
    await page.click('button[type="submit"]')

    // In test environment, expect direct redirect to dashboard without onboarding modal
    logger.info('✅ Signup submitted, waiting for redirect to dashboard')

    // Should redirect to runner dashboard
    await expect(page).toHaveURL(/dashboard\/runner/, { timeout: 15000 })
    logger.info('✅ Successfully redirected to runner dashboard')

    // Take screenshot
    await page.screenshot({ path: 'successful-runner-signup.png' })
  })
})
