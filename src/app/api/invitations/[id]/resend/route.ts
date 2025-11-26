/**
 * Resend Invitation API
 * POST /api/invitations/[id]/resend - Resend an invitation email
 */
import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import {
  generateInvitationEmailHTML,
  generateInvitationEmailText,
} from '@/lib/email/invitation-template'
import { sendEmail } from '@/lib/email/send-email'
import {
  INVITATION_CONFIG,
  buildDeclineUrl,
  buildInvitationUrl,
  generateInvitationToken,
} from '@/lib/invitation-tokens'
import { createLogger } from '@/lib/logger'
import { coach_invitations } from '@/lib/schema'

const logger = createLogger('api-invitations-resend')

interface RouteParams {
  params: Promise<{ id: string }>
}

const MAX_RESENDS = 3

/**
 * POST /api/invitations/[id]/resend - Resend an invitation email
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
        { success: false, error: 'FORBIDDEN', message: 'You can only resend your own invitations' },
        { status: 403 }
      )
    }

    // Check if invitation can be resent
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: `Cannot resend ${invitation.status} invitation`,
        },
        { status: 400 }
      )
    }

    // Check resend limit
    if (invitation.resend_count >= MAX_RESENDS) {
      return NextResponse.json(
        {
          success: false,
          error: 'RESEND_LIMIT',
          message: `Maximum resend limit (${MAX_RESENDS}) reached`,
        },
        { status: 429 }
      )
    }

    // Generate a new token for the resend
    // SECURITY: Only the hash is stored - the raw token is sent in email only
    // NOTE: This invalidates any previous invitation links (new hash replaces old)
    const { token, tokenHash, expiresAt } = generateInvitationToken(
      INVITATION_CONFIG.DEFAULT_EXPIRATION_DAYS
    )

    // Update invitation with new token hash (invalidates old links)
    await db
      .update(coach_invitations)
      .set({
        token_hash: tokenHash,
        expires_at: expiresAt,
        resend_count: invitation.resend_count + 1,
        last_resent_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(coach_invitations.id, invitation.id))

    logger.info('Invitation token regenerated for resend', {
      invitationId: invitation.id,
      resendCount: invitation.resend_count + 1,
      newExpiresAt: expiresAt.toISOString(),
    })

    // Build URLs with the new token
    const acceptUrl = buildInvitationUrl(token)
    const declineUrl = buildDeclineUrl(token)

    // Send email with the new invitation link
    const emailResult = await sendEmail({
      to: invitation.invitee_email,
      subject: `Reminder: ${sessionUser.name || sessionUser.email} invites you to UltraCoach`,
      html: generateInvitationEmailHTML({
        inviterName: sessionUser.name || sessionUser.email,
        inviterEmail: sessionUser.email,
        invitedRole: invitation.invited_role as 'runner' | 'coach',
        personalMessage: invitation.personal_message || undefined,
        acceptUrl,
        declineUrl,
        expiresAt,
      }),
      text: generateInvitationEmailText({
        inviterName: sessionUser.name || sessionUser.email,
        inviterEmail: sessionUser.email,
        invitedRole: invitation.invited_role as 'runner' | 'coach',
        personalMessage: invitation.personal_message || undefined,
        acceptUrl,
        declineUrl,
        expiresAt,
      }),
    })

    if (!emailResult.success) {
      logger.error('Failed to send resend email', {
        invitationId: invitation.id,
        error: emailResult.error,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully with new link',
      invitation: {
        id: invitation.id,
        expiresAt,
        resendCount: invitation.resend_count + 1,
      },
      emailSent: emailResult.success,
    })
  } catch (error) {
    logger.error('Error resending invitation:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}
