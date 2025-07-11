import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Logger } from 'tslog'

const logger = new Logger({ name: 'messages-api' })

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get('recipientId')
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }
    // Fetch messages between the current user and the recipient
    const { data: rawMessages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${session.user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true })
    if (messagesError) {
      logger.error('Failed to fetch messages')
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
    // Fetch user data for all unique sender/recipient IDs
    const userIds = new Set<string>()
    rawMessages?.forEach(msg => {
      userIds.add(msg.sender_id)
      userIds.add(msg.recipient_id)
    })
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .in('id', Array.from(userIds))
    if (usersError) {
      logger.error('Failed to fetch user data')
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }
    // Create user lookup map
    const userMap = new Map()
    users?.forEach(user => userMap.set(user.id, user))
    // Join messages with user data
    const messages = rawMessages?.map(msg => ({
      ...msg,
      sender: userMap.get(msg.sender_id),
      recipient: userMap.get(msg.recipient_id)
    })) || []
    return NextResponse.json({ messages })
  } catch {
    logger.error('API error in GET /messages')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { content, recipientId } = await request.json()
    if (!content || !recipientId) {
      return NextResponse.json({ 
        error: 'Content and recipient ID are required' 
      }, { status: 400 })
    }
    // Verify the recipient exists
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', recipientId)
      .single()
    if (recipientError || !recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }
    // Create the message
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert([
        {
          content: content.trim(),
          sender_id: session.user.id,
          recipient_id: recipientId,
          read: false
        }
      ])
      .select(`
        *,
        sender:sender_id(*),
        recipient:recipient_id(*)
      `)
      .single()
    if (messageError) {
      logger.error('Failed to send message')
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }
    return NextResponse.json({ message }, { status: 201 })
  } catch {
    logger.error('API error in POST /messages')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { messageIds, read } = await request.json()
    if (!Array.isArray(messageIds)) {
      return NextResponse.json({ 
        error: 'Message IDs must be an array' 
      }, { status: 400 })
    }
    // Update message read status (only for messages sent to the current user)
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ read })
      .in('id', messageIds)
      .eq('recipient_id', session.user.id)
    if (error) {
      logger.error('Failed to update messages')
      return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    logger.error('API error in PATCH /messages')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}