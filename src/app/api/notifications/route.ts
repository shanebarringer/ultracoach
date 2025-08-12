import { and, desc, eq, inArray } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { notifications as notificationsTable } from '@/lib/schema'
import { getServerSession } from '@/lib/server-auth'

const logger = createLogger('notifications-api')

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, limitParam)) : 50
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where = unreadOnly
      ? and(eq(notificationsTable.user_id, session.user.id), eq(notificationsTable.read, false))
      : eq(notificationsTable.user_id, session.user.id)

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(where)
      .orderBy(desc(notificationsTable.created_at))
      .limit(limit)

    const unreadCount = rows.filter(n => !n.read).length

    return NextResponse.json({
      notifications: rows,
      unreadCount,
      total: rows.length,
    })
  } catch (error) {
    logger.error('API error in GET /notifications', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, title, message, type } = await request.json()
    if (!userId || !title || !message) {
      return NextResponse.json(
        {
          error: 'User ID, title, and message are required',
        },
        { status: 400 }
      )
    }

    const [inserted] = await db
      .insert(notificationsTable)
      .values({
        user_id: userId,
        title,
        message,
        type: type || 'message',
      })
      .returning()

    return NextResponse.json({ notification: inserted }, { status: 201 })
  } catch (error) {
    logger.error('API error in POST /notifications', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(request)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationIds, read } = await request.json()

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        {
          error: 'Notification IDs must be a non-empty array',
        },
        { status: 400 }
      )
    }

    const res = await db
      .update(notificationsTable)
      .set({ read: read !== false })
      .where(
        and(
          inArray(notificationsTable.id, notificationIds),
          eq(notificationsTable.user_id, session.user.id)
        )
      )
      .returning({ id: notificationsTable.id })

    if (!res) {
      logger.error('Failed to update notifications')
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('API error in PATCH /notifications', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
