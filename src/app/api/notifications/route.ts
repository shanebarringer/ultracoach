import { NextRequest, NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'
import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

const logger = createLogger('notifications-api')

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))
    if (unreadOnly) {
      query = query.eq('read', false)
    }
    const { data: notifications, error } = await query
    if (error) {
      logger.error('Failed to fetch notifications', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Calculate unread count from the fetched notifications
    const unreadCount = (notifications || []).filter(n => !n.read).length

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount,
      total: notifications?.length || 0,
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
    // Create notification
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
          type: type || 'message',
        },
      ])
      .select()
      .single()
    if (error) {
      logger.error('Failed to create notification', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }
    return NextResponse.json({ notification }, { status: 201 })
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

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        {
          error: 'Notification IDs must be an array',
        },
        { status: 400 }
      )
    }

    // Update notifications (only user's own notifications)
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: read !== false }) // Default to true if not specified
      .in('id', notificationIds)
      .eq('user_id', session.user.id)

    if (error) {
      logger.error('Failed to update notifications', error)
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('API error in PATCH /notifications', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
