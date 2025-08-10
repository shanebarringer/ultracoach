#!/usr/bin/env tsx
/**
 * Create Production Users via API
 * Creates test users by calling the production Better Auth signup endpoint
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('create-production-users-via-api')

// Test users to create
const testUsers = [
  {
    name: 'Sarah Mountain',
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'coach',
  },
  {
    name: 'Marcus Trail',
    email: 'marcus@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'coach',
  },
  { name: 'Emma Summit', email: 'emma@ultracoach.dev', password: 'UltraCoach2025!', role: 'coach' },
  {
    name: 'Alex Rivera',
    email: 'alex.rivera@ultracoach.dev',
    password: 'RunnerPass2025!',
    role: 'runner',
  },
  {
    name: 'Jordan Chen',
    email: 'jordan.chen@ultracoach.dev',
    password: 'RunnerPass2025!',
    role: 'runner',
  },
  {
    name: 'Casey Johnson',
    email: 'casey.johnson@ultracoach.dev',
    password: 'RunnerPass2025!',
    role: 'runner',
  },
]

async function createProductionUsers() {
  logger.info('🌐 Creating production users via API...')

  // Get production URL - try to detect current deployment
  const productionUrls = [
    'https://ultracoach-git-fix-nextjs-static-dynamic-rendering-shane-hehims-projects.vercel.app',
    'https://ultracoach.vercel.app',
    'https://ultracoach-ju5vpkh51-shane-hehims-projects.vercel.app',
  ]

  let workingUrl: string | null = null

  // Test which URL is working
  for (const url of productionUrls) {
    try {
      logger.info(`Testing ${url}...`)
      const response = await fetch(`${url}/api/health`)
      if (response.ok) {
        workingUrl = url
        logger.info(`✅ Found working production URL: ${url}`)
        break
      }
    } catch (error) {
      logger.info(`❌ ${url} not responding`)
    }
  }

  if (!workingUrl) {
    logger.error('❌ Could not find working production URL')
    return
  }

  // Create users via Better Auth signup API
  for (const user of testUsers) {
    logger.info(`Creating ${user.role}: ${user.name} (${user.email})`)

    try {
      const response = await fetch(`${workingUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          fullName: user.name,
        }),
      })

      if (response.ok) {
        logger.info(`✅ Created ${user.role}: ${user.name}`)
      } else {
        const errorText = await response.text()
        logger.error(`❌ Failed to create ${user.name}: ${response.status} ${response.statusText}`)
        logger.error(`Response: ${errorText}`)
      }
    } catch (error) {
      logger.error(`❌ Network error creating ${user.name}:`, error)
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  logger.info('🎉 Production user creation completed!')
  logger.info('🔐 Test Credentials:')
  logger.info(
    '   Coaches: sarah@ultracoach.dev, marcus@ultracoach.dev, emma@ultracoach.dev (UltraCoach2025!)'
  )
  logger.info(
    '   Runners: alex.rivera@ultracoach.dev, jordan.chen@ultracoach.dev, casey.johnson@ultracoach.dev (RunnerPass2025!)'
  )
}

async function main() {
  try {
    await createProductionUsers()
    logger.info('✅ Production user creation script completed')
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
