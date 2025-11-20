import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user } from '@/lib/schema'

const logger = createLogger('api-admin-fix-user-names')

/**
 * Admin endpoint to fix missing user names
 * GET /api/admin/fix-user-names?preview=true - Preview changes
 * POST /api/admin/fix-user-names - Apply changes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // Check if user is admin/coach (you may want to add proper admin role)
    if (sessionUser.userType !== 'coach') {
      return NextResponse.json({ error: 'Forbidden - coaches only' }, { status: 403 })
    }

    const url = new URL(request.url)
    const preview = url.searchParams.get('preview') === 'true'

    logger.info('Fetching users for name fix...', { preview, requestedBy: sessionUser.email })

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
      let needsUpdate = false
      const proposed: { name?: string; fullName?: string } = {}

      // Check if fullName is missing
      if (!u.fullName || u.fullName.trim() === '') {
        if (u.name && u.name.trim() !== '') {
          proposed.fullName = u.name
          needsUpdate = true
        } else if (u.email) {
          const emailName = u.email.split('@')[0]
          const displayName = emailName
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
          proposed.fullName = displayName
          needsUpdate = true
        }
      } else {
        proposed.fullName = u.fullName
      }

      // Check if name is missing
      if (!u.name || u.name.trim() === '') {
        if (proposed.fullName) {
          proposed.name = proposed.fullName
          needsUpdate = true
        } else if (u.fullName && u.fullName.trim() !== '') {
          proposed.name = u.fullName
          needsUpdate = true
        } else if (u.email) {
          const emailName = u.email.split('@')[0]
          const displayName = emailName
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
          proposed.name = displayName
          needsUpdate = true
        }
      } else {
        proposed.name = u.name
      }

      if (needsUpdate) {
        usersToFix.push({
          id: u.id,
          email: u.email,
          currentName: u.name,
          currentFullName: u.fullName,
          proposedName: proposed.name || '',
          proposedFullName: proposed.fullName || '',
        })
      }
    }

    logger.info(`Found ${usersToFix.length} users that need name fixes`)

    return NextResponse.json({
      total: users.length,
      needsFix: usersToFix.length,
      preview: true,
      users: usersToFix,
    })
  } catch (error) {
    logger.error('Error in GET /api/admin/fix-user-names', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // Check if user is admin/coach
    if (sessionUser.userType !== 'coach') {
      return NextResponse.json({ error: 'Forbidden - coaches only' }, { status: 403 })
    }

    logger.info('Applying user name fixes...', { requestedBy: sessionUser.email })

    // Fetch all users
    const users = await db.select().from(user)
    let updatedCount = 0

    for (const u of users) {
      let needsUpdate = false
      const updates: Partial<typeof user.$inferInsert> = {}

      // Check if fullName is missing
      if (!u.fullName || u.fullName.trim() === '') {
        if (u.name && u.name.trim() !== '') {
          updates.fullName = u.name
          needsUpdate = true
        } else if (u.email) {
          const emailName = u.email.split('@')[0]
          const displayName = emailName
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
          updates.fullName = displayName
          needsUpdate = true
        }
      }

      // Check if name is missing
      if (!u.name || u.name.trim() === '') {
        if (updates.fullName) {
          updates.name = updates.fullName
          needsUpdate = true
        } else if (u.fullName && u.fullName.trim() !== '') {
          updates.name = u.fullName
          needsUpdate = true
        } else if (u.email) {
          const emailName = u.email.split('@')[0]
          const displayName = emailName
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
          updates.name = displayName
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        await db.update(user).set(updates).where(eq(user.id, u.id))
        updatedCount++
        logger.info(`Updated user ${u.email}`, { updates })
      }
    }

    logger.info('User names fix completed!', {
      total: users.length,
      updated: updatedCount,
    })

    return NextResponse.json({
      success: true,
      total: users.length,
      updated: updatedCount,
    })
  } catch (error) {
    logger.error('Error in POST /api/admin/fix-user-names', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
