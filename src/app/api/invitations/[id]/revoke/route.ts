/**
 * Revoke Invitation API
 * POST /api/invitations/[id]/revoke - Revoke a pending invitation
 */
import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_invitations } from '@/lib/schema'

const logger = createLogger('api-invitations-revoke')

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/invitations/[id]/revoke - Revoke a pending invitation
 * Only the inviter can revoke their own invitations
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID_MISSING', message: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    const sessionUser = session.user as User

    // Find the invitation
    const [invitation] = await db
      .select()
      .from(coach_invitations)
      .where(eq(coach_invitations.id, id))
      .limit(1)

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Verify the user is the inviter
    if (invitation.inviter_user_id !== sessionUser.id) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'You can only revoke your own invitations' },
        { status: 403 }
      )
    }

    // Check if invitation can be revoked
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: `Cannot revoke ${invitation.status} invitation`,
        },
        { status: 400 }
      )
    }

    // Update invitation status to revoked
    await db
      .update(coach_invitations)
      .set({
        status: 'revoked',
        updated_at: new Date(),
      })
      .where(eq(coach_invitations.id, invitation.id))

    logger.info('Invitation revoked', {
      invitationId: invitation.id,
      inviterUserId: sessionUser.id,
      inviteeEmail: invitation.invitee_email,
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully',
    })
  } catch (error) {
    logger.error('Error revoking invitation:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to revoke invitation' },
      { status: 500 }
    )
  }
}
