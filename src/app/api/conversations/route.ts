import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Logger } from 'tslog'

const logger = new Logger({ name: 'conversations-api' })

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Get all messages involving the current user
    const { data: rawMessages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false })
    if (messagesError) {
      logger.error('Failed to fetch messages for conversations')
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }
    // Get all unique user IDs from messages
    const userIds = new Set<string>()
    rawMessages?.forEach(msg => {
      userIds.add(msg.sender_id)
      userIds.add(msg.recipient_id)
    })
    // Remove current user from the set
    userIds.delete(session.user.id)
    if (userIds.size === 0) {
      // No conversations exist - return empty list
      return NextResponse.json({ conversations: [] })
    }
    // Fetch user data for all conversation partners
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .in('id', Array.from(userIds))
    if (usersError) {
      logger.error('Failed to fetch user data for conversations')
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }
    // Create user lookup map
    const userMap = new Map()
    users?.forEach(user => userMap.set(user.id, user))
    // Group messages by conversation partner
    const conversationMap = new Map()
    rawMessages?.forEach(message => {
      const isCurrentUserSender = message.sender_id === session.user.id
      const partnerId = isCurrentUserSender ? message.recipient_id : message.sender_id
      const partner = userMap.get(partnerId)
      if (!partner) return // Skip if partner not found
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          user: partner,
          lastMessage: message,
          unreadCount: 0
        })
      }
      const conversation = conversationMap.get(partnerId)
      // Update last message if this message is more recent
      if (!conversation.lastMessage || 
          new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
        conversation.lastMessage = message
      }
      // Count unread messages (messages sent to current user that are unread)
      if (!isCurrentUserSender && !message.read) {
        conversation.unreadCount++
      }
    })
    // Convert to array and sort by last message time
    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0
        if (!a.lastMessage) return 1
        if (!b.lastMessage) return -1
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      })
    return NextResponse.json({ conversations })
  } catch {
    logger.error('API error in GET /conversations')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}