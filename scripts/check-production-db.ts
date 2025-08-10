#!/usr/bin/env tsx
/**
 * Query the production database through our API to check Sarah's actual record
 *
 * This uses the same API endpoint that the production app uses,
 * so we can see what the actual production database contains.
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('CheckProductionDB')

async function checkProductionDatabase() {
  const productionUrl =
    'https://ultracoach-git-fix-nextjs-static-dynamic-rendering-shane-hehims-projects.vercel.app'

  try {
    logger.info('Checking production database through API...', {
      url: productionUrl,
    })

    // Check what user ID YCvRROMcX1Yy7gwKfUrYfqc7lMJD7cbM actually contains
    const userCheckUrl = `${productionUrl}/api/users/YCvRROMcX1Yy7gwKfUrYfqc7lMJD7cbM`

    logger.info('Checking user via API:', {
      url: userCheckUrl,
    })

    const userResponse = await fetch(userCheckUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'UltraCoach-Debug-Script/1.0',
      },
    })

    const userData = await userResponse.json()

    logger.info('User API Response:', {
      status: userResponse.status,
      data: userData,
    })

    // Also check if we can query for Sarah by email
    const emailCheckUrl = `${productionUrl}/api/users?email=sarah@ultracoach.dev`

    logger.info('Checking users by email:', {
      url: emailCheckUrl,
    })

    const emailResponse = await fetch(emailCheckUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'UltraCoach-Debug-Script/1.0',
      },
    })

    const emailData = await emailResponse.json()

    logger.info('Email search API Response:', {
      status: emailResponse.status,
      data: emailData,
    })
  } catch (error) {
    logger.error('Error checking production database:', error)
  }
}

// Run the script
checkProductionDatabase().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})
