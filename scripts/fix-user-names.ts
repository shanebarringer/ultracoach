import 'dotenv/config'
import { eq } from 'drizzle-orm'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { user } from '../src/lib/schema'

const logger = createLogger('fix-user-names')

/**
 * Fix missing user names in the database
 * - Populates fullName from name if missing
 * - Populates name from email if missing
 * - Ensures all users have displayable names
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
      let needsUpdate = false
      const updates: Partial<typeof user.$inferInsert> = {}

      // Check if fullName is missing
      if (!u.fullName || u.fullName.trim() === '') {
        // Use name if available, otherwise extract from email
        if (u.name && u.name.trim() !== '') {
          updates.fullName = u.name
          needsUpdate = true
          logger.info(`Will set fullName from name for user ${u.email}`, {
            name: u.name,
          })
        } else if (u.email) {
          // Extract name from email (before @)
          const emailName = u.email.split('@')[0]
          const displayName = emailName
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
          updates.fullName = displayName
          needsUpdate = true
          logger.info(`Will set fullName from email for user ${u.email}`, {
            extractedName: displayName,
          })
        }
      }

      // Check if name is missing
      if (!u.name || u.name.trim() === '') {
        // Use fullName if available, otherwise extract from email
        if (updates.fullName) {
          // Use the fullName we just computed
          updates.name = updates.fullName
          needsUpdate = true
          logger.info(`Will set name from computed fullName for user ${u.email}`)
        } else if (u.fullName && u.fullName.trim() !== '') {
          updates.name = u.fullName
          needsUpdate = true
          logger.info(`Will set name from fullName for user ${u.email}`)
        } else if (u.email) {
          // Extract name from email
          const emailName = u.email.split('@')[0]
          const displayName = emailName
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
          updates.name = displayName
          needsUpdate = true
          logger.info(`Will set name from email for user ${u.email}`, {
            extractedName: displayName,
          })
        }
      }

      if (needsUpdate) {
        await db.update(user).set(updates).where(eq(user.id, u.id))
        updatedCount++
        logger.info(`✅ Updated user ${u.email}`, updates)
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
    } else {
      logger.info('✅ All users now have both name and fullName fields populated')
    }
  } catch (error) {
    logger.error('Error fixing user names:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

fixUserNames()
