import { expect, test as setup } from '@playwright/test'
import path from 'path'

import { waitForAuthenticationSuccess } from './utils/suspense-helpers'
import { TEST_COACH_EMAIL, TEST_COACH_PASSWORD } from './utils/test-helpers'
import { getTestLogger } from './utils/test-logger'

// Logger is created inside the test to avoid module-eval ESM issues

// Conditional fs import (typed) to avoid Vercel build issues
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node)
const fs: typeof import('node:fs') | null = isNode ? require('node:fs') : null

const authFile = path.join(__dirname, '../playwright/.auth/coach.json')

setup('authenticate as coach @setup', async ({ page, context }) => {
  const logger = await getTestLogger('tests/auth-coach.setup')
  logger.info('🔐 Starting coach authentication setup with storageState pattern...')

  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001'

  // Navigate to signin page to establish page context
  await page.goto(`${baseUrl}/auth/signin`)
  logger.info('📍 Navigated to signin page')

  await page.waitForLoadState('domcontentloaded')

  // Retry configuration for handling intermittent JSON parsing errors (ULT-54)
  const MAX_AUTH_RETRIES = 3
  const RETRY_DELAY_MS = 1000

  let authResponse: { ok: boolean; status: number; body: string | object } | null = null
  let lastError: Error | null = null

  // Authenticate via API using page.evaluate(() => fetch())
  for (let attempt = 1; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      logger.info(`🔑 Coach authentication attempt ${attempt}/${MAX_AUTH_RETRIES}`)

      const authResult = await page.evaluate(
        async ({ apiUrl, email, password }) => {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ email, password }),
          })
          return {
            ok: response.ok,
            status: response.status,
            body: response.ok ? await response.json() : await response.text(),
          }
        },
        {
          apiUrl: `${baseUrl}/api/auth/sign-in/email`,
          email: TEST_COACH_EMAIL,
          password: TEST_COACH_PASSWORD,
        }
      )

      authResponse = authResult

      if (authResponse.ok) {
        logger.info(`✅ Coach authentication API successful on attempt ${attempt}`)
        break
      }

      // Non-500 errors (like 401) should fail immediately
      if (authResponse.status !== 500) {
        const bodyText =
          typeof authResponse.body === 'string'
            ? authResponse.body
            : JSON.stringify(authResponse.body)
        const preview = bodyText
          .slice(0, 300)
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<redacted-email>')
        logger.error('Coach Auth API failed with non-retryable error', {
          status: authResponse.status,
          bodyPreview: preview,
        })
        throw new Error(
          `Coach authentication failed with status ${authResponse.status} - ${preview}`
        )
      }

      // 500 error - prepare for retry
      const bodyText =
        typeof authResponse.body === 'string'
          ? authResponse.body
          : JSON.stringify(authResponse.body)
      lastError = new Error(
        `Coach Auth API returned 500 on attempt ${attempt}: ${bodyText.slice(0, 100)}`
      )
      logger.warn(`Coach auth attempt ${attempt} failed with 500 error, will retry...`, {
        attempt,
        maxRetries: MAX_AUTH_RETRIES,
      })
    } catch (error) {
      lastError = error as Error
      logger.warn(`Coach auth attempt ${attempt} threw error, will retry...`, {
        error: (error as Error).message,
        attempt,
        maxRetries: MAX_AUTH_RETRIES,
      })
    }

    if (attempt < MAX_AUTH_RETRIES) {
      const delay = RETRY_DELAY_MS * attempt
      logger.info(`⏳ Waiting ${delay}ms before retry...`)
      await page.waitForTimeout(delay)
    }
  }

  if (!authResponse || !authResponse.ok) {
    const finalError = lastError || new Error('Coach authentication failed after all retries')
    logger.error('Coach Auth API failed after all retry attempts', {
      attempts: MAX_AUTH_RETRIES,
      lastError: finalError.message,
    })
    throw new Error(
      `Coach authentication failed after ${MAX_AUTH_RETRIES} attempts: ${finalError.message}`
    )
  }

  // Navigate to dashboard to verify authentication works
  await page.goto(`${baseUrl}/dashboard/coach`)

  // Wait for final URL after all redirects (ensures cookies are working)
  await page.waitForURL(`${baseUrl}/dashboard/coach`, { timeout: 15000 })

  // Wait for successful navigation and dashboard to load
  await waitForAuthenticationSuccess(page, 'coach', 15000)
  logger.info('✅ Successfully verified authentication on coach dashboard')

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

  // Save authenticated browser state - this is the Playwright storageState pattern!
  // All future tests will automatically start with this authenticated state
  await context.storageState({ path: authFile })
  logger.info(`💾 Saved coach authentication storageState to ${authFile}`)
  logger.info('🎉 Tests using this project will automatically start authenticated!')
})
