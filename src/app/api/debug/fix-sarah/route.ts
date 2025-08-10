import { eq } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { session, user } from '@/lib/schema'

const logger = createLogger('DebugFixSarah')

/**
 * DEBUG ENDPOINT: Fix Sarah's role and clear her sessions
 *
 * This endpoint:
 * 1. Updates Sarah's role to 'coach'
 * 2. Clears all her sessions to force fresh login
 * 3. Provides debug information about what was changed
 *
 * TEMPORARY: Remove after fixing the issue
 */
export async function POST() {
  try {
    logger.info('🔧 DEBUG: Starting Sarah role fix...')

    // The user ID from production session logs
    const productionSarahId = 'YCvRROMcX1Yy7gwKfUrYfqc7lMJD7cbM'

    // Step 1: Find and check Sarah's current state
    const existingUser = await db
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      })
      .from(user)
      .where(eq(user.id, productionSarahId))
      .limit(1)

    if (existingUser.length === 0) {
      logger.error('User not found with production session ID', {
        userId: productionSarahId,
      })

      // Let's check if Sarah exists with a different ID
      const sarahByEmail = await db
        .select({
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        })
        .from(user)
        .where(eq(user.email, 'sarah@ultracoach.dev'))
        .limit(1)

      if (sarahByEmail.length > 0) {
        logger.info('Found Sarah by email with different ID', {
          foundUser: {
            id: sarahByEmail[0].id.slice(0, 8) + '...',
            role: sarahByEmail[0].role,
            email: sarahByEmail[0].email,
          },
          expectedId: productionSarahId.slice(0, 8) + '...',
        })

        return NextResponse.json(
          {
            error: 'User ID mismatch',
            found: sarahByEmail[0],
            expected: productionSarahId,
            message: 'Sarah exists but with a different user ID than the session shows',
          },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentUser = existingUser[0]
    logger.info('Found user in production database', {
      id: currentUser.id.slice(0, 8) + '...',
      email: currentUser.email,
      role: currentUser.role,
      name: currentUser.name,
    })

    // Step 2: Update role if needed
    let roleUpdated = false
    if (currentUser.role !== 'coach') {
      logger.info('Updating user role to coach...', {
        fromRole: currentUser.role,
        toRole: 'coach',
      })

      await db
        .update(user)
        .set({
          role: 'coach',
          updatedAt: new Date(),
        })
        .where(eq(user.id, productionSarahId))

      roleUpdated = true
      logger.info('✅ Role updated successfully')
    } else {
      logger.info('User already has coach role')
    }

    // Step 3: Clear all sessions for this user
    logger.info('Clearing all sessions for user...', {
      userId: productionSarahId.slice(0, 8) + '...',
    })

    const deletedSessions = await db
      .delete(session)
      .where(eq(session.userId, productionSarahId))
      .returning({ id: session.id })

    logger.info(`✅ Cleared ${deletedSessions.length} sessions`)

    const result = {
      success: true,
      message: 'Sarah has been fixed! She must log in again to get fresh session data.',
      changes: {
        roleUpdated,
        sessionsCleared: deletedSessions.length,
        oldRole: currentUser.role,
        newRole: 'coach',
      },
      user: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: 'coach',
      },
    }

    logger.info('🎉 Sarah fix completed successfully!', result)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error fixing Sarah:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
