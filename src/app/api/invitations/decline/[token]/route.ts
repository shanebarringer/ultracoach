/**
 * Decline Invitation API
 * POST /api/invitations/decline/[token] - Decline the invitation
 */
import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { hashToken, isTokenExpired } from '@/lib/invitation-tokens'
import { createLogger } from '@/lib/logger'
import { coach_invitations } from '@/lib/schema'

const logger = createLogger('api-invitations-decline')

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * POST /api/invitations/decline/[token] - Decline the invitation
 * This can be done without authentication (using the token from email)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'TOKEN_MISSING', message: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Get optional decline reason from body with validation
    let declineReason: string | null = null
    try {
      const body = await request.json()
      if (body.reason !== undefined && body.reason !== null) {
        // Coerce to string and trim
        const reasonString = String(body.reason).trim()
        // Validate max length (500 chars to match frontend)
        if (reasonString.length > 500) {
          return NextResponse.json(
            {
              success: false,
              error: 'REASON_TOO_LONG',
              message: 'Decline reason must be 500 characters or less',
            },
            { status: 400 }
          )
        }
        declineReason = reasonString || null
      }
    } catch {
      // No body is fine - decline reason is optional
    }

    // Hash the token to look it up
    const tokenHash = hashToken(token)

    // Find the invitation
    const [invitation] = await db
      .select()
      .from(coach_invitations)
      .where(eq(coach_invitations.token_hash, tokenHash))
      .limit(1)

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'TOKEN_INVALID', message: 'This invitation link is invalid' },
        { status: 400 }
      )
    }

    // Check status
    if (invitation.status === 'declined') {
      return NextResponse.json(
        {
          success: false,
          error: 'ALREADY_DECLINED',
          message: 'This invitation has already been declined',
        },
        { status: 400 }
      )
    }

    if (invitation.status === 'accepted') {
      return NextResponse.json(
        {
          success: false,
          error: 'ALREADY_ACCEPTED',
          message: 'This invitation has already been accepted',
        },
        { status: 400 }
      )
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: 'This invitation can no longer be declined',
        },
        { status: 400 }
      )
    }

    // Check if expired (still allow declining expired invitations for cleanliness)
    if (invitation.expires_at && isTokenExpired(invitation.expires_at)) {
      await db
        .update(coach_invitations)
        .set({ status: 'expired', updated_at: new Date() })
        .where(eq(coach_invitations.id, invitation.id))

      return NextResponse.json({ success: true, message: 'This invitation has expired' })
    }

    // Update invitation status to declined
    await db
      .update(coach_invitations)
      .set({
        status: 'declined',
        declined_at: new Date(),
        decline_reason: declineReason,
        updated_at: new Date(),
      })
      .where(eq(coach_invitations.id, invitation.id))

    logger.info('Invitation declined', {
      invitationId: invitation.id,
      inviterUserId: invitation.inviter_user_id,
      inviteeEmailDomain: invitation.invitee_email.split('@')[1] || 'unknown',
      hasReason: !!declineReason,
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation declined successfully',
    })
  } catch (error) {
    logger.error('Error declining invitation:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to decline invitation' },
      { status: 500 }
    )
  }
}
