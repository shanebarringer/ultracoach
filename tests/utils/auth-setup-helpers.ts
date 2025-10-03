import type { BrowserContext, Page } from '@playwright/test'
import path from 'path'

import { getTestLogger } from './test-logger'

// Conditional fs import (typed) to avoid Vercel build issues
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node)
const fs: typeof import('node:fs') | null = isNode ? require('node:fs') : null

export interface AuthSetupConfig {
  role: 'runner' | 'coach'
  email: string
  password: string
  authFile: string
  dashboardPath: string
}

/**
 * Shared authentication setup logic for Playwright tests
 * Handles API authentication, cookie verification, storage state saving, and validation
 */
export async function setupAuthentication(
  page: Page,
  context: BrowserContext,
  config: AuthSetupConfig
): Promise<void> {
  const { role, email, password, authFile, dashboardPath } = config
  const logger = await getTestLogger(`tests/auth-${role}.setup`)

  logger.info(`🔐 Starting ${role} authentication setup...`)

  // Use consistent base URL across all environments
  const baseUrl =
    process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3001'
  logger.info(`🌐 Using base URL: ${baseUrl}`)

  // CRITICAL: Retry mechanism for CI where Better Auth initialization may take longer
  logger.info(`🔑 Attempting ${role} API authentication...`)

  let response
  let lastError
  const maxRetries = 3
  const timeouts = [30000, 45000, 60000] // Increasing timeouts: 30s, 45s, 60s
  const delays = [5000, 10000, 15000] // Delays between retries: 5s, 10s, 15s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(
          `⏳ Waiting ${delays[attempt - 1]}ms before retry ${attempt + 1}/${maxRetries}...`
        )
        await page.waitForTimeout(delays[attempt - 1])
      }

      logger.info(
        `🔐 ${role} auth attempt ${attempt + 1}/${maxRetries} (timeout: ${timeouts[attempt]}ms)`
      )
      response = await page.request.post(`${baseUrl}/api/auth/sign-in/email`, {
        data: {
          email,
          password,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: timeouts[attempt],
      })

      if (response.ok()) {
        logger.info(`✅ ${role} authentication API successful on attempt ${attempt + 1}`)
        break
      }

      // Non-timeout failure (wrong credentials, etc.)
      const body = await response.text()
      const preview = body
        .slice(0, 300)
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<redacted-email>')
      lastError = new Error(`${role} authentication API failed with status ${response.status()}`)
      logger.error(`${role} auth API failed on attempt ${attempt + 1}`, {
        status: response.status(),
        bodyPreview: preview,
      })

      // Don't retry on non-timeout errors (4xx, 5xx)
      if (response.status() !== 0) {
        throw lastError
      }
    } catch (error) {
      lastError = error
      logger.error(`${role} auth attempt ${attempt + 1} failed:`, error)

      if (attempt === maxRetries - 1) {
        throw new Error(
          `${role} authentication failed after ${maxRetries} attempts: ${lastError.message}`
        )
      }
    }
  }

  if (!response || !response.ok()) {
    throw new Error(`${role} authentication API failed after all retries`)
  }

  // CRITICAL FIX: Explicitly wait a moment for cookies to propagate
  // In CI environments, there can be timing issues between API auth and page context
  await page.waitForTimeout(1000)

  // The API call should have set cookies, now navigate to dashboard and verify
  // Use domcontentloaded for faster load and increased timeout for CI
  await page.goto(`${baseUrl}${dashboardPath}`, {
    timeout: 60000,
    waitUntil: 'domcontentloaded',
  })

  // Import waitForAuthenticationSuccess dynamically to avoid circular dependencies
  const { waitForAuthenticationSuccess } = await import('./suspense-helpers')
  await waitForAuthenticationSuccess(page, role, 15000)

  // CRITICAL: Verify cookies are actually set before saving storage state
  const cookies = await context.cookies()
  logger.info(`🍪 Current context has ${cookies.length} total cookies`)

  const sessionCookie = cookies.find(c => c.name === 'better-auth.session_token')
  if (!sessionCookie) {
    logger.error('❌ CRITICAL: better-auth.session_token cookie not found!')
    logger.error(`Available cookies: ${cookies.map(c => c.name).join(', ')}`)
    throw new Error(`${role} authentication failed - session cookie not set after successful login`)
  }

  logger.info(`✅ Found valid session cookie: ${sessionCookie.name}`)
  logger.info(`   Expires: ${new Date(sessionCookie.expires * 1000).toISOString()}`)
  logger.info(`   Domain: ${sessionCookie.domain}, Path: ${sessionCookie.path}`)

  // Save storage state (includes cookies and localStorage automatically)
  // Ensure parent directory exists before saving
  if (fs) {
    fs.mkdirSync(path.dirname(authFile), { recursive: true })
  }
  await context.storageState({ path: authFile })
  logger.info(`💾 Saved ${role} authentication state to ${authFile}`)

  // Verify the storage state file was created and contains cookies
  try {
    if (fs) {
      const storageStateContent = fs.readFileSync(authFile, 'utf-8')
      const storageState = JSON.parse(storageStateContent)
      logger.info(
        `✅ ${role} storage state file created with ${storageState.cookies?.length || 0} cookies`
      )

      if (storageState.cookies?.length > 0) {
        const authCookies = storageState.cookies.filter(
          cookie =>
            cookie.name.includes('better-auth') ||
            cookie.name.includes('session') ||
            cookie.name.includes('auth')
        )
        logger.info(`🍪 Found ${authCookies.length} auth-related cookies for ${role}`)
      } else {
        logger.warn(`⚠️ No cookies found in ${role} storage state!`)
      }
    }
  } catch (error) {
    logger.error(`❌ Failed to verify ${role} storage state file`, error)
  }

  // Final verification using a new context (Playwright best practice)
  const browser = context.browser()
  if (!browser) {
    throw new Error(`Browser instance unavailable for ${role} verification`)
  }
  const verifyContext = await browser.newContext({
    storageState: authFile,
  })
  const verifyPage = await verifyContext.newPage()

  logger.info(`🔍 Verifying ${role} storage state with new context...`)

  try {
    // Navigate and verify we stay on the dashboard (no redirect to signin)
    // Use increased timeout for CI environments where Next.js compilation can be slow
    await verifyPage.goto(`${baseUrl}${dashboardPath}`, {
      timeout: 30000, // CI can be slow on first load
      waitUntil: 'domcontentloaded',
    })

    // Wait for URL to settle (if auth fails, we get redirected to signin)
    // Increased timeout to handle CI environment delays
    const dashboardPattern = new RegExp(`\\/(${dashboardPath}|auth\\/signin)`.replace(/\//g, '\\/'))
    await verifyPage.waitForURL(dashboardPattern, { timeout: 30000 })

    const finalUrl = verifyPage.url()
    const isAuthenticated = finalUrl.includes(dashboardPath) && !finalUrl.includes('/auth/signin')

    logger.info(`🔐 ${role} authentication verification: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`)
    logger.info(`   Final URL: ${finalUrl}`)

    if (!isAuthenticated) {
      logger.error(`❌ ${role} storage state verification failed - redirected to signin page!`)
      throw new Error(
        `${role} authentication verification failed - storage state may not be working`
      )
    }
  } finally {
    await verifyPage.close()
    await verifyContext.close()
  }

  logger.info(`✅ ${role} authentication setup complete and verified!`)
}
