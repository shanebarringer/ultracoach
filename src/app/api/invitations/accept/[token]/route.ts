/**
 * Accept Invitation API
 * GET /api/invitations/accept/[token] - Validate token and get invitation details
 * POST /api/invitations/accept/[token] - Accept the invitation
 */
import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import {
  generateInvitationAcceptedEmailHTML,
  generateInvitationAcceptedEmailText,
} from '@/lib/email/invitation-template'
import { sendEmail } from '@/lib/email/send-email'
import { hashToken, isTokenExpired } from '@/lib/invitation-tokens'
import { createLogger } from '@/lib/logger'
import { coach_invitations, coach_runners, user } from '@/lib/schema'

const logger = createLogger('api-invitations-accept')

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/invitations/accept/[token] - Validate token and get invitation details
 * This is public - no auth required to view invitation details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'TOKEN_MISSING', message: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Hash the token to look it up in the database
    const tokenHash = hashToken(token)

    // Find the invitation
    const [invitation] = await db
      .select({
        id: coach_invitations.id,
        inviteeEmail: coach_invitations.invitee_email,
        invitedRole: coach_invitations.invited_role,
        personalMessage: coach_invitations.personal_message,
        status: coach_invitations.status,
        expiresAt: coach_invitations.expires_at,
        inviterUserId: coach_invitations.inviter_user_id,
        inviterName: user.name,
        inviterEmail: user.email,
      })
      .from(coach_invitations)
      .innerJoin(user, eq(coach_invitations.inviter_user_id, user.id))
      .where(eq(coach_invitations.token_hash, tokenHash))
      .limit(1)

    if (!invitation) {
      return NextResponse.json(
        { valid: false, error: 'TOKEN_INVALID', message: 'This invitation link is invalid' },
        { status: 400 }
      )
    }

    // Check invitation status
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        {
          valid: false,
          error: 'ALREADY_ACCEPTED',
          message: 'This invitation has already been accepted',
        },
        { status: 400 }
      )
    }

    if (invitation.status === 'declined') {
      return NextResponse.json(
        { valid: false, error: 'ALREADY_DECLINED', message: 'This invitation has been declined' },
        { status: 400 }
      )
    }

    if (invitation.status === 'revoked') {
      return NextResponse.json(
        {
          valid: false,
          error: 'REVOKED',
          message: 'This invitation has been revoked by the sender',
        },
        { status: 400 }
      )
    }

    // Check if expired
    if (isTokenExpired(invitation.expiresAt!)) {
      // Update status to expired
      await db
        .update(coach_invitations)
        .set({ status: 'expired' })
        .where(eq(coach_invitations.id, invitation.id))

      return NextResponse.json(
        { valid: false, error: 'TOKEN_EXPIRED', message: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if invitee already has an account
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, invitation.inviteeEmail.toLowerCase()))
      .limit(1)

    return NextResponse.json({
      valid: true,
      invitation: {
        inviterName: invitation.inviterName,
        inviterEmail: invitation.inviterEmail,
        invitedRole: invitation.invitedRole,
        personalMessage: invitation.personalMessage,
        expiresAt: invitation.expiresAt,
      },
      existingUser: !!existingUser,
    })
  } catch (error) {
    logger.error('Error validating invitation token:', error)
    return NextResponse.json(
      { valid: false, error: 'INTERNAL_ERROR', message: 'Failed to validate invitation' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invitations/accept/[token] - Accept the invitation
 * Requires authentication (user must be logged in)
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

    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Please sign in to accept this invitation',
        },
        { status: 401 }
      )
    }

    const sessionUser = session.user as User

    // Hash the token to look it up
    const tokenHash = hashToken(token)

    // Find and validate the invitation
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

    // Verify the invitation is for this user's email
    if (invitation.invitee_email.toLowerCase() !== sessionUser.email.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: 'EMAIL_MISMATCH',
          message: 'This invitation was sent to a different email address',
        },
        { status: 403 }
      )
    }

    // Check status
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
          message: 'This invitation can no longer be accepted',
        },
        { status: 400 }
      )
    }

    // Check if expired
    if (isTokenExpired(invitation.expires_at!)) {
      await db
        .update(coach_invitations)
        .set({ status: 'expired' })
        .where(eq(coach_invitations.id, invitation.id))

      return NextResponse.json(
        { success: false, error: 'TOKEN_EXPIRED', message: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Get the inviter's details for the confirmation email
    const [inviter] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, invitation.inviter_user_id))
      .limit(1)

    // Create the coach-runner relationship
    // Determine who is coach and who is runner based on the invitation
    const coachId = invitation.inviter_user_id
    const runnerId = sessionUser.id

    // Check if relationship already exists
    const existingRelationship = await db
      .select()
      .from(coach_runners)
      .where(and(eq(coach_runners.coach_id, coachId), eq(coach_runners.runner_id, runnerId)))
      .limit(1)

    let relationshipId: string

    if (existingRelationship.length > 0) {
      // Relationship exists - update it to active
      await db
        .update(coach_runners)
        .set({
          status: 'active',
          relationship_type: 'invited',
          updated_at: new Date(),
        })
        .where(eq(coach_runners.id, existingRelationship[0].id))

      relationshipId = existingRelationship[0].id
    } else {
      // Create new relationship
      const [newRelationship] = await db
        .insert(coach_runners)
        .values({
          coach_id: coachId,
          runner_id: runnerId,
          status: 'active',
          relationship_type: 'invited',
          invited_by: 'coach',
          relationship_started_at: new Date(),
        })
        .returning()

      relationshipId = newRelationship.id
    }

    // Update invitation status
    await db
      .update(coach_invitations)
      .set({
        status: 'accepted',
        accepted_at: new Date(),
        invitee_user_id: sessionUser.id,
        coach_runner_relationship_id: relationshipId,
        updated_at: new Date(),
      })
      .where(eq(coach_invitations.id, invitation.id))

    logger.info('Invitation accepted', {
      invitationId: invitation.id,
      inviterUserId: invitation.inviter_user_id,
      inviteeUserId: sessionUser.id,
      relationshipId,
    })

    // Send confirmation email to the coach
    if (inviter) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
      await sendEmail({
        to: inviter.email,
        subject: `${sessionUser.name || sessionUser.email} has accepted your invitation!`,
        html: generateInvitationAcceptedEmailHTML({
          coachName: inviter.name || inviter.email,
          runnerName: sessionUser.name || sessionUser.email,
          runnerEmail: sessionUser.email,
          dashboardUrl: `${baseUrl}/dashboard/coach`,
        }),
        text: generateInvitationAcceptedEmailText({
          coachName: inviter.name || inviter.email,
          runnerName: sessionUser.name || sessionUser.email,
          runnerEmail: sessionUser.email,
          dashboardUrl: `${baseUrl}/dashboard/coach`,
        }),
      })
    }

    // Determine redirect URL based on the user's role
    const redirectUrl = sessionUser.userType === 'coach' ? '/dashboard/coach' : '/dashboard/runner'

    return NextResponse.json({
      success: true,
      relationship: {
        id: relationshipId,
        coachId,
        runnerId,
        status: 'active',
      },
      redirectUrl,
    })
  } catch (error) {
    logger.error('Error accepting invitation:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
