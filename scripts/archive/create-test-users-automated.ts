#!/usr/bin/env tsx
/**
 * Automated Test User Creation Script
 *
 * This script uses Playwright to automate the sign-up process for test users,
 * ensuring they are created with proper Better Auth password hashes.
 */
import { chromium } from '@playwright/test'

import { createLogger } from '../src/lib/logger'

const logger = createLogger('create-test-users-automated')

// Test users to create
const TEST_USERS = [
  {
    email: 'testcoach@ultracoach.dev',
    password: 'TestCoach123!',
    name: 'Test Coach',
    role: 'coach',
  },
  {
    email: 'testrunner@ultracoach.dev',
    password: 'TestRunner123!',
    name: 'Test Runner',
    role: 'runner',
  },
]

async function createTestUsersAutomated() {
  const browser = await chromium.launch({
    headless: true, // Set to false if you want to see the automation
  })

  try {
    logger.info('🤖 Starting automated test user creation...')

    const context = await browser.newContext()
    const page = await context.newPage()

    // Start the dev server first (we'll assume it's running)
    const baseUrl = 'http://localhost:3001'

    for (const testUser of TEST_USERS) {
      try {
        logger.info(`Creating user: ${testUser.email} (${testUser.role})`)

        // Navigate to sign-up page
        await page.goto(`${baseUrl}/auth/signup`)
        await page.waitForLoadState('networkidle')

        // Check if we're already signed in (should redirect)
        const currentUrl = page.url()
        if (currentUrl.includes('/dashboard')) {
          logger.info('Already signed in, signing out first...')
          // Navigate directly to sign out or clear storage
          await page.evaluate(() => localStorage.clear())
          await page.evaluate(() => sessionStorage.clear())
          await page.goto(`${baseUrl}/auth/signup`)
          await page.waitForLoadState('networkidle')
        }

        // Fill out the sign-up form - use HeroUI field IDs
        await page.fill('#fullName', testUser.name)
        await page.fill('#email', testUser.email)
        await page.fill('#password', testUser.password)

        // Select role - HeroUI Select component
        await page.click('button[role="combobox"]')
        await page.click(`li[data-key="${testUser.role}"]`)

        // Submit the form
        await Promise.race([
          page.click('button[type="submit"]'),
          page.waitForTimeout(100), // Small delay to ensure click is registered
        ])

        // Wait for navigation or success
        try {
          await page.waitForURL(/dashboard/, { timeout: 10000 })
          logger.info(`✅ Successfully created user: ${testUser.email}`)

          // Sign out to prepare for next user
          await page.evaluate(() => localStorage.clear())
          await page.evaluate(() => sessionStorage.clear())
        } catch (error) {
          // Check if user already exists
          const pageContent = await page.textContent('body')
          if (pageContent && pageContent.includes('already exists')) {
            logger.info(`User ${testUser.email} already exists, continuing...`)
          } else {
            logger.error(`Failed to create user ${testUser.email}:`, error)
            // Take screenshot for debugging
            await page.screenshot({
              path: `test-user-creation-error-${testUser.email.replace('@', '-at-').replace('.', '-')}.png`,
            })
          }
        }

        // Small delay between users
        await page.waitForTimeout(1000)
      } catch (error) {
        logger.error(`❌ Failed to create user ${testUser.email}:`, error)
      }
    }

    logger.info('🎉 Automated test user creation completed!')
  } catch (error) {
    logger.error('💥 Automated test user creation failed:', error)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

// Only run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  createTestUsersAutomated()
    .then(() => {
      logger.info('✨ Automated test user creation script completed')
      process.exit(0)
    })
    .catch(error => {
      logger.error('💥 Automated test user creation script failed:', error)
      process.exit(1)
    })
}

export { createTestUsersAutomated }
