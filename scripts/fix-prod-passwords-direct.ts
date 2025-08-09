#!/usr/bin/env tsx
/**
 * Fix Production Passwords - Direct SQL Approach
 * 
 * The issue is that our custom password hashing isn't compatible with Better Auth.
 * Let's recreate the users using the production API (like we did originally)
 * but this time clear the existing ones first.
 */

import { execSync } from 'child_process'
import { config } from 'dotenv'

// Load production environment variables ONLY
config({ path: '.env.production' })

const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
}

const DATABASE_URL = process.env.DATABASE_URL
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL

if (!DATABASE_URL || !BETTER_AUTH_URL) {
  logger.error('Missing DATABASE_URL or BETTER_AUTH_URL')
  process.exit(1)
}

const USERS = [
  { email: 'testcoach@ultracoach.dev', password: 'TestCoach123!', name: 'Elena Rodriguez', role: 'coach' },
  { email: 'testcoach2@ultracoach.dev', password: 'TestCoach2123!', name: 'Sarah Mountain', role: 'coach' },
  { email: 'testrunner@ultracoach.dev', password: 'TestRunner123!', name: 'Alex Trail', role: 'runner' },
  { email: 'testrunner2@ultracoach.dev', password: 'TestRunner2123!', name: 'Mike Trailblazer', role: 'runner' },
]

async function recreateUsersWithAPI() {
  logger.info('🔄 Recreating users via Better Auth API for proper password hashing...')
  
  // First, clear existing users
  logger.info('💥 Clearing existing users...')
  execSync(`psql "${DATABASE_URL}" -c "DELETE FROM account; DELETE FROM \\\"user\\\";"`, { stdio: 'inherit' })
  
  // Create users via API
  for (const user of USERS) {
    try {
      logger.info(`Creating user: ${user.email}`)
      
      const response = await fetch(`${BETTER_AUTH_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'UltraCoach-Password-Fix/1.0',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const result = await response.json()
      logger.info(`✅ Created user: ${user.email} (ID: ${result.user?.id})`)
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      logger.error(`❌ Failed to create user ${user.email}:`, error)
    }
  }
}

async function main() {
  try {
    await recreateUsersWithAPI()
    
    // Verify users were created
    logger.info('')
    logger.info('🔍 Verifying users in production database...')
    execSync(`psql "${DATABASE_URL}" -c "SELECT u.email, u.role, LENGTH(a.password) as pwd_len FROM \"user\" u JOIN account a ON u.id = a.user_id ORDER BY u.email;"`, { stdio: 'inherit' })
    
    logger.info('')
    logger.info('✅ Users recreated with proper Better Auth password hashing!')
    logger.info('🔐 Try logging in now with these credentials:')
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    for (const user of USERS) {
      logger.info(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`)
    }
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
  } catch (error) {
    logger.error('❌ Failed to recreate users:', error)
    process.exit(1)
  }
}

main()