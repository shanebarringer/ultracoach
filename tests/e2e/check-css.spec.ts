import { expect, test } from '@playwright/test'

test.describe('CSS Loading Check', () => {
  test('should have CSS loaded on signin page', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/signin')

    // Wait for basic page load
    await page.waitForLoadState('domcontentloaded')

    // Check if CSS is loaded by verifying computed styles
    const h1Element = page.locator('h1').first()

    // Wait for h1 to be visible
    await h1Element.waitFor({ state: 'visible', timeout: 10000 })

    // Get computed styles
    const fontSize = await h1Element.evaluate(el => {
      return window.getComputedStyle(el).fontSize
    })

    const color = await h1Element.evaluate(el => {
      return window.getComputedStyle(el).color
    })

    // Log the values for debugging
    console.log('Font size:', fontSize)
    console.log('Color:', color)

    // Check that styles are applied (not default browser styles)
    expect(fontSize).not.toBe('16px') // Default browser font size
    expect(color).not.toBe('rgb(0, 0, 0)') // Default black color

    // Check if Tailwind classes are working
    const button = page.locator('button[type="submit"]').first()
    await button.waitFor({ state: 'visible', timeout: 10000 })

    const buttonBg = await button.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor
    })

    console.log('Button background:', buttonBg)

    // Button should have some background color (not transparent)
    expect(buttonBg).not.toBe('rgba(0, 0, 0, 0)')
    expect(buttonBg).not.toBe('transparent')
  })
})
