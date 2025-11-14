import { FullConfig, chromium } from '@playwright/test'

/**
 * Global Setup for Playwright Tests
 *
 * This setup runs BEFORE any tests execute and ensures the dev server
 * is fully ready to handle requests. This prevents race conditions where
 * tests start before the server has completed initialization.
 *
 * Why this is needed:
 * - Playwright's webServer config starts the server but may not wait for full readiness
 * - Tests can fail with timeout errors if they start too early
 * - Database operations (user creation, relationship verification) need a responsive server
 *
 * Based on official Playwright best practices:
 * https://playwright.dev/docs/test-global-setup-teardown
 */
async function globalSetup(config: FullConfig) {
  // Get base URL from first project's config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3001'

  console.log('🔍 Global Setup: Waiting for server to be ready...')
  console.log(`   Server URL: ${baseURL}`)

  const browser = await chromium.launch()
  const page = await browser.newPage()

  const maxRetries = 30 // 30 attempts
  const retryDelay = 2000 // 2 seconds between attempts (total: 60s max wait)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try to fetch the home page to verify server is responding
      const response = await page.goto(baseURL, {
        timeout: 5000,
        waitUntil: 'domcontentloaded',
      })

      if (response && response.ok()) {
        console.log(`✅ Server is ready! (attempt ${attempt}/${maxRetries})`)
        await browser.close()
        return
      }

      // Non-OK response (404, 500, etc.) - treat as retry-able condition
      console.log(`⚠️  Server returned ${response?.status()} (attempt ${attempt}/${maxRetries})`)

      if (attempt === maxRetries) {
        console.error('❌ Server failed to become ready after 60 seconds')
        console.error(`   Last status: ${response?.status()}`)
        await browser.close()
        throw new Error(
          `Server at ${baseURL} not ready after ${maxRetries} attempts (${(maxRetries * retryDelay) / 1000}s total)`
        )
      }

      // Wait before next attempt (same as catch block)
      console.log(`⏳ Retrying... (attempt ${attempt}/${maxRetries})`)
      await page.waitForTimeout(retryDelay)
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('❌ Server failed to become ready after 60 seconds')
        console.error(`   Last error: ${error.message}`)
        await browser.close()
        throw new Error(
          `Server at ${baseURL} not ready after ${maxRetries} attempts (${(maxRetries * retryDelay) / 1000}s total)`
        )
      }

      console.log(`⏳ Waiting for server... (attempt ${attempt}/${maxRetries})`)
      await page.waitForTimeout(retryDelay)
    }
  }

  await browser.close()
}

export default globalSetup
