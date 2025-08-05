import { and, eq, or } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, messages } from '@/lib/schema'

const logger = createLogger('api-messages-mark-read')

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const { senderId, recipientId } = await request.json()

    if (!senderId || !recipientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the user is the recipient
    if (sessionUser.id !== recipientId) {
      return NextResponse.json({ error: 'Can only mark own messages as read' }, { status: 403 })
    }

    // Verify that the user has an active relationship with the sender
    const hasActiveRelationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          or(
            // Current user is coach, sender is runner
            and(eq(coach_runners.coach_id, sessionUser.id), eq(coach_runners.runner_id, senderId)),
            // Current user is runner, sender is coach
            and(eq(coach_runners.runner_id, sessionUser.id), eq(coach_runners.coach_id, senderId))
          ),
          eq(coach_runners.status, 'active')
        )
      )
      .limit(1)

    if (hasActiveRelationship.length === 0) {
      return NextResponse.json(
        { error: 'No active relationship found with this user' },
        { status: 403 }
      )
    }

    // Mark messages as read
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.sender_id, senderId),
          eq(messages.recipient_id, recipientId),
          eq(messages.read, false)
        )
      )

    logger.info('Marked messages as read successfully', {
      senderId,
      recipientId,
      userId: sessionUser.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('API error in PATCH /messages/mark-read', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
