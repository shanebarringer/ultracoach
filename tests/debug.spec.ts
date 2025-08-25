import { expect, test } from '@playwright/test'

test.describe('Debug Tests', () => {
  test('should debug landing page content', async ({ page }) => {
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-landing.png' })

    // Log page content to understand what's being rendered
    const content = await page.content()
    console.log('Landing page content length:', content.length)

    // Check if we can find any h1 elements
    const h1s = await page.locator('h1').all()
    console.log('Number of h1 elements:', h1s.length)

    for (let i = 0; i < h1s.length; i++) {
      const text = await h1s[i].textContent()
      console.log(`H1 ${i}: "${text}"`)
    }
  })

  test('should debug signin page', async ({ page }) => {
    await page.goto('/auth/signin')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-signin.png' })

    // Check if form elements are present
    const emailInput = await page.locator('input[type="email"]').count()
    const passwordInput = await page.locator('input[type="password"]').count()
    const submitButton = await page.locator('button[type="submit"]').count()

    console.log('Email inputs:', emailInput)
    console.log('Password inputs:', passwordInput)
    console.log('Submit buttons:', submitButton)

    // Check h1 content
    const h1Text = await page.locator('h1').textContent()
    console.log('H1 text:', h1Text)
  })

  test('should debug authentication attempt', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')

    // Try to login with correct test user
    await page.fill('input[type="email"]', 'alex.rivera@ultracoach.dev')
    await page.fill('input[type="password"]', 'RunnerPass2025!')

    // Listen for any navigation
    const responsePromise = page.waitForResponse(response => response.url().includes('/api/auth'), {
      timeout: 10000,
    })

    await page.click('button[type="submit"]')

    try {
      const response = await responsePromise
      console.log('Auth response status:', response.status())
      console.log('Auth response URL:', response.url())
    } catch (error) {
      console.log('No auth response captured:', (error as Error).message)
    }

    // Wait a bit to see if navigation happens
    await page.waitForTimeout(3000)

    // Check current URL
    console.log('Current URL after login attempt:', page.url())

    // Take screenshot
    await page.screenshot({ path: 'debug-after-login.png' })
  })
})
