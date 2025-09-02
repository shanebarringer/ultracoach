#!/usr/bin/env tsx
/**
 * Check Production Table Names
 *
 * This script checks what auth table names actually exist in production
 * to determine if we have schema/database parity issues.
 */
import { config } from 'dotenv'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'

// Load production environment
config({ path: '.env.production' })

const logger = createLogger('CheckProductionTableNames')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  logger.error('DATABASE_URL not found in .env.production')
  process.exit(1)
}

async function checkProductionTableNames() {
  logger.info('🔍 Checking production database table names...')

  const sql = postgres(DATABASE_URL, { ssl: 'require' })

  try {
    // Check which auth tables exist
    const authTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'user', 'session', 'account', 'verification',
        'better_auth_users', 'better_auth_sessions', 
        'better_auth_accounts', 'better_auth_verification_tokens'
      )
      ORDER BY table_name
    `

    logger.info('🗄️ Auth tables found in production:', {
      tables: authTables.map(t => t.table_name),
      count: authTables.length,
    })

    // Check constraints on any existing session table
    const sessionTableName = authTables.find(
      t => t.table_name === 'session' || t.table_name === 'better_auth_sessions'
    )?.table_name

    if (sessionTableName) {
      logger.info(`🔗 Checking constraints on ${sessionTableName} table...`)

      const constraints = await sql`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints 
        WHERE table_name = ${sessionTableName}
        AND table_schema = 'public'
        ORDER BY constraint_name
      `

      logger.info('Constraints on session table:', {
        tableName: sessionTableName,
        constraints: constraints.map(c => ({ name: c.constraint_name, type: c.constraint_type })),
      })
    }

    // Check user table constraints
    const userTableName = authTables.find(
      t => t.table_name === 'user' || t.table_name === 'better_auth_users'
    )?.table_name

    if (userTableName) {
      logger.info(`🔗 Checking constraints on ${userTableName} table...`)

      const constraints = await sql`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints 
        WHERE table_name = ${userTableName}
        AND table_schema = 'public'
        ORDER BY constraint_name
      `

      logger.info('Constraints on user table:', {
        tableName: userTableName,
        constraints: constraints.map(c => ({ name: c.constraint_name, type: c.constraint_type })),
      })
    }

    // Show all tables for context
    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `

    logger.info('📋 All tables in production database:', {
      tables: allTables.map(t => t.table_name),
      totalCount: allTables.length,
    })

    return {
      authTables: authTables.map(t => t.table_name),
      sessionTable: sessionTableName,
      userTable: userTableName,
    }
  } catch (error) {
    logger.error('❌ Failed to check production table names:', error)
    throw error
  } finally {
    await sql.end()
  }
}

// Run the check
checkProductionTableNames()
  .then(result => {
    logger.info('✅ Production table check completed')
    logger.info('📊 Summary:', result)
    process.exit(0)
  })
  .catch(error => {
    logger.error('❌ Table check failed:', error)
    process.exit(1)
  })
