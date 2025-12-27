import { expect, test } from '@playwright/test'

// iPhone 14 Pro viewport
const MOBILE_VIEWPORT = { width: 390, height: 844 }

test.describe('Mobile UI Visual Tests - iPhone 14 Pro', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test('Landing Page - Hero Section', async ({ page }) => {
    await page.goto('http://localhost:3001')

    // Wait for hero section to be visible
    await page.waitForSelector('h1', { timeout: 10000 })

    // Take screenshot of hero section (top of page)
    await page.screenshot({
      path: 'tests/screenshots/mobile-01-landing-hero.png',
      fullPage: false,
    })

    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)

    console.log(`Body scroll width: ${bodyWidth}, Viewport width: ${viewportWidth}`)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1) // Allow 1px tolerance
  })

  test('Landing Page - Features Section', async ({ page }) => {
    await page.goto('http://localhost:3001')

    // Scroll to features section
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForTimeout(500)

    await page.screenshot({
      path: 'tests/screenshots/mobile-02-landing-features.png',
      fullPage: false,
    })
  })

  test('Landing Page - CTA Section', async ({ page }) => {
    await page.goto('http://localhost:3001')

    // Scroll to bottom CTA section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 844))
    await page.waitForTimeout(500)

    await page.screenshot({
      path: 'tests/screenshots/mobile-03-landing-cta.png',
      fullPage: false,
    })
  })

  test('Landing Page - Full Page Screenshot', async ({ page }) => {
    await page.goto('http://localhost:3001')
    await page.waitForSelector('h1', { timeout: 10000 })

    await page.screenshot({
      path: 'tests/screenshots/mobile-04-landing-fullpage.png',
      fullPage: true,
    })
  })

  test('Sign In Page', async ({ page }) => {
    await page.goto('http://localhost:3001/auth/signin')

    // Wait for form to be visible
    await page.waitForSelector('form', { timeout: 10000 })

    await page.screenshot({
      path: 'tests/screenshots/mobile-05-signin-page.png',
      fullPage: false,
    })

    // Check for horizontal overflow on signin page
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)

    console.log(`Signin - Body scroll width: ${bodyWidth}, Viewport width: ${viewportWidth}`)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)
  })

  test('Header and Navigation', async ({ page }) => {
    await page.goto('http://localhost:3001')
    await page.waitForSelector('nav', { timeout: 10000 })

    // Screenshot header in initial state
    await page.screenshot({
      path: 'tests/screenshots/mobile-06-header-closed.png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 390, height: 100 },
    })

    // Try to find and click hamburger menu if it exists
    const menuButton = page.locator(
      '[aria-label="Toggle navigation menu"], button[aria-label*="menu"], [data-testid="navbar-menu-toggle"]'
    )

    if (await menuButton.isVisible()) {
      await menuButton.click()
      await page.waitForTimeout(500)

      await page.screenshot({
        path: 'tests/screenshots/mobile-07-navigation-open.png',
        fullPage: false,
      })
    }
  })

  test('Horizontal Scroll Detection', async ({ page }) => {
    await page.goto('http://localhost:3001')
    await page.waitForSelector('h1', { timeout: 10000 })

    // Detailed horizontal scroll analysis
    const scrollInfo = await page.evaluate(() => {
      const body = document.body
      const html = document.documentElement

      return {
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        htmlScrollWidth: html.scrollWidth,
        htmlClientWidth: html.clientWidth,
        windowInnerWidth: window.innerWidth,
        hasHorizontalScroll:
          body.scrollWidth > window.innerWidth || html.scrollWidth > window.innerWidth,
        overflowX: getComputedStyle(body).overflowX,
        htmlOverflowX: getComputedStyle(html).overflowX,
      }
    })

    console.log('Horizontal scroll analysis:', JSON.stringify(scrollInfo, null, 2))

    // Take screenshot showing the full width
    await page.screenshot({
      path: 'tests/screenshots/mobile-08-scroll-test.png',
      fullPage: true,
    })

    // Assert no horizontal scroll
    expect(scrollInfo.hasHorizontalScroll).toBe(false)
  })

  test('Touch Target Sizes', async ({ page }) => {
    await page.goto('http://localhost:3001')
    await page.waitForSelector('h1', { timeout: 10000 })

    // Check button sizes
    const buttons = await page.locator('button, a[href]').all()
    const touchTargetIssues: string[] = []

    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const button = buttons[i]
      const box = await button.boundingBox()

      if (box) {
        // Check if touch target is at least 44px (WCAG minimum)
        if (box.width < 44 || box.height < 44) {
          const text = await button.textContent()
          touchTargetIssues.push(`Button "${text?.trim()}" is ${box.width}x${box.height}px`)
        }
      }
    }

    if (touchTargetIssues.length > 0) {
      console.log('Touch target size warnings:', touchTargetIssues)
    }

    // Screenshot for reference
    await page.screenshot({
      path: 'tests/screenshots/mobile-09-touch-targets.png',
      fullPage: false,
    })
  })
})
