import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
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
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({ notifications: notifications || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, title, message, type, category, data } = await request.json()

    if (!userId || !title || !message) {
      return NextResponse.json({ 
        error: 'User ID, title, and message are required' 
      }, { status: 400 })
    }

    // Create notification
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        message,
        type: type || 'info',
        category: category || 'general',
        data: data || null
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationIds, read } = await request.json()

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ 
        error: 'Notification IDs must be an array' 
      }, { status: 400 })
    }

    // Update notifications (only user's own notifications)
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: read !== false }) // Default to true if not specified
      .in('id', notificationIds)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error updating notifications:', error)
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}