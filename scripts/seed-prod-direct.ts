#!/usr/bin/env tsx
/**
 * Direct Production Database Seeding
 * Uses direct SQL commands to ensure we're connecting to production
 */
import { generateRandomString } from 'better-auth/crypto'
import { execSync } from 'child_process'
import { scrypt } from 'crypto'
import { config } from 'dotenv'
import { promisify } from 'util'

// Load production environment variables ONLY
config({ path: '.env.production' })

const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  logger.error('DATABASE_URL not found in .env.production')
  process.exit(1)
}

// Password hashing using scrypt (matching Better Auth's default)
const scryptAsync = promisify(scrypt)

async function defaultHash(password: string): Promise<string> {
  const salt = generateRandomString(16)
  const hash = (await scryptAsync(password, salt, 32)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

const PRODUCTION_USERS = [
  {
    email: 'admin@ultracoach.com',
    password: 'AdminUltraCoach2024!',
    name: 'UltraCoach Admin',
    role: 'coach',
  },
  {
    email: 'demo.coach@ultracoach.com',
    password: 'DemoCoach2024!',
    name: 'Demo Coach',
    role: 'coach',
  },
  {
    email: 'demo.runner@ultracoach.com',
    password: 'DemoRunner2024!',
    name: 'Demo Runner',
    role: 'runner',
  },
]

async function createProductionUsers() {
  logger.info('🌱 Creating production users directly via SQL...')

  for (const userData of PRODUCTION_USERS) {
    try {
      logger.info(`Creating user: ${userData.email}`)

      // Generate IDs and hash password
      const userId = generateRandomString(32)
      const accountId = generateRandomString(32)
      const hashedPassword = await defaultHash(userData.password)

      // Create user and account in a single transaction
      const sql = `
        BEGIN;
        
        INSERT INTO "user" (id, email, name, role, full_name, email_verified, created_at, updated_at)
        VALUES ('${userId}', '${userData.email}', '${userData.name}', '${userData.role}', '${userData.name}', false, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          role = EXCLUDED.role,
          updated_at = NOW();
        
        INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
        VALUES ('${accountId}', '${userId}', 'credential', '${userId}', '${hashedPassword}', NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        COMMIT;
      `

      execSync(`psql "${DATABASE_URL}" -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'inherit' })
      logger.info(`✅ Created user: ${userData.email} (${userData.role})`)
    } catch (error) {
      logger.error(`❌ Failed to create user ${userData.email}:`, error)
    }
  }
}

async function main() {
  try {
    await createProductionUsers()

    // Show final summary
    logger.info('')
    logger.info('📋 Production Login Credentials:')
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    for (const user of PRODUCTION_USERS) {
      logger.info(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`)
    }
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    logger.info('✅ Production database seeding completed!')
  } catch (error) {
    logger.error('❌ Production seeding failed:', error)
    process.exit(1)
  }
}

main()
