import { expect, test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/coach.json')

setup('authenticate as coach', async ({ page, context }) => {
  console.log('🔐 Starting coach authentication setup...')

  // Clear any existing cookies to start fresh
  await context.clearCookies()
  console.log('🧹 Cleared existing cookies')

  // Use UI login for reliability
  const baseUrl = process.env.CI ? 'http://localhost:3001' : ''
  await page.goto(`${baseUrl}/auth/signin`)
  console.log(`📍 Navigated to signin page at ${page.url()}`)

  // Wait for form elements
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 30000 })
  await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 30000 })

  // Fill credentials
  await page.fill('input[type="email"]', 'emma@ultracoach.dev')
  await page.fill('input[type="password"]', 'UltraCoach2025!')
  console.log('✅ Filled coach credentials')

  // Submit form
  await page.click('button[type="submit"]')
  console.log('📤 Submitted login form')

  // Wait for navigation after form submission
  await page.waitForURL(
    url => {
      const path = new URL(url).pathname
      console.log(`🔄 Current path after login: ${path}`)
      return path.includes('/dashboard') || path === '/'
    },
    { timeout: 60000 }
  )

  // Verify we're not still on signin page (login failed)
  const currentUrl = page.url()
  if (currentUrl.includes('/auth/signin')) {
    console.error('❌ Login failed - still on signin page')

    // Check for error messages
    const errorElement = page.locator('[role="alert"], .text-danger, .text-red-500')
    const errorText = await errorElement.textContent().catch(() => null)
    if (errorText) {
      console.error(`   Error message: ${errorText}`)
    }

    throw new Error('Coach login failed - authentication unsuccessful')
  }

  // Navigate to coach dashboard if not there
  if (!page.url().includes('/dashboard/coach')) {
    console.log('🚀 Navigating to coach dashboard...')
    await page.goto('/dashboard/coach')
    await page.waitForURL(/\/dashboard\/coach/, { timeout: 30000 })
  }

  // Wait for dashboard content - be flexible with selectors
  const dashboardIndicators = [
    page.locator('text=Summit Dashboard'),
    page.locator('h1:has-text("Summit Dashboard")'),
    page.locator('[data-testid="coach-dashboard"]'),
    page.locator('text=Your Athletes'),
  ]

  // Wait for at least one dashboard indicator
  let dashboardLoaded = false
  for (const indicator of dashboardIndicators) {
    try {
      await indicator.waitFor({ state: 'visible', timeout: 5000 })
      dashboardLoaded = true
      console.log('✅ Coach dashboard loaded successfully')
      break
    } catch {
      // Try next indicator
    }
  }

  if (!dashboardLoaded) {
    console.error('❌ Coach dashboard did not load properly')
    throw new Error('Coach dashboard did not load properly')
  }

  // Verify we're on coach dashboard
  await expect(page).toHaveURL(/\/dashboard\/coach/)

  // Wait a moment to ensure all cookies are set
  await page.waitForTimeout(1000)

  // Save authenticated state to file
  await page.context().storageState({ path: authFile })
  console.log(`💾 Saved coach auth state to ${authFile}`)

  // Verify the storage state was saved
  const cookies = await page.context().cookies()
  console.log(`🍪 Saved ${cookies.length} cookies`)

  // Log specific auth cookies
  const authCookies = cookies.filter(
    c =>
      c.name.includes('auth') ||
      c.name.includes('session') ||
      c.name === 'better-auth.session_token'
  )

  if (authCookies.length > 0) {
    console.log('✅ Auth cookies saved:')
    authCookies.forEach(c => {
      console.log(`   - ${c.name}: ${c.value ? 'present' : 'missing'}`)
    })
  } else {
    console.error('❌ No auth cookies found - authentication may have failed!')
    throw new Error('Authentication failed - no auth cookies found')
  }

  // Verify storage state file was created
  const fs = require('fs')
  if (fs.existsSync(authFile)) {
    const stat = fs.statSync(authFile)
    console.log(`✅ Auth file created: ${authFile} (${stat.size} bytes)`)
  } else {
    console.error(`❌ Auth file not created: ${authFile}`)
    throw new Error('Failed to save auth storage state')
  }
})
