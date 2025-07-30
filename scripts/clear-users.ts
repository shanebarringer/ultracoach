#!/usr/bin/env tsx

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local BEFORE importing anything that uses them
config({ path: resolve(process.cwd(), '.env.local') })

import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, inArray } from 'drizzle-orm'
import { Pool } from 'pg'
import { createLogger } from '../src/lib/logger'
import * as schema from '../src/lib/schema'

const logger = createLogger('clear-users')

async function clearTestUsers() {
  logger.info('🧹 Clearing existing test users...')
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false,
    } : false,
  })

  const db = drizzle(pool, { schema })
  
  try {
    // Delete test users and related data
    const testEmails = [
      'testcoach@ultracoach.dev',
      'coach2@ultracoach.dev', 
      'testrunner@ultracoach.dev',
      'runner2@ultracoach.dev'
    ]
    
    // Get all user IDs to delete
    const usersToDelete = await db.select({ id: schema.better_auth_users.id, email: schema.better_auth_users.email })
      .from(schema.better_auth_users)
      .where(inArray(schema.better_auth_users.email, testEmails))
      
    if (usersToDelete.length === 0) {
      logger.info('ℹ️ No test users found to delete')
      return
    }
    
    const userIds = usersToDelete.map(user => user.id)
    logger.info(`Found ${usersToDelete.length} users to delete:`, usersToDelete.map(u => u.email))
    
    // Delete in the correct order due to foreign key constraints
    // 1. First delete accounts (references users)
    if (userIds.length > 0) {
      await db.delete(schema.better_auth_accounts)
        .where(inArray(schema.better_auth_accounts.userId, userIds))
      logger.info('✅ Deleted accounts')
      
      // 2. Delete sessions (references users)  
      await db.delete(schema.better_auth_sessions)
        .where(inArray(schema.better_auth_sessions.userId, userIds))
      logger.info('✅ Deleted sessions')
      
      // 3. Finally delete users
      await db.delete(schema.better_auth_users)
        .where(inArray(schema.better_auth_users.id, userIds))
      logger.info('✅ Deleted users')
    }
    
    logger.info('✅ Test users cleared successfully')
    
  } catch (error) {
    logger.error('❌ Failed to clear users:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Handle script execution
if (require.main === module) {
  clearTestUsers().then(() => {
    logger.info('✅ Clear users completed')
    process.exit(0)
  }).catch((error) => {
    logger.error('❌ Clear users failed:', error)
    process.exit(1)
  })
}

export { clearTestUsers }