/**
 * Coach Invitations API
 * POST /api/invitations - Create and send an invitation
 * GET /api/invitations - List invitations for authenticated user
 */
import { and, desc, eq, or } from 'drizzle-orm'
import { z } from 'zod'

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
import { coach_invitations, user } from '@/lib/schema'

const logger = createLogger('api-invitations')

// Validation schema for creating an invitation
const createInvitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['runner', 'coach']).default('runner'),
  message: z.string().max(500, 'Message must be 500 characters or less').optional(),
  expirationDays: z
    .number()
    .min(1)
    .max(INVITATION_CONFIG.MAX_EXPIRATION_DAYS)
    .default(INVITATION_CONFIG.DEFAULT_EXPIRATION_DAYS),
})

/**
 * POST /api/invitations - Create and send an invitation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // Only coaches can send invitations
    if (sessionUser.userType !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can send invitations' }, { status: 403 })
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }
    const parseResult = createInvitationSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: parseResult.error.issues[0]?.message || 'Invalid input',
          details: parseResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { email, role, message, expirationDays } = parseResult.data

    // Prevent coaches from inviting themselves
    if (email.toLowerCase() === sessionUser.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'SELF_INVITATION', message: 'You cannot invite yourself' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation for this email from this coach
    const existingInvitation = await db
      .select()
      .from(coach_invitations)
      .where(
        and(
          eq(coach_invitations.inviter_user_id, sessionUser.id),
          eq(coach_invitations.invitee_email, email.toLowerCase()),
          eq(coach_invitations.status, 'pending')
        )
      )
      .limit(1)

    if (existingInvitation.length > 0) {
      return NextResponse.json(
        {
          error: 'ALREADY_INVITED',
          message:
            'An active invitation already exists for this email. You can resend it if needed.',
          invitationId: existingInvitation[0].id,
        },
        { status: 409 }
      )
    }

    // Check if the user already exists and has a relationship with this coach
    const existingUser = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1)

    // If user exists, suggest creating a relationship directly instead
    if (existingUser.length > 0) {
      logger.info('User already exists for invitation email', {
        inviterUserId: sessionUser.id,
      })
      // We still allow invitation - they can accept to create the relationship
    }

    // Generate secure token
    const { token, tokenHash, expiresAt } = generateInvitationToken(expirationDays)

    // Create invitation record
    // SECURITY: Only store the token hash, not the raw token
    // The raw token is sent in the email but never persisted to the database
    const [newInvitation] = await db
      .insert(coach_invitations)
      .values({
        inviter_user_id: sessionUser.id,
        invitee_email: email.toLowerCase(),
        invited_role: role,
        personal_message: message || null,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
      })
      .returning()

    logger.info('Invitation created', {
      invitationId: newInvitation.id,
      inviterUserId: sessionUser.id,
      invitedRole: role,
      expiresAt: expiresAt.toISOString(),
    })

    // Build URLs for the email
    const acceptUrl = buildInvitationUrl(token)
    const declineUrl = buildDeclineUrl(token)

    // Send invitation email
    const emailResult = await sendEmail({
      to: email,
      subject: `${sessionUser.name || sessionUser.email} invites you to train with UltraCoach`,
      html: generateInvitationEmailHTML({
        inviterName: sessionUser.name || sessionUser.email,
        inviterEmail: sessionUser.email,
        invitedRole: role,
        personalMessage: message,
        acceptUrl,
        declineUrl,
        expiresAt,
      }),
      text: generateInvitationEmailText({
        inviterName: sessionUser.name || sessionUser.email,
        inviterEmail: sessionUser.email,
        invitedRole: role,
        personalMessage: message,
        acceptUrl,
        declineUrl,
        expiresAt,
      }),
    })

    // Track email send status for response
    const emailSentSuccessfully = emailResult.success

    if (!emailSentSuccessfully) {
      logger.warn('Failed to send invitation email - invitation created but email failed', {
        invitationId: newInvitation.id,
        error: emailResult.error,
      })
    }

    // Return consistent response shape matching GET endpoint format
    // Include emailWarning when email fails so UI can notify user
    return NextResponse.json(
      {
        success: true,
        invitation: {
          id: newInvitation.id,
          inviteeEmail: newInvitation.invitee_email,
          invitedRole: newInvitation.invited_role,
          personalMessage: newInvitation.personal_message,
          status: newInvitation.status,
          createdAt: newInvitation.created_at,
          expiresAt: newInvitation.expires_at,
          acceptedAt: null,
          declinedAt: null,
          resendCount: newInvitation.resend_count,
          lastResentAt: newInvitation.last_resent_at,
          isSent: true,
          isReceived: false,
          inviter: {
            id: sessionUser.id,
            name: sessionUser.name,
            email: sessionUser.email,
          },
          isExpired: false,
        },
        emailSent: emailSentSuccessfully,
        // Warn caller when email fails so they know to use resend
        ...(emailSentSuccessfully
          ? {}
          : {
              emailWarning:
                'Invitation created but email delivery failed. Use resend to try again.',
            }),
      },
      { status: 201 }
    )
  } catch (error) {
    // Handle Postgres unique constraint violation (race condition on duplicate invite)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        {
          error: 'ALREADY_INVITED',
          message: 'An invitation for this email already exists',
        },
        { status: 409 }
      )
    }
    logger.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

/**
 * GET /api/invitations - List invitations for authenticated user
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
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const typeParam = searchParams.get('type') // 'sent' or 'received'

    // Validate type parameter if provided
    const validTypes = ['sent', 'received'] as const
    type InvitationType = (typeof validTypes)[number]
    let type: InvitationType | null = null

    if (typeParam) {
      if (!validTypes.includes(typeParam as InvitationType)) {
        return NextResponse.json(
          {
            error: 'INVALID_TYPE',
            message: `Invalid type filter. Must be one of: ${validTypes.join(', ')}`,
          },
          { status: 400 }
        )
      }
      type = typeParam as InvitationType
    }

    // Validate status parameter if provided
    const validStatuses = ['pending', 'accepted', 'declined', 'expired', 'revoked'] as const
    type InvitationStatus = (typeof validStatuses)[number]
    let status: InvitationStatus | null = null

    if (statusParam) {
      if (!validStatuses.includes(statusParam as InvitationStatus)) {
        return NextResponse.json(
          {
            error: 'INVALID_STATUS',
            message: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`,
          },
          { status: 400 }
        )
      }
      status = statusParam as InvitationStatus
    }

    logger.debug('Fetching invitations', {
      userId: sessionUser.id,
      statusFilter: status,
      typeFilter: type,
    })

    // Build conditions based on type filter
    // Initialize with default: all invitations for this user (sent or received)
    const sentCondition = eq(coach_invitations.inviter_user_id, sessionUser.id)
    const receivedCondition = eq(coach_invitations.invitee_email, sessionUser.email.toLowerCase())
    let conditions = or(sentCondition, receivedCondition)

    if (type === 'sent') {
      // Invitations sent by this user (as coach)
      conditions = status
        ? and(
            eq(coach_invitations.inviter_user_id, sessionUser.id),
            eq(coach_invitations.status, status)
          )
        : eq(coach_invitations.inviter_user_id, sessionUser.id)
    } else if (type === 'received') {
      // Invitations received by this user (by email)
      conditions = status
        ? and(
            eq(coach_invitations.invitee_email, sessionUser.email.toLowerCase()),
            eq(coach_invitations.status, status)
          )
        : eq(coach_invitations.invitee_email, sessionUser.email.toLowerCase())
    } else if (status) {
      // No type filter but status filter - apply to default conditions
      conditions = and(conditions, eq(coach_invitations.status, status))
    }

    // Fetch invitations with inviter info
    const invitations = await db
      .select({
        id: coach_invitations.id,
        inviteeEmail: coach_invitations.invitee_email,
        invitedRole: coach_invitations.invited_role,
        personalMessage: coach_invitations.personal_message,
        status: coach_invitations.status,
        createdAt: coach_invitations.created_at,
        expiresAt: coach_invitations.expires_at,
        acceptedAt: coach_invitations.accepted_at,
        declinedAt: coach_invitations.declined_at,
        resendCount: coach_invitations.resend_count,
        lastResentAt: coach_invitations.last_resent_at,
        // Inviter info
        inviterUserId: coach_invitations.inviter_user_id,
        inviterName: user.name,
        inviterEmail: user.email,
      })
      .from(coach_invitations)
      .innerJoin(user, eq(coach_invitations.inviter_user_id, user.id))
      .where(conditions)
      .orderBy(desc(coach_invitations.created_at))

    // Format invitations with additional computed fields
    const formattedInvitations = invitations.map(inv => ({
      id: inv.id,
      inviteeEmail: inv.inviteeEmail,
      invitedRole: inv.invitedRole,
      personalMessage: inv.personalMessage,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      declinedAt: inv.declinedAt,
      resendCount: inv.resendCount,
      lastResentAt: inv.lastResentAt,
      isSent: inv.inviterUserId === sessionUser.id,
      isReceived: inv.inviteeEmail.toLowerCase() === sessionUser.email.toLowerCase(),
      inviter: {
        id: inv.inviterUserId,
        name: inv.inviterName,
        email: inv.inviterEmail,
      },
      // Check if invitation is expired (safely handle null expiresAt)
      isExpired: inv.expiresAt
        ? new Date() > new Date(inv.expiresAt) && inv.status === 'pending'
        : false,
    }))

    logger.debug('Successfully fetched invitations', {
      count: formattedInvitations.length,
    })

    return NextResponse.json({ invitations: formattedInvitations })
  } catch (error) {
    logger.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }
}
