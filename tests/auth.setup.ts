import { expect, test as setup } from '@playwright/test'
import path from 'path'

import { waitForAuthenticationSuccess } from './utils/suspense-helpers'
import { TEST_RUNNER_EMAIL, TEST_RUNNER_PASSWORD } from './utils/test-helpers'
import { getTestLogger } from './utils/test-logger'

// Logger is created inside the test to avoid module-eval ESM issues

// Conditional fs import (typed) to avoid Vercel build issues
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node)
const fs: typeof import('node:fs') | null = isNode ? require('node:fs') : null

const authFile = path.join(__dirname, '../playwright/.auth/runner.json')

setup('authenticate @setup', async ({ page, context }) => {
  const logger = await getTestLogger('tests/auth.setup')
  logger.info('🔐 Starting runner authentication setup...')

  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001'

  // Navigate to signin page
  await page.goto(`${baseUrl}/auth/signin`)
  logger.info('📍 Navigated to signin page')

  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // Retry configuration for handling intermittent JSON parsing errors (ULT-54)
  const MAX_AUTH_RETRIES = 3
  const BASE_RETRY_DELAY = 1000 // 1 second base delay

  let authResponse
  let lastError: Error | null = null

  // Implement retry logic with exponential backoff for intermittent auth failures
  // CRITICAL: Use page.evaluate to run fetch in browser context where cookies are guaranteed available
  for (let attempt = 1; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      logger.info(`🔑 Authentication attempt ${attempt}/${MAX_AUTH_RETRIES}`)

      // Navigate to page first to establish browser context
      await page.goto(`${baseUrl}/auth/signin`)

      // Run authentication in browser context to ensure cookies attach properly
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
          email: TEST_RUNNER_EMAIL,
          password: TEST_RUNNER_PASSWORD,
        }
      )

      // Success case - break out of retry loop
      if (authResult.ok) {
        logger.info(`✅ Authentication API successful on attempt ${attempt}`)
        authResponse = authResult as { ok: true; status: number; body: unknown }
        break
      }

      // Non-500 errors (like 401 Unauthorized) should fail immediately - no retry
      if (authResult.status !== 500) {
        const bodyText =
          typeof authResult.body === 'string' ? authResult.body : JSON.stringify(authResult.body)
        const preview = bodyText
          .slice(0, 300)
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<redacted-email>')
        logger.error('Auth API failed with non-retryable error', {
          status: authResult.status,
          bodyPreview: preview,
        })
        throw new Error(`Authentication failed with status ${authResult.status} - ${preview}`)
      }

      // 500 error - log and prepare for retry
      const bodyText =
        typeof authResult.body === 'string' ? authResult.body : JSON.stringify(authResult.body)
      lastError = new Error(
        `Auth API returned 500 on attempt ${attempt}: ${bodyText.slice(0, 100)}`
      )
      logger.warn(`Auth attempt ${attempt} failed with 500 error, will retry...`, {
        attempt,
        maxRetries: MAX_AUTH_RETRIES,
      })
    } catch (error) {
      // Network or other errors
      lastError = error as Error
      logger.warn(`Auth attempt ${attempt} threw error, will retry...`, {
        error: (error as Error).message,
        attempt,
        maxRetries: MAX_AUTH_RETRIES,
      })
    }

    // If this wasn't the last attempt, wait with exponential backoff
    if (attempt < MAX_AUTH_RETRIES) {
      const delay = BASE_RETRY_DELAY * attempt // Linear backoff: 1s, 2s, 3s
      logger.info(`⏳ Waiting ${delay}ms before retry...`)
      await page.waitForTimeout(delay)
    }
  }

  // Check if we exhausted all retries without success
  if (!authResponse || !authResponse.ok) {
    const finalError = lastError || new Error('Authentication failed after all retries')
    logger.error('Auth API failed after all retry attempts', {
      attempts: MAX_AUTH_RETRIES,
      lastError: finalError.message,
    })
    throw new Error(
      `Authentication failed after ${MAX_AUTH_RETRIES} attempts: ${finalError.message}`
    )
  }

  // The API call should have set cookies, now navigate to dashboard and verify
  await page.goto(`${baseUrl}/dashboard/runner`)
  await waitForAuthenticationSuccess(page, 'runner', 15000)

  logger.info('✅ Successfully navigated to dashboard')

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
})
