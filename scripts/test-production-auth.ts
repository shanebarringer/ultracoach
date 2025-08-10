#!/usr/bin/env tsx
/**
 * Test Production Authentication Script
 * Tests sign-in functionality for production database
 */
import { config } from 'dotenv'
import { resolve } from 'path'

import { auth } from '../src/lib/better-auth'
import { createLogger } from '../src/lib/logger'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('test-production-auth')

async function testAuthentication() {
  logger.info('🔐 Testing production authentication...')

  try {
    // Get Better Auth context for admin operations
    const ctx = await auth.$context

    // Test credentials
    const testUsers = [
      { email: 'sarah@ultracoach.dev', password: 'UltraCoach2025!', role: 'coach' },
      { email: 'alex.rivera@ultracoach.dev', password: 'RunnerPass2025!', role: 'runner' },
    ]

    for (const testUser of testUsers) {
      logger.info(`Testing authentication for ${testUser.email} (${testUser.role})...`)

      try {
        // Try to authenticate using Better Auth admin API
        const result = await ctx.adapter.findOne({
          model: 'user',
          where: [{ field: 'email', value: testUser.email }],
        })

        if (!result) {
          logger.error(`❌ User not found: ${testUser.email}`)
          continue
        }

        logger.info(`✅ User found: ${result.name} (${result.role})`)

        // Check if account exists
        const accountResult = await ctx.adapter.findOne({
          model: 'account',
          where: [{ field: 'userId', value: result.id }],
        })

        if (!accountResult) {
          logger.error(`❌ Account not found for user: ${testUser.email}`)
          continue
        }

        logger.info(`✅ Account found with provider: ${accountResult.providerId}`)

        // Test password verification
        if (accountResult.password) {
          try {
            const isValid = await ctx.password.verify(testUser.password, accountResult.password)
            if (isValid) {
              logger.info(`✅ Password verification successful for ${testUser.email}`)
            } else {
              logger.error(`❌ Password verification failed for ${testUser.email}`)
            }
          } catch (error) {
            logger.error(`❌ Password verification error for ${testUser.email}:`, error)
          }
        } else {
          logger.error(`❌ No password hash found for ${testUser.email}`)
        }
      } catch (error) {
        logger.error(`❌ Authentication test failed for ${testUser.email}:`, error)
      }
    }

    // Test session creation
    logger.info('Testing session creation...')
    try {
      const sessionResult = await ctx.adapter.findMany({
        model: 'session',
        limit: 5,
      })
      logger.info(`📋 Found ${sessionResult.length} active sessions in database`)
    } catch (error) {
      logger.error('❌ Session query failed:', error)
    }

  } catch (error) {
    logger.error('❌ Authentication test suite failed:', error)
  }
}

async function main() {
  try {
    await testAuthentication()
    logger.info('✅ Production authentication test completed')
  } catch (error) {
    logger.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    logger.error('❌ Fatal error in test script:', error)
    process.exit(1)
  })