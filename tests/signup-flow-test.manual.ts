import { type Page, expect, test } from '@playwright/test'
import { Logger } from 'tslog'

const logger = new Logger({
  name: 'PlaywrightSignupTest',
  minLevel: 0, // info level
})

// Define proper types for form fields
interface SignupFormData {
  fullName: string
  email: string
  password: string
  role: 'runner' | 'coach'
}

// Helper function for filling form fields with proper error handling
async function fillSignupForm(page: Page, formData: SignupFormData): Promise<void> {
  logger.info(`🧪 Testing ${formData.role} signup flow with email:`, formData.email)

  // Fill form fields using proper input selectors
  await page.fill('input[id="fullName"]', formData.fullName)
  await page.fill('input[id="email"]', formData.email)
  await page.fill('input[id="password"]', formData.password)

  logger.info('✅ Filled all text input fields')
}

// Helper function for selecting role with type safety
async function selectUserRole(page: Page, role: 'runner' | 'coach'): Promise<void> {
  logger.info(`🎯 Selecting ${role} role using proper HeroUI Select interaction...`)

  // Click the select trigger button to open dropdown
  const selectTrigger = page.locator('button:has-text("Choose your path")').first()
  await expect(selectTrigger).toBeVisible({ timeout: 5000 })
  await selectTrigger.click()

  // Wait for the dropdown to appear
  await page.waitForSelector('[role="listbox"]', { state: 'visible', timeout: 5000 })
  logger.info('✅ Select dropdown opened')

  // Define role-specific selectors based on the actual component structure
  const roleSelectors = {
    coach: {
      key: 'coach',
      text: 'Mountain Guide',
      description: 'Lead others to their summit',
    },
    runner: {
      key: 'runner',
      text: 'Trail Runner',
      description: 'Conquer your personal peaks',
    },
  }

  const targetRole = roleSelectors[role]

  // Try multiple selector strategies in order of preference
  const selectors = [
    `[data-key="${targetRole.key}"]`,
    `[role="option"]:has-text("${targetRole.text}")`,
    `li:has-text("${targetRole.text}")`,
  ]

  let selectionSuccess = false
  for (const selector of selectors) {
    try {
      const optionElement = page.locator(selector).first()
      if (await optionElement.isVisible({ timeout: 2000 })) {
        await optionElement.click()
        logger.info(`✅ Successfully selected ${role} using selector: ${selector}`)
        selectionSuccess = true
        break
      }
    } catch {
      logger.warn(`⚠️ Selector ${selector} failed, trying next...`)
    }
  }

  if (!selectionSuccess) {
    throw new Error(`Failed to select ${role} role using any selector`)
  }

  // Wait for the selection to be reflected in the UI
  await page.waitForTimeout(500)

  // Verify the selection was successful by checking the button text
  try {
    await expect(selectTrigger).toContainText(targetRole.text, { timeout: 3000 })
    logger.info(`✅ Verified ${role} selection in UI`)
  } catch {
    logger.warn(`⚠️ Could not verify ${role} selection in UI, but continuing...`)
  }
}

// Helper function for form submission with proper validation
async function submitSignupForm(page: Page): Promise<void> {
  logger.info('📤 Submitting signup form...')

  const submitButton = page.locator('button[type="submit"]').first()
  await expect(submitButton).toBeVisible()
  await expect(submitButton).toBeEnabled()

  await submitButton.click()
  logger.info('✅ Signup form submitted')
}

// Helper function for verifying successful redirect
async function verifyDashboardRedirect(
  page: Page,
  expectedRole: 'runner' | 'coach'
): Promise<void> {
  const expectedPath = `/dashboard/${expectedRole}`
  logger.info(`⏰ Waiting for redirect to ${expectedPath}...`)

  // First, wait for any redirect away from signup page
  await expect(page).not.toHaveURL(/\/auth\/signup/, { timeout: 10000 })
  logger.info(`✅ Redirected away from signup page`)

  // Then wait for the final dashboard redirect (may go through /dashboard first)
  await expect(page).toHaveURL(new RegExp(`dashboard/${expectedRole}`), { timeout: 15000 })
  logger.info(`✅ Successfully redirected to ${expectedRole} dashboard`)

  // Take a screenshot for verification
  await page.screenshot({ path: `successful-${expectedRole}-signup.png` })
}

test.describe('Signup Flow Test', () => {
  test('should signup as coach and assign correct userType', async ({ page }) => {
    // Generate unique email to prevent conflicts
    const timestamp = Date.now()
    const formData: SignupFormData = {
      fullName: 'Test Coach User',
      email: `testcoach${timestamp}@example.com`,
      password: 'TestPassword123!',
      role: 'coach',
    }

    // Navigate to signup page
    await page.goto('/auth/signup')
    // Removed waitForLoadState('networkidle') - causes CI hangs
    await page.waitForSelector('input[type="email"]', { state: 'visible' })

    // Fill form using helper function
    await fillSignupForm(page, formData)

    // Select coach role using proper selectors
    await selectUserRole(page, formData.role)

    // Submit form
    await submitSignupForm(page)

    // Verify successful redirect to coach dashboard
    await verifyDashboardRedirect(page, formData.role)
  })

  test('should signup as runner and assign correct userType', async ({ page }) => {
    // Listen for console messages and network requests
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logger.error(`Browser console error: ${msg.text()}`)
      }
    })

    page.on('response', response => {
      if (response.url().includes('/api/auth/sign-up') && !response.ok()) {
        logger.error(`Signup API error: ${response.status()} ${response.statusText()}`)
      }
    })

    // Generate unique email to prevent conflicts
    const timestamp = Date.now()
    const formData: SignupFormData = {
      fullName: 'Test Runner User',
      email: `testrunner${timestamp}@example.com`,
      password: 'TestPassword123!',
      role: 'runner',
    }

    // Navigate to signup page
    await page.goto('/auth/signup')
    // Removed waitForLoadState('networkidle') - causes CI hangs
    await page.waitForSelector('input[type="email"]', { state: 'visible' })

    // Fill form using helper function
    await fillSignupForm(page, formData)

    // Select runner role using proper selectors
    await selectUserRole(page, formData.role)

    // Add a small delay before submission to ensure role is properly set
    await page.waitForTimeout(1000)

    // Log the form data before submission
    const emailValue = await page.locator('input[type="email"]').inputValue()
    const nameValue = await page.locator('input[type="text"]').inputValue()
    logger.info(`Form data before submission: email=${emailValue}, name=${nameValue}`)

    // Submit form
    await submitSignupForm(page)

    // Verify successful redirect to runner dashboard
    await verifyDashboardRedirect(page, formData.role)
  })
})
