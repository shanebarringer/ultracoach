import { expect, test as setup } from '@playwright/test'
import path from 'path'

import { TEST_RUNNER_EMAIL, TEST_RUNNER_PASSWORD } from './utils/test-helpers'

const authFile = path.join(__dirname, '../playwright/.auth/runner.json')

setup('authenticate', async ({ page, context }) => {
  console.log('🔐 Starting runner authentication setup...')
  console.log(`📁 Auth file path: ${authFile}`)

  // Use consistent base URL across all environments
  const baseUrl =
    process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3001'
  console.log(`🌐 Using base URL: ${baseUrl}`)

  // Navigate to signin page first
  await page.goto(`${baseUrl}/auth/signin`)
  console.log('📍 Navigated to signin page')

  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // Use API authentication for reliability (as recommended in Playwright docs)
  console.log('🔑 Attempting API authentication...')
  const response = await page.request.post(`${baseUrl}/api/auth/sign-in/email`, {
    data: {
      email: TEST_RUNNER_EMAIL,
      password: TEST_RUNNER_PASSWORD,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok()) {
    const body = await response.text()
    console.error('Auth API failed', {
      status: response.status(),
      bodyPreview: body.slice(0, 300).replace(TEST_RUNNER_EMAIL, '<redacted-email>'),
    })
    throw new Error(`Authentication API failed with status ${response.status()}`)
  }

  console.log('✅ Authentication API successful')

  // Navigate to dashboard and wait for all redirects to complete
  await page.goto(`${baseUrl}/dashboard/runner`)

  // Wait for the final URL after any redirects (critical for proper auth)
  await page.waitForURL(`${baseUrl}/dashboard/runner`)
  console.log('🔄 Redirects completed, on dashboard URL')

  // Wait for specific element that proves we're authenticated (Playwright best practice)
  await expect(page.getByTestId('runner-dashboard-content')).toBeVisible({ timeout: 30000 })
  console.log('✅ Dashboard content visible - authentication confirmed')

  // Capture session storage if the app uses it (Better Auth might store session tokens here)
  const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage))
  if (sessionStorage && sessionStorage !== '{}') {
    console.log('📦 Session storage captured for restoration')
  }

  // Save storage state (includes cookies and localStorage automatically)
  await context.storageState({ path: authFile })
  console.log(`💾 Saved authentication state to ${authFile}`)

  // Verify the storage state file was created and contains cookies
  try {
    const fs = require('fs')
    const storageStateContent = fs.readFileSync(authFile, 'utf-8')
    const storageState = JSON.parse(storageStateContent)
    console.log(`✅ Storage state file created with ${storageState.cookies?.length || 0} cookies`)

    if (storageState.cookies?.length > 0) {
      const authCookies = storageState.cookies.filter(
        cookie =>
          cookie.name.includes('better-auth') ||
          cookie.name.includes('session') ||
          cookie.name.includes('auth')
      )
      console.log(`🍪 Found ${authCookies.length} auth-related cookies`)
    } else {
      console.warn('⚠️ No cookies found in storage state!')
    }
  } catch (error) {
    console.error('❌ Failed to verify storage state file', error)
  }

  // Final verification using a new context (Playwright best practice)
  const verifyContext = await context.browser().newContext({
    storageState: authFile,
  })
  const verifyPage = await verifyContext.newPage()

  await verifyPage.goto(`${baseUrl}/dashboard/runner`)

  // Wait for final URL (ensuring no redirect to signin)
  await verifyPage.waitForURL(`${baseUrl}/dashboard/runner`)

  // Verify dashboard content is accessible
  await expect(verifyPage.getByTestId('runner-dashboard-content')).toBeVisible({ timeout: 15000 })

  const verifyUrl = verifyPage.url()
  const isAuthenticated = !verifyUrl.includes('/auth/signin')
  console.log(`🔐 Authentication verification: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`)

  if (!isAuthenticated) {
    console.error('❌ Storage state verification failed!')
    throw new Error('Authentication verification failed - storage state may not be working')
  }

  // Clean up verification resources
  await verifyPage.close()
  await verifyContext.close()

  console.log('✅ Runner authentication setup complete and verified!')
})
