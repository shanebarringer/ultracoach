import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user } from '@/lib/schema'
import { getNameUpdates } from '@/lib/utils/user-names'

const logger = createLogger('api-admin-fix-user-names')

/**
 * Validates that the request has a valid coach session
 *
 * SECURITY NOTE: This checks for userType === 'coach', not a dedicated admin role.
 * In the current architecture, this means any coach can run this repair operation.
 * Consider adding a dedicated admin flag if this level of access is too broad.
 *
 * @returns The authenticated coach user, or a NextResponse error
 */
async function validateCoachAccess(
  request: NextRequest
): Promise<User | NextResponse> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionUser = session.user as User

  // Check if user is coach (acting as admin in current architecture)
  if (sessionUser.userType !== 'coach') {
    return NextResponse.json({ error: 'Forbidden - coaches only' }, { status: 403 })
  }

  return sessionUser
}

/**
 * Admin endpoint to fix missing user names
 *
 * GET /api/admin/fix-user-names - Preview changes (read-only, shows what would be fixed)
 * POST /api/admin/fix-user-names - Apply changes (writes to database with transaction safety)
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await validateCoachAccess(request)

    // Early return if validation returned an error response
    if (sessionUser instanceof NextResponse) {
      return sessionUser
    }

    logger.info('Fetching users for name fix preview...', { requestedBy: sessionUser.email })

    // Fetch all users
    const users = await db.select().from(user)
    logger.info(`Found ${users.length} users in database`)

    const usersToFix: Array<{
      id: string
      email: string
      currentName: string | null
      currentFullName: string | null
      proposedName: string
      proposedFullName: string
    }> = []

    for (const u of users) {
      const updates = getNameUpdates({
        name: u.name,
        fullName: u.fullName,
        email: u.email,
      })

      if (updates.needsUpdate) {
        usersToFix.push({
          id: u.id,
          email: u.email,
          currentName: u.name,
          currentFullName: u.fullName,
          proposedName: updates.name,
          proposedFullName: updates.fullName,
        })
      }
    }

    logger.info(`Found ${usersToFix.length} users that need name fixes`)

    return NextResponse.json({
      total: users.length,
      needsFix: usersToFix.length,
      preview: true, // GET is always read-only/preview mode
      users: usersToFix,
    })
  } catch (error) {
    logger.error('Error in GET /api/admin/fix-user-names', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await validateCoachAccess(request)

    // Early return if validation returned an error response
    if (sessionUser instanceof NextResponse) {
      return sessionUser
    }

    logger.info('Applying user name fixes...', { requestedBy: sessionUser.email })

    // Fetch all users
    // NOTE: For large user tables, this could be optimized with batch processing
    // and bulk updates. Acceptable for current scale but may need refactoring
    // if user count grows significantly.
    const users = await db.select().from(user)

    // Use transaction to ensure all-or-nothing updates
    // If any update fails, the entire batch will rollback
    const result = await db.transaction(async tx => {
      let updatedCount = 0

      for (const u of users) {
        const updates = getNameUpdates({
          name: u.name,
          fullName: u.fullName,
          email: u.email,
        })

        if (updates.needsUpdate) {
          await tx
            .update(user)
            .set({
              name: updates.name,
              fullName: updates.fullName,
            })
            .where(eq(user.id, u.id))

          updatedCount++
          logger.info(`Updated user ${u.email}`, {
            name: updates.name,
            fullName: updates.fullName,
          })
        }
      }

      return { total: users.length, updated: updatedCount }
    })

    logger.info('User names fix completed!', result)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error('Error in POST /api/admin/fix-user-names', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
