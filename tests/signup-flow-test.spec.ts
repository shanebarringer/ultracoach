import { expect, test } from '@playwright/test'

test.describe('Signup Flow Test', () => {
  test('should signup as coach and assign correct userType', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup')

    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('input[type="email"]', { state: 'visible' })

    console.log('🧪 Testing coach signup flow')

    // Fill form fields
    await page.fill('input[name="fullName"]', 'Test Coach User')
    await page.fill('input[type="email"]', 'testcoach@example.com')
    await page.fill('input[type="password"]', 'TestPassword123!')

    // Select coach role - HeroUI Select component
    await page.click('button:has-text("Choose your path")')
    await page.waitForSelector('[data-key="coach"]', { state: 'visible' })
    await page.click('[data-key="coach"]')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for either onboarding modal or redirect to dashboard
    try {
      // Check if onboarding modal appears first
      const onboardingModal = page.locator(
        '[data-testid="onboarding-modal"], .modal:has-text("Welcome")'
      )
      await onboardingModal.waitFor({ timeout: 5000, state: 'visible' })
      if (await onboardingModal.isVisible()) {
        console.log('✅ Onboarding modal appeared')

        // Complete onboarding or close it
        const completeButton = page.locator(
          'button:has-text("Complete"), button:has-text("Get Started")'
        )
        const closeButton = page.locator('button[aria-label="Close"], .modal-close')

        if (await completeButton.isVisible()) {
          await completeButton.click()
        } else if (await closeButton.isVisible()) {
          await closeButton.click()
        }
      }
    } catch (e) {
      console.log('⚠️  No onboarding modal, checking for direct redirect')
    }

    // Should redirect to coach dashboard
    await expect(page).toHaveURL(/dashboard\/coach/, { timeout: 15000 })
    console.log('✅ Successfully redirected to coach dashboard')

    // Take screenshot
    await page.screenshot({ path: 'successful-coach-signup.png' })
  })

  test('should signup as runner and assign correct userType', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup')

    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('input[type="email"]', { state: 'visible' })

    console.log('🧪 Testing runner signup flow')

    // Fill form fields
    await page.fill('input[name="fullName"]', 'Test Runner User')
    await page.fill('input[type="email"]', 'testrunner@example.com')
    await page.fill('input[type="password"]', 'TestPassword123!')

    // Select runner role (should be default) - HeroUI Select component
    await page.click('button:has-text("Choose your path")')
    await page.waitForSelector('[data-key="runner"]', { state: 'visible' })
    await page.click('[data-key="runner"]')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for either onboarding modal or redirect to dashboard
    try {
      // Check if onboarding modal appears first
      const onboardingModal = page.locator(
        '[data-testid="onboarding-modal"], .modal:has-text("Welcome")'
      )
      await onboardingModal.waitFor({ timeout: 5000, state: 'visible' })
      if (await onboardingModal.isVisible()) {
        console.log('✅ Onboarding modal appeared')

        // Complete onboarding or close it
        const completeButton = page.locator(
          'button:has-text("Complete"), button:has-text("Get Started")'
        )
        const closeButton = page.locator('button[aria-label="Close"], .modal-close')

        if (await completeButton.isVisible()) {
          await completeButton.click()
        } else if (await closeButton.isVisible()) {
          await closeButton.click()
        }
      }
    } catch (e) {
      console.log('⚠️  No onboarding modal, checking for direct redirect')
    }

    // Should redirect to runner dashboard
    await expect(page).toHaveURL(/dashboard\/runner/, { timeout: 15000 })
    console.log('✅ Successfully redirected to runner dashboard')

    // Take screenshot
    await page.screenshot({ path: 'successful-runner-signup.png' })
  })
})
