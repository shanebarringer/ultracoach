import { expect, test } from '@playwright/test'

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

    console.log('🧪 Testing coach signup flow with email:', uniqueEmail)

    // Fill form fields
    await page.fill('input[name="fullName"]', 'Test Coach User')
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', 'TestPassword123!')

    // Select coach role - HeroUI Select component
    await page.click('button:has-text("Choose your path")')
    await page.waitForSelector('[data-key="coach"]', { state: 'visible', timeout: 5000 })
    await page.click('[data-key="coach"]')

    // Verify the selection was applied by checking if dropdown shows "Mountain Guide"
    await page.waitForSelector('button:has-text("Mountain Guide")', { timeout: 5000 })

    // Submit form
    await page.click('button[type="submit"]')

    // In test environment, expect direct redirect to dashboard without onboarding modal
    console.log('✅ Signup submitted, waiting for redirect to dashboard')

    // Should redirect to coach dashboard
    await expect(page).toHaveURL(/dashboard\/coach/, { timeout: 15000 })
    console.log('✅ Successfully redirected to coach dashboard')

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

    console.log('🧪 Testing runner signup flow with email:', uniqueEmail)

    // Fill form fields
    await page.fill('input[name="fullName"]', 'Test Runner User')
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', 'TestPassword123!')

    // Select runner role - HeroUI Select component
    await page.click('button:has-text("Choose your path")')
    await page.waitForSelector('[data-key="runner"]', { state: 'visible', timeout: 5000 })
    await page.click('[data-key="runner"]')

    // Verify the selection was applied by checking if dropdown shows "Trail Runner"
    await page.waitForSelector('button:has-text("Trail Runner")', { timeout: 5000 })

    // Submit form
    await page.click('button[type="submit"]')

    // In test environment, expect direct redirect to dashboard without onboarding modal
    console.log('✅ Signup submitted, waiting for redirect to dashboard')

    // Should redirect to runner dashboard
    await expect(page).toHaveURL(/dashboard\/runner/, { timeout: 15000 })
    console.log('✅ Successfully redirected to runner dashboard')

    // Take screenshot
    await page.screenshot({ path: 'successful-runner-signup.png' })
  })
})
