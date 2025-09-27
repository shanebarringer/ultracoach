import { expect, test as setup } from '@playwright/test'
import path from 'path'
import { Logger } from 'tslog'

import { TEST_RUNNER_EMAIL, TEST_RUNNER_PASSWORD } from './utils/test-helpers'

async function waitForHealthyServer(baseUrl: string, page: import('@playwright/test').Page) {
  const endpoints = ['/', '/api/health', '/api/health/database']
  const start = Date.now()
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      // Use APIRequestContext to avoid page navigation side-effects
      const results = await Promise.all(
        endpoints.map(ep => page.request.get(baseUrl.replace(/\/$/, '') + ep))
      )
      const ok = results.every(r => r.ok())
      if (ok) return { ok: true, ms: Date.now() - start }
    } catch {}
    await new Promise(r => setTimeout(r, 250))
  }
  return { ok: false, ms: Date.now() - start }
}

// Conditional fs import (typed) to avoid Vercel build issues
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node)
const fs: typeof import('node:fs') | null = isNode ? require('node:fs') : null

const logger = new Logger({ name: 'tests/auth.setup' })

const authFile = path.join(__dirname, '../playwright/.auth/runner.json')

setup('authenticate', async ({ page, context }) => {
  logger.info('🔐 Starting runner authentication setup...')
  logger.info(`📁 Auth file path: ${authFile}`)

  // Use consistent base URL across all environments
  const baseUrl =
    process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3001'
  logger.info(`🌐 Using base URL: ${baseUrl}`)

  // Health check before auth to avoid slow failures
  const hc = await waitForHealthyServer(baseUrl, page)
  if (!hc.ok) {
    logger.warn('⚠️ Health check did not pass within timeout; continuing anyway', {
      durationMs: hc.ms,
    })
  } else {
    logger.info('✅ Server health checks passed', { durationMs: hc.ms })
  }

  // Navigate to signin page (ensures same-origin cookies)
  await page.goto(`${baseUrl}/auth/signin`)
  logger.info('📍 Navigated to signin page')

  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // Use the API directly instead of form submission to avoid JavaScript/hydration delays
  const t0 = Date.now()
  const response = await page.request.post(`${baseUrl}/api/auth/sign-in/email`, {
    data: {
      email: TEST_RUNNER_EMAIL,
      password: TEST_RUNNER_PASSWORD,
    },
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl, // Add origin header for proper cookie setting
      Referer: `${baseUrl}/auth/signin`, // Add referer for cookie domain
    },
  })

  if (!response.ok()) {
    const body = await response.text()
    logger.error('Auth API failed', {
      status: response.status(),
      bodyPreview: body.slice(0, 300).replace(TEST_RUNNER_EMAIL, '<redacted-email>'),
    })
    throw new Error(`Authentication API failed with status ${response.status()}`)
  }

  const authMs = Date.now() - t0
  logger.info('✅ Authentication API successful', { durationMs: authMs })

  // Check if cookies were set
  const cookies = await context.cookies()
  logger.info(`🍪 Cookies after auth: ${cookies.length} cookies set`)
  if (cookies.length > 0) {
    logger.info(`🍪 First cookie: ${cookies[0].name} for domain ${cookies[0].domain}`)
  }

  // The API call should have set cookies, now navigate to dashboard
  await page.goto(`${baseUrl}/dashboard/runner`)
  await page.waitForLoadState('domcontentloaded')

  // Verify we're on the dashboard
  const currentUrl = page.url()
  logger.info('🔄 Current URL after auth:', currentUrl)

  if (!currentUrl.includes('/dashboard')) {
    // If redirected to signin, try refreshing to pick up cookies
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    const finalUrl = page.url()
    if (!finalUrl.includes('/dashboard')) {
      throw new Error('Authentication failed - could not access dashboard after API auth')
    }
  }

  const totalMs = Date.now() - t0
  logger.info('✅ Successfully navigated to dashboard', { totalAuthFlowMs: totalMs })

  // Ensure the directory exists before saving authentication state
  const authDir = path.dirname(authFile)
  if (fs) {
    fs.mkdirSync(authDir, { recursive: true })
    logger.info(`📁 Created auth directory: ${authDir}`)
  } else {
    logger.warn(
      'FS not available; skipping auth directory creation. Storage write may fail if parent dir is missing.'
    )
  }

  // Save the authentication state
  await context.storageState({ path: authFile })
  logger.info(`💾 Saved runner authentication state to ${authFile}`)

  // Verify the storage state file was created and contains cookies
  if (fs) {
    try {
      const storageStateContent = fs.readFileSync(authFile, 'utf-8')
      const storageState = JSON.parse(storageStateContent)
      logger.info(`✅ Storage state file created with ${storageState.cookies?.length || 0} cookies`)

      if (storageState.cookies?.length > 0) {
        const firstCookie = storageState.cookies[0]
        logger.info(`🍪 Storage state cookie: ${firstCookie.name} for ${firstCookie.domain}`)
      } else {
        logger.warn('⚠️ Storage state has no cookies!')
      }
    } catch (error) {
      logger.error('❌ Failed to verify storage state file', error)
    }
  }

  // Verify authentication actually works by creating a brand-new context with the storage state
  const verifyContext = await context.browser().newContext({
    storageState: runnerStoragePath,
  })
  const verifyPage = await verifyContext.newPage()
  await verifyPage.goto(`${baseUrl}/dashboard/runner`)
  const verifyUrl = verifyPage.url()
  const isAuthenticated = !verifyUrl.includes('/auth/signin')
  logger.info(`🔐 Authentication verification: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`)
  logger.info(`📍 Verification URL: ${verifyUrl}`)

  if (!isAuthenticated) {
    logger.error('❌ Storage state was saved but authentication verification failed!')
    throw new Error('Authentication verification failed - storage state may not be working')
  }

  // Clean up verification resources
  await verifyPage.close()
  await verifyContext.close()

  logger.info('✅ Runner authentication setup complete and verified!')
})
