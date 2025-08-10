#!/usr/bin/env tsx
/**
 * Create Fresh Test User
 * Creates a single test user using current Better Auth setup to verify auth works
 */
import { config } from 'dotenv'
import { resolve } from 'path'

import { auth } from '../src/lib/better-auth'
import { createLogger } from '../src/lib/logger'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('create-fresh-test-user')

async function createFreshTestUser() {
  logger.info('👤 Creating fresh test user with current Better Auth setup...')

  try {
    const ctx = await auth.$context

    const testEmail = 'test-fresh@ultracoach.dev'
    const testPassword = 'TestFresh2025!'

    // Check if user already exists
    const existingUser = await ctx.adapter.findOne({
      model: 'user',
      where: [{ field: 'email', value: testEmail }],
    })

    if (existingUser) {
      logger.info('User already exists, deleting first...')
      // Delete existing account first
      await ctx.adapter.delete({
        model: 'account',
        where: [{ field: 'userId', value: existingUser.id }],
      })
      // Delete existing user
      await ctx.adapter.delete({
        model: 'user',
        where: [{ field: 'id', value: existingUser.id }],
      })
      logger.info('✅ Existing user deleted')
    }

    // Create new user using Better Auth current context
    const newUser = await ctx.adapter.create({
      model: 'user',
      data: {
        name: 'Test Fresh User',
        email: testEmail,
        emailVerified: false,
        role: 'coach',
        fullName: 'Test Fresh User',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    logger.info('✅ User created:', newUser.name)

    // Hash password using current Better Auth setup
    const hashedPassword = await ctx.password.hash(testPassword)
    logger.info('✅ Password hashed, length:', hashedPassword.length)

    // Create account
    const newAccount = await ctx.adapter.create({
      model: 'account',
      data: {
        userId: newUser.id,
        accountId: newUser.id,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    logger.info('✅ Account created with provider:', newAccount.providerId)

    // Test password verification immediately
    logger.info('Testing password verification...')
    try {
      const isValid = await ctx.password.verify(testPassword, hashedPassword)
      if (isValid) {
        logger.info('✅ Password verification successful!')
      } else {
        logger.error('❌ Password verification failed')
      }
    } catch (error) {
      logger.error('❌ Password verification error:', error)
    }

    logger.info('🎉 Fresh test user created successfully!')
    logger.info('Test credentials:')
    logger.info(`Email: ${testEmail}`)
    logger.info(`Password: ${testPassword}`)

  } catch (error) {
    logger.error('❌ Failed to create fresh test user:', error)
    throw error
  }
}

async function main() {
  try {
    await createFreshTestUser()
    logger.info('✅ Fresh test user creation completed')
  } catch (error) {
    logger.error('❌ Failed:', error)
    process.exit(1)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    logger.error('❌ Fatal error:', error)
    process.exit(1)
  })