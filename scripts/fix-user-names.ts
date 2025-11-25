import 'dotenv/config'
import { eq } from 'drizzle-orm'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { user } from '../src/lib/schema'
import { getNameUpdates } from '../src/lib/utils/user-names'

const logger = createLogger('fix-user-names')

/**
 * Fix missing user names in the database
 * - Populates fullName from name if missing
 * - Populates name from email if missing
 * - Ensures all users have displayable names
 *
 * NOTE: This script loads all users into memory and performs per-row updates.
 * For large user tables, consider batch processing or bulk updates.
 * Acceptable for current scale but may need optimization for production-scale datasets.
 */
async function fixUserNames() {
  try {
    logger.info('Starting user names fix...')

    // Fetch all users
    const users = await db.select().from(user)
    logger.info(`Found ${users.length} users in database`)

    let updatedCount = 0
    let skippedCount = 0

    for (const u of users) {
      const updates = getNameUpdates({
        name: u.name,
        fullName: u.fullName,
        email: u.email,
      })

      if (updates.needsUpdate) {
        await db
          .update(user)
          .set({
            name: updates.name,
            fullName: updates.fullName,
          })
          .where(eq(user.id, u.id))

        updatedCount++
        logger.info(`✅ Updated user ${u.email}`, {
          name: updates.name,
          fullName: updates.fullName,
        })
      } else {
        skippedCount++
        logger.debug(`Skipped user ${u.email} (already has both name and fullName)`, {
          name: u.name,
          fullName: u.fullName,
        })
      }
    }

    logger.info('User names fix completed!', {
      total: users.length,
      updated: updatedCount,
      skipped: skippedCount,
    })

    // Verify the fixes
    logger.info('Verifying fixes...')
    const verifyUsers = await db.select().from(user)
    const stillMissing = verifyUsers.filter(
      u => !u.name || u.name.trim() === '' || !u.fullName || u.fullName.trim() === ''
    )

    if (stillMissing.length > 0) {
      logger.warn('Some users still have missing names:', {
        count: stillMissing.length,
        emails: stillMissing.map(u => u.email),
      })
      // Set exit code to indicate partial success
      process.exitCode = 1
    } else {
      logger.info('✅ All users now have both name and fullName fields populated')
    }
  } catch (error) {
    logger.error('Error fixing user names:', error)
    // Set exit code to indicate failure
    process.exitCode = 1
    throw error
  }
}

// Run the fix and handle errors properly
fixUserNames().catch(error => {
  logger.error('Fatal error in fixUserNames:', error)
  process.exitCode = 1
})
