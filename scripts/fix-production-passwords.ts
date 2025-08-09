#!/usr/bin/env tsx
/**
 * Fix Production User Passwords
 * 
 * Updates existing production users with properly hashed passwords using Better Auth's
 * internal password hashing system for compatibility
 */

import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../src/lib/schema'

// Force production environment variables ONLY
process.env.NODE_ENV = 'production'
config({ path: '.env.production' })

// Create database connection using production DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.production')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

const db = drizzle(pool, { schema })

const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
}

// User credentials that need password fixes
const USER_PASSWORDS = [
  { email: 'testcoach@ultracoach.dev', password: 'TestCoach123!' },
  { email: 'testcoach2@ultracoach.dev', password: 'TestCoach2123!' },
  { email: 'testrunner@ultracoach.dev', password: 'TestRunner123!' },
  { email: 'testrunner2@ultracoach.dev', password: 'TestRunner2123!' },
]

async function fixUserPasswords() {
  logger.info('🔧 Fixing production user passwords with Better Auth hashing...')
  
  // Import Better Auth instance to get proper password hashing
  const { auth } = await import('../src/lib/better-auth')
  
  for (const userCreds of USER_PASSWORDS) {
    try {
      logger.info(`Fixing password for: ${userCreds.email}`)
      
      // Get the user from database
      const user = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, userCreds.email))
        .limit(1)
        
      if (user.length === 0) {
        logger.error(`User ${userCreds.email} not found`)
        continue
      }
      
      // Use Better Auth's internal password hashing
      const hashedPassword = await auth.options.emailAndPassword?.password?.hash?.(userCreds.password)
      
      if (!hashedPassword) {
        logger.error(`Failed to hash password for ${userCreds.email}`)
        continue
      }
      
      // Update the account password
      await db
        .update(schema.account)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date() 
        })
        .where(eq(schema.account.userId, user[0].id))
        
      logger.info(`✅ Updated password for: ${userCreds.email}`)
      
    } catch (error) {
      logger.error(`❌ Failed to fix password for ${userCreds.email}:`, error)
    }
  }
}

async function main() {
  try {
    await fixUserPasswords()
    
    // Verify the password formats
    logger.info('')
    logger.info('🔍 Verifying password formats...')
    
    const accounts = await db
      .select({
        email: schema.user.email,
        passwordLength: 'LENGTH(account.password)',
        passwordSample: 'LEFT(account.password, 20)',
      })
      .from(schema.account)
      .innerJoin(schema.user, eq(schema.account.userId, schema.user.id))
    
    for (const account of accounts as any) {
      logger.info(`${account.email}: length=${account.passwordlength}, sample="${account.passwordsample}"`)
    }
    
    logger.info('')
    logger.info('✅ Password fixing completed! Try logging in again.')
    
  } catch (error) {
    logger.error('❌ Password fixing failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()