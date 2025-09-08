import { expect, test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page, context }) => {
  console.log('🔐 Starting runner authentication setup...')

  const baseUrl = process.env.CI ? 'http://localhost:3001' : 'http://localhost:3001'

  // Navigate to signin page
  await page.goto(`${baseUrl}/auth/signin`)
  console.log('📍 Navigated to signin page')

  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // Use the API directly instead of form submission to avoid JavaScript issues
  const response = await page.request.post(`${baseUrl}/api/auth/sign-in/email`, {
    data: {
      email: 'alex.rivera@ultracoach.dev',
      password: 'RunnerPass2025!',
    },
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok()) {
    console.error('Auth API response status:', response.status())
    console.error('Auth API response:', await response.text())
    throw new Error(`Authentication API failed with status ${response.status()}`)
  }

  console.log('✅ Authentication API successful')

  // The API call should have set cookies, now navigate to dashboard
  await page.goto(`${baseUrl}/dashboard/runner`)
  await page.waitForLoadState('domcontentloaded')

  // Verify we're on the dashboard
  const currentUrl = page.url()
  console.log('🔄 Current URL after auth:', currentUrl)

  if (!currentUrl.includes('/dashboard')) {
    // If redirected to signin, try refreshing to pick up cookies
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    const finalUrl = page.url()
    if (!finalUrl.includes('/dashboard')) {
      throw new Error('Authentication failed - could not access dashboard after API auth')
    }
  }

  console.log('✅ Successfully navigated to dashboard')

  // Save the authentication state
  await context.storageState({ path: authFile })
  console.log(`💾 Saved authentication state to ${authFile}`)
})
