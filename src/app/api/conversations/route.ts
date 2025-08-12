import { and, desc, eq, or } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, messages, user } from '@/lib/schema'

const logger = createLogger('api-conversations')

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // First, get active relationships for the user to verify message permissions
    let activeRelationships: Array<{ coach_id: string; runner_id: string }> = []

    if (sessionUser.role === 'coach') {
      const relationships = await db
        .select({ coach_id: coach_runners.coach_id, runner_id: coach_runners.runner_id })
        .from(coach_runners)
        .where(and(eq(coach_runners.coach_id, sessionUser.id), eq(coach_runners.status, 'active')))
      activeRelationships = relationships
    } else {
      const relationships = await db
        .select({ coach_id: coach_runners.coach_id, runner_id: coach_runners.runner_id })
        .from(coach_runners)
        .where(and(eq(coach_runners.runner_id, sessionUser.id), eq(coach_runners.status, 'active')))
      activeRelationships = relationships
    }

    // Get authorized user IDs (users the current user can message)
    const authorizedUserIds = new Set<string>()
    activeRelationships.forEach(rel => {
      if (sessionUser.role === 'coach') {
        authorizedUserIds.add(rel.runner_id)
      } else {
        authorizedUserIds.add(rel.coach_id)
      }
    })

    if (authorizedUserIds.size === 0) {
      // No authorized conversations - return empty list
      return NextResponse.json({ conversations: [] })
    }

    // Get all messages involving the current user with authorized partners only
    const rawMessages = await db
      .select({
        id: messages.id,
        sender_id: messages.sender_id,
        recipient_id: messages.recipient_id,
        content: messages.content,
        read: messages.read,
        created_at: messages.created_at,
        workout_id: messages.workout_id,
        context_type: messages.context_type,
      })
      .from(messages)
      .where(
        or(
          and(
            eq(messages.sender_id, sessionUser.id),
            // Can only send messages to authorized users
            or(...Array.from(authorizedUserIds).map(id => eq(messages.recipient_id, id)))
          ),
          and(
            eq(messages.recipient_id, sessionUser.id),
            // Can only receive messages from authorized users
            or(...Array.from(authorizedUserIds).map(id => eq(messages.sender_id, id)))
          )
        )
      )
      .orderBy(desc(messages.created_at))

    // Get all unique user IDs from messages
    const userIdsInMessages = new Set<string>()
    rawMessages.forEach(msg => {
      userIdsInMessages.add(msg.sender_id)
      userIdsInMessages.add(msg.recipient_id)
    })
    // Remove current user from the set
    userIdsInMessages.delete(sessionUser.id)

    if (userIdsInMessages.size === 0) {
      // No conversations exist - return empty list
      return NextResponse.json({ conversations: [] })
    }

    // Fetch user data for all conversation partners
    const users = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
        role: user.userType, // Fix: use userType from database
        createdAt: user.createdAt,
      })
      .from(user)
      .where(or(...Array.from(userIdsInMessages).map(id => eq(user.id, id))))

    // Create user lookup map
    const userMap = new Map()
    users.forEach(u => userMap.set(u.id, u))

    // Group messages by conversation partner
    const conversationMap = new Map()
    rawMessages.forEach(message => {
      const isCurrentUserSender = message.sender_id === sessionUser.id
      const partnerId = isCurrentUserSender ? message.recipient_id : message.sender_id
      const partner = userMap.get(partnerId)
      if (!partner) return // Skip if partner not found

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          user: {
            ...partner,
            full_name: partner.fullName || partner.name || 'Unknown User',
          },
          lastMessage: message,
          unreadCount: 0,
        })
      }

      const conversation = conversationMap.get(partnerId)
      // Update last message if this message is more recent
      if (
        !conversation.lastMessage ||
        (message.created_at &&
          (!conversation.lastMessage.created_at ||
            new Date(message.created_at) > new Date(conversation.lastMessage.created_at)))
      ) {
        conversation.lastMessage = message
      }

      // Count unread messages (messages sent to current user that are unread)
      if (!isCurrentUserSender && !message.read) {
        conversation.unreadCount++
      }
    })

    // Convert to array and sort by last message time
    const conversations = Array.from(conversationMap.values()).sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0
      if (!a.lastMessage) return 1
      if (!b.lastMessage) return -1
      return (
        new Date(b.lastMessage.created_at || 0).getTime() -
        new Date(a.lastMessage.created_at || 0).getTime()
      )
    })

    logger.info('Fetched conversations successfully', {
      userId: sessionUser.id,
      userRole: sessionUser.role,
      conversationsCount: conversations.length,
      authorizedPartnersCount: authorizedUserIds.size,
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    logger.error('API error in GET /conversations', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
