/**
 * Accept Invitation API
 * GET /api/invitations/accept/[token] - Validate token and get invitation details
 * POST /api/invitations/accept/[token] - Accept the invitation
 */
import { and, eq, or } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import {
  generateInvitationAcceptedEmailHTML,
  generateInvitationAcceptedEmailText,
} from '@/lib/email/invitation-template'
import { sendEmail } from '@/lib/email/send-email'
import { getBaseUrl, hashToken, isTokenExpired } from '@/lib/invitation-tokens'
import { createLogger } from '@/lib/logger'
import { coach_connections, coach_invitations, coach_runners, user } from '@/lib/schema'

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

    // Check if expired - note: expiration status update is deferred to POST handler
    // to maintain GET idempotency (HTTP semantics)
    if (invitation.expiresAt && isTokenExpired(invitation.expiresAt)) {
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

    // Check if expired - POST handler updates the status for proper state management
    if (invitation.expires_at && isTokenExpired(invitation.expires_at)) {
      await db
        .update(coach_invitations)
        .set({ status: 'expired', updated_at: new Date() })
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

    // Validate invited_role before proceeding
    if (invitation.invited_role !== 'runner' && invitation.invited_role !== 'coach') {
      logger.error('Invalid invited_role value encountered', {
        invitationId: invitation.id,
        invited_role: invitation.invited_role,
      })
      return NextResponse.json(
        { success: false, error: 'INVALID_ROLE', message: 'Invalid invitation configuration' },
        { status: 400 }
      )
    }

    // Create the appropriate relationship based on invited_role
    // Wrapped in transaction for atomicity - if any operation fails, all changes are rolled back
    let transactionResult: {
      relationshipId: string
      relationshipType: 'coach_runner' | 'coach_connection'
    }

    try {
      transactionResult = await db.transaction(async tx => {
        let relationshipId: string
        let relationshipType: 'coach_runner' | 'coach_connection'

        if (invitation.invited_role === 'runner') {
          // Runner invitation: Create coach-runner relationship
          // Inviter is the coach, acceptor is the runner
          const coachId = invitation.inviter_user_id
          const runnerId = sessionUser.id

          // Check if relationship already exists
          const existingRelationship = await tx
            .select()
            .from(coach_runners)
            .where(and(eq(coach_runners.coach_id, coachId), eq(coach_runners.runner_id, runnerId)))
            .limit(1)

          if (existingRelationship.length > 0) {
            // Relationship exists - update it to active
            await tx
              .update(coach_runners)
              .set({
                status: 'active',
                relationship_type: 'invited',
                updated_at: new Date(),
              })
              .where(eq(coach_runners.id, existingRelationship[0].id))

            relationshipId = existingRelationship[0].id
          } else {
            // Create new coach-runner relationship
            const [newRelationship] = await tx
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

            // Verify the insert succeeded
            if (!newRelationship?.id) {
              logger.error(
                'Failed to create coach-runner relationship - insert returned no result',
                {
                  invitationId: invitation.id,
                  coachId,
                  runnerId,
                }
              )
              throw new Error('RELATIONSHIP_CREATE_FAILED')
            }

            relationshipId = newRelationship.id
          }
          relationshipType = 'coach_runner'

          // Update invitation status with coach_runner relationship
          await tx
            .update(coach_invitations)
            .set({
              status: 'accepted',
              accepted_at: new Date(),
              invitee_user_id: sessionUser.id,
              coach_runner_relationship_id: relationshipId,
              updated_at: new Date(),
            })
            .where(eq(coach_invitations.id, invitation.id))
        } else {
          // Coach invitation: Create coach-to-coach connection
          // Inviter is coach A, acceptor is coach B
          const coachAId = invitation.inviter_user_id
          const coachBId = sessionUser.id

          // Check if connection already exists (in either direction)
          const existingConnection = await tx
            .select()
            .from(coach_connections)
            .where(
              or(
                and(
                  eq(coach_connections.coach_a_id, coachAId),
                  eq(coach_connections.coach_b_id, coachBId)
                ),
                and(
                  eq(coach_connections.coach_a_id, coachBId),
                  eq(coach_connections.coach_b_id, coachAId)
                )
              )
            )
            .limit(1)

          if (existingConnection.length > 0) {
            // Connection exists - update it to active
            await tx
              .update(coach_connections)
              .set({
                status: 'active',
                updated_at: new Date(),
              })
              .where(eq(coach_connections.id, existingConnection[0].id))

            relationshipId = existingConnection[0].id
          } else {
            // Create new coach-to-coach connection
            const [newConnection] = await tx
              .insert(coach_connections)
              .values({
                coach_a_id: coachAId,
                coach_b_id: coachBId,
                status: 'active',
                connection_started_at: new Date(),
              })
              .returning()

            // Verify the insert succeeded
            if (!newConnection?.id) {
              logger.error('Failed to create coach connection - insert returned no result', {
                invitationId: invitation.id,
                coachAId,
                coachBId,
              })
              throw new Error('CONNECTION_CREATE_FAILED')
            }

            relationshipId = newConnection.id
          }
          relationshipType = 'coach_connection'

          // Update invitation status with coach_connection relationship
          await tx
            .update(coach_invitations)
            .set({
              status: 'accepted',
              accepted_at: new Date(),
              invitee_user_id: sessionUser.id,
              coach_connection_id: relationshipId,
              updated_at: new Date(),
            })
            .where(eq(coach_invitations.id, invitation.id))

          logger.info('Coach-to-coach connection created', {
            invitationId: invitation.id,
            coachAId,
            coachBId,
            connectionId: relationshipId,
          })
        }

        return { relationshipId, relationshipType }
      })
    } catch (txError) {
      // Transaction failed - all changes rolled back
      const errorMessage = txError instanceof Error ? txError.message : 'Unknown error'
      logger.error('Transaction failed during invitation acceptance', {
        invitationId: invitation.id,
        error: errorMessage,
      })

      // Return appropriate error based on what failed
      if (errorMessage === 'RELATIONSHIP_CREATE_FAILED') {
        return NextResponse.json(
          {
            success: false,
            error: 'RELATIONSHIP_CREATE_FAILED',
            message: 'Failed to create relationship',
          },
          { status: 500 }
        )
      }
      if (errorMessage === 'CONNECTION_CREATE_FAILED') {
        return NextResponse.json(
          {
            success: false,
            error: 'CONNECTION_CREATE_FAILED',
            message: 'Failed to create connection',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'TRANSACTION_FAILED', message: 'Failed to process invitation' },
        { status: 500 }
      )
    }

    const { relationshipId, relationshipType } = transactionResult

    logger.info('Invitation accepted', {
      invitationId: invitation.id,
      inviterUserId: invitation.inviter_user_id,
      inviteeUserId: sessionUser.id,
      relationshipId,
      relationshipType,
    })

    // Send confirmation email to the inviter (non-blocking - wrapped in try-catch)
    // If email fails, the acceptance still succeeded
    if (inviter) {
      try {
        const baseUrl = getBaseUrl()
        const acceptorName = sessionUser.name || sessionUser.email
        const inviterName = inviter.name || inviter.email

        // The inviter is always a coach, so dashboard is always /dashboard/coach
        const inviterDashboardUrl = `${baseUrl}/dashboard/coach`

        await sendEmail({
          to: inviter.email,
          subject: `${acceptorName} has accepted your invitation!`,
          html: generateInvitationAcceptedEmailHTML({
            inviterName,
            acceptorName,
            acceptorEmail: sessionUser.email,
            dashboardUrl: inviterDashboardUrl,
          }),
          text: generateInvitationAcceptedEmailText({
            inviterName,
            acceptorName,
            acceptorEmail: sessionUser.email,
            dashboardUrl: inviterDashboardUrl,
          }),
        })
      } catch (emailError) {
        // Log error but don't fail the request - email is non-critical
        logger.error('Failed to send acceptance confirmation email', {
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          invitationId: invitation.id,
        })
      }
    }

    // Determine redirect URL based on the invitation's invited_role
    // This ensures the user is redirected to the appropriate dashboard for their new role
    const redirectUrl =
      invitation.invited_role === 'coach' ? '/dashboard/coach' : '/dashboard/runner'

    return NextResponse.json({
      success: true,
      relationship: {
        id: relationshipId,
        type: relationshipType,
        inviterId: invitation.inviter_user_id,
        inviteeId: sessionUser.id,
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
