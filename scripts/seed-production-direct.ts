#!/usr/bin/env tsx
/**
 * Seed Production Database Directly
 * Uses Supabase client to seed production database with proper auth
 */
import { config } from 'dotenv'
import { resolve } from 'path'

import { createClient } from '@supabase/supabase-js'

import { auth } from '../src/lib/better-auth'
import { createLogger } from '../src/lib/logger'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('seed-production-direct')

// Coach data
const coaches = [
  {
    name: 'Sarah Mountain',
    fullName: 'Sarah Mountain',
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
  },
  {
    name: 'Marcus Trail',
    fullName: 'Marcus Trail',
    email: 'marcus@ultracoach.dev',
    password: 'UltraCoach2025!',
  },
  {
    name: 'Emma Summit',
    fullName: 'Emma Summit',
    email: 'emma@ultracoach.dev',
    password: 'UltraCoach2025!',
  },
]

// Runner data - just first 3 for quick testing
const runners = [
  {
    name: 'Alex Rivera',
    fullName: 'Alex Rivera',
    email: 'alex.rivera@ultracoach.dev',
  },
  {
    name: 'Jordan Chen',
    fullName: 'Jordan Chen',
    email: 'jordan.chen@ultracoach.dev',
  },
  {
    name: 'Casey Johnson',
    fullName: 'Casey Johnson',
    email: 'casey.johnson@ultracoach.dev',
  },
]

async function seedProductionDirect() {
  logger.info('🎯 Seeding production database directly...')

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Clear existing users first
    logger.info('🧹 Clearing existing users...')

    const { error: deleteAccountError } = await supabase.from('account').delete().neq('id', 'dummy') // delete all

    if (deleteAccountError) {
      logger.error('Error deleting accounts:', deleteAccountError)
    }

    const { error: deleteUserError } = await supabase.from('user').delete().neq('id', 'dummy') // delete all

    if (deleteUserError) {
      logger.error('Error deleting users:', deleteUserError)
    } else {
      logger.info('✅ Cleared existing users')
    }

    // Get Better Auth context for hashing
    const ctx = await auth.$context

    // Create coaches
    for (const coach of coaches) {
      logger.info(`Creating coach: ${coach.name}`)

      // Insert user record
      const { data: userData, error: userError } = await supabase
        .from('user')
        .insert({
          name: coach.name,
          email: coach.email,
          email_verified: false,
          role: 'coach',
          full_name: coach.fullName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (userError) {
        logger.error(`Failed to create coach ${coach.name}:`, userError)
        continue
      }

      logger.info(`✅ Created coach user: ${userData.name}`)

      // Hash password and create account
      const hashedPassword = await ctx.password.hash(coach.password)

      const { error: accountError } = await supabase.from('account').insert({
        user_id: userData.id,
        account_id: userData.id,
        provider_id: 'credential',
        password: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (accountError) {
        logger.error(`Failed to create coach account ${coach.name}:`, accountError)
      } else {
        logger.info(`✅ Created coach account: ${coach.name}`)
      }
    }

    // Create runners
    for (const runner of runners) {
      logger.info(`Creating runner: ${runner.name}`)

      // Insert user record
      const { data: userData, error: userError } = await supabase
        .from('user')
        .insert({
          name: runner.name,
          email: runner.email,
          email_verified: false,
          role: 'runner',
          full_name: runner.fullName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (userError) {
        logger.error(`Failed to create runner ${runner.name}:`, userError)
        continue
      }

      logger.info(`✅ Created runner user: ${userData.name}`)

      // Hash password and create account
      const hashedPassword = await ctx.password.hash('RunnerPass2025!')

      const { error: accountError } = await supabase.from('account').insert({
        user_id: userData.id,
        account_id: userData.id,
        provider_id: 'credential',
        password: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (accountError) {
        logger.error(`Failed to create runner account ${runner.name}:`, accountError)
      } else {
        logger.info(`✅ Created runner account: ${runner.name}`)
      }
    }

    // Verify the results
    const { data: users, error: countError } = await supabase
      .from('user')
      .select('id, name, email, role')
      .order('role', { ascending: true })

    if (countError) {
      logger.error('Error counting users:', countError)
    } else {
      logger.info('🎉 Production seeding complete!')
      logger.info(`📊 Created ${users.length} users:`)
      users.forEach(user => {
        logger.info(`   - ${user.name} (${user.email}) - ${user.role}`)
      })
    }

    logger.info('🔐 Test Credentials:')
    logger.info('   Coaches: sarah@ultracoach.dev, marcus@ultracoach.dev, emma@ultracoach.dev')
    logger.info(
      '   Runners: alex.rivera@ultracoach.dev, jordan.chen@ultracoach.dev, casey.johnson@ultracoach.dev'
    )
    logger.info('   Coach Password: UltraCoach2025!')
    logger.info('   Runner Password: RunnerPass2025!')
  } catch (error) {
    logger.error('❌ Production seeding failed:', error)
    throw error
  }
}

async function main() {
  try {
    await seedProductionDirect()
    logger.info('✅ Direct production seeding completed')
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
