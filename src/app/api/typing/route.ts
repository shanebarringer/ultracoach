import { and, eq, or } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, typing_status } from '@/lib/schema'

const logger = createLogger('api-typing')

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
    const recipientId = searchParams.get('recipientId')

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }

    // SECURITY: Verify active relationship exists before allowing typing status access
    const relationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          or(
            and(
              eq(coach_runners.coach_id, sessionUser.id),
              eq(coach_runners.runner_id, recipientId)
            ),
            and(
              eq(coach_runners.runner_id, sessionUser.id),
              eq(coach_runners.coach_id, recipientId)
            )
          ),
          eq(coach_runners.status, 'active')
        )
      )
      .limit(1)

    if (!relationship[0]) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 403 })
    }

    // Check if recipient is typing to current user
    const typingStatusResult = await db
      .select({
        is_typing: typing_status.is_typing,
        last_updated: typing_status.last_updated,
      })
      .from(typing_status)
      .where(
        and(eq(typing_status.user_id, recipientId), eq(typing_status.recipient_id, sessionUser.id))
      )
      .limit(1)

    const typingStatusData = typingStatusResult[0] || null

    // Check if typing status is recent (within last 5 seconds)
    const isRecent =
      typingStatusData?.last_updated &&
      new Date().getTime() - new Date(typingStatusData.last_updated).getTime() < 5000

    return NextResponse.json({
      isTyping: (typingStatusData?.is_typing && isRecent) || false,
    })
  } catch (error) {
    logger.error('API error in GET /typing:', error)
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
    const { recipientId, isTyping } = await request.json()
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }

    // SECURITY: Verify active relationship exists before allowing typing status updates
    const relationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          or(
            and(
              eq(coach_runners.coach_id, sessionUser.id),
              eq(coach_runners.runner_id, recipientId)
            ),
            and(
              eq(coach_runners.runner_id, sessionUser.id),
              eq(coach_runners.coach_id, recipientId)
            )
          ),
          eq(coach_runners.status, 'active')
        )
      )
      .limit(1)

    if (!relationship[0]) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 403 })
    }

    // Update or insert typing status using upsert-like functionality
    await db
      .insert(typing_status)
      .values({
        user_id: sessionUser.id,
        recipient_id: recipientId,
        is_typing: isTyping,
        last_updated: new Date(),
      })
      .onConflictDoUpdate({
        target: [typing_status.user_id, typing_status.recipient_id],
        set: {
          is_typing: isTyping,
          last_updated: new Date(),
        },
      })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('API error in POST /typing', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
