import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { typing_status } from '@/lib/schema'
import { getServerSession } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get('recipientId')

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }

    // Check if recipient is typing to current user
    const typingStatusResult = await db
      .select({
        is_typing: typing_status.is_typing,
        last_updated: typing_status.last_updated,
      })
      .from(typing_status)
      .where(
        and(eq(typing_status.user_id, recipientId), eq(typing_status.recipient_id, session.user.id))
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
    console.error('API error in GET /typing:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { recipientId, isTyping } = await request.json()
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }
    // Update or insert typing status using upsert-like functionality
    await db
      .insert(typing_status)
      .values({
        user_id: session.user.id,
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
    console.error('API error in POST /typing', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
