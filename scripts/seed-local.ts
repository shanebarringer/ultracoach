#!/usr/bin/env tsx
/**
 * Local Database Seeding Script
 *
 * ⚠️ DEPRECATED: This script uses deprecated password hashing that causes authentication failures!
 * 
 * USE INSTEAD: pnpm tsx scripts/seed-local-secure.ts
 * 
 * The secure version uses Better Auth sign-up API for proper password compatibility.
 */
import { createLogger } from '../src/lib/logger'
import { seedDatabase } from './lib/database-operations'

const logger = createLogger('seed-local-deprecated')

async function main() {
  logger.warn('⚠️ WARNING: This script is DEPRECATED and causes authentication failures!')
  logger.warn('   It uses custom password hashing incompatible with Better Auth.')
  logger.warn('   USE INSTEAD: pnpm tsx scripts/seed-local-secure.ts')
  logger.warn('   See: https://github.com/better-auth/better-auth/issues for details')
  
  // Still allow execution but warn user
  const shouldContinue = process.env.FORCE_DEPRECATED_SEEDING === 'true'
  
  if (!shouldContinue) {
    logger.error('❌ Aborting deprecated seeding. Use the secure version instead.')
    logger.info('💡 Run: pnpm tsx scripts/seed-local-secure.ts')
    process.exit(1)
  }
  
  logger.warn('🚨 PROCEEDING WITH DEPRECATED SEEDING (users will have auth failures!)')
  
  try {
    await seedDatabase('local')
    logger.warn('⚠️ Seeding completed but users created will have authentication failures!')
    logger.warn('   Delete these users and use scripts/seed-local-secure.ts instead')
  } catch (error) {
    logger.error('Failed to seed local database:', error)
    process.exit(1)
  }
}

main()