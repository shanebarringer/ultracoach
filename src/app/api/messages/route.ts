import { and, asc, eq, or } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import {
  coach_runners,
  message_workout_links,
  messages,
  notifications,
  training_plans,
  user,
  workouts,
} from '@/lib/schema'

const logger = createLogger('api-messages')

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

    // Verify that the user has a relationship with the recipient (active or pending)
    const hasRelationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          or(
            // Current user is coach, recipient is runner
            and(
              eq(coach_runners.coach_id, sessionUser.id),
              eq(coach_runners.runner_id, recipientId)
            ),
            // Current user is runner, recipient is coach
            and(
              eq(coach_runners.runner_id, sessionUser.id),
              eq(coach_runners.coach_id, recipientId)
            )
          ),
          or(
            eq(coach_runners.status, 'active'),
            eq(coach_runners.status, 'pending') // Allow messages for pending relationships
          )
        )
      )
      .limit(1)

    if (hasRelationship.length === 0) {
      return NextResponse.json({ error: 'No relationship found with this user' }, { status: 403 })
    }

    // Fetch messages between the current user and the recipient
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
        conversation_id: messages.conversation_id,
      })
      .from(messages)
      .where(
        or(
          and(eq(messages.sender_id, sessionUser.id), eq(messages.recipient_id, recipientId)),
          and(eq(messages.sender_id, recipientId), eq(messages.recipient_id, sessionUser.id))
        )
      )
      .orderBy(asc(messages.created_at))

    // Fetch user data for all unique sender/recipient IDs
    const userIds = new Set<string>([sessionUser.id, recipientId])

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
      .where(or(...Array.from(userIds).map(id => eq(user.id, id))))

    // Create user lookup map
    const userMap = new Map()
    users.forEach(u => userMap.set(u.id, u))

    // Get workout IDs from messages for batch fetching
    const workoutIds = [
      ...new Set(rawMessages.filter(msg => msg.workout_id).map(msg => msg.workout_id!)),
    ]

    // Fetch workout data if any messages have workout context
    const workoutMap = new Map()
    if (workoutIds.length > 0) {
      const workoutData = await db
        .select({
          id: workouts.id,
          date: workouts.date,
          planned_type: workouts.planned_type,
          planned_distance: workouts.planned_distance,
          status: workouts.status,
          workout_notes: workouts.workout_notes,
        })
        .from(workouts)
        .where(or(...workoutIds.map(id => eq(workouts.id, id))))

      workoutData.forEach(workout => workoutMap.set(workout.id, workout))
    }

    // Join messages with user data and workout context
    const messagesWithData = rawMessages.map(msg => ({
      ...msg,
      sender: userMap.get(msg.sender_id),
      recipient: userMap.get(msg.recipient_id),
      workout: msg.workout_id ? workoutMap.get(msg.workout_id) : null,
    }))

    logger.info('Fetched messages successfully', {
      userId: sessionUser.id,
      recipientId,
      messageCount: messagesWithData.length,
    })

    return NextResponse.json({ messages: messagesWithData })
  } catch (error) {
    logger.error('API error in GET /messages', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Message POST request received', {
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      logger.error('No session found - unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const requestBody = await request.json()
    const { content, recipientId, workoutId, workoutLinks = [] } = requestBody

    logger.info('Message data validated', {
      hasContent: !!content,
      hasRecipient: !!recipientId,
      hasWorkoutId: !!workoutId,
      workoutLinksCount: workoutLinks.length,
      senderId: sessionUser.id,
    })

    if (!content || !recipientId) {
      logger.error('Missing required message fields')
      return NextResponse.json(
        {
          error: 'Content and recipient ID are required',
        },
        { status: 400 }
      )
    }

    // Verify that the user has an active relationship with the recipient
    logger.info('Checking coach-runner relationship')

    const hasRelationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          or(
            // Current user is coach, recipient is runner
            and(
              eq(coach_runners.coach_id, sessionUser.id),
              eq(coach_runners.runner_id, recipientId)
            ),
            // Current user is runner, recipient is coach
            and(
              eq(coach_runners.runner_id, sessionUser.id),
              eq(coach_runners.coach_id, recipientId)
            )
          ),
          or(
            eq(coach_runners.status, 'active'),
            eq(coach_runners.status, 'pending') // Allow messages for pending relationships
          )
        )
      )
      .limit(1)

    if (hasRelationship.length === 0) {
      logger.error('No coach-runner relationship found')
      return NextResponse.json({ error: 'No relationship found with this user' }, { status: 403 })
    }

    // Verify the recipient exists
    const recipient = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, recipientId))
      .limit(1)

    if (recipient.length === 0) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // If workoutId provided, verify user has access to that workout
    if (workoutId) {
      const workout = await db
        .select({
          id: workouts.id,
          training_plan_id: workouts.training_plan_id,
        })
        .from(workouts)
        .where(eq(workouts.id, workoutId))
        .limit(1)

      if (workout.length === 0) {
        return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
      }

      // Check access to workout - if it has a training plan, check through that; otherwise allow access
      let hasAccess = false

      if (workout[0].training_plan_id) {
        // Workout has a training plan - check access through the plan
        const trainingPlan = await db
          .select({
            coach_id: training_plans.coach_id,
            runner_id: training_plans.runner_id,
          })
          .from(training_plans)
          .where(eq(training_plans.id, workout[0].training_plan_id))
          .limit(1)

        if (trainingPlan.length === 0) {
          return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
        }

        hasAccess =
          trainingPlan[0].coach_id === sessionUser.id ||
          trainingPlan[0].runner_id === sessionUser.id
      } else {
        // Workout doesn't have a training plan - allow access for any authenticated user
        // In a more complex system, you might want to check if the user created the workout
        hasAccess = true
      }

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to workout' }, { status: 403 })
      }
    }

    // Create the message
    const [message] = await db
      .insert(messages)
      .values({
        content: content.trim(),
        sender_id: sessionUser.id,
        recipient_id: recipientId,
        workout_id: workoutId || null,
        read: false,
        created_at: new Date(),
      })
      .returning()

    if (!message) {
      logger.error('Failed to create message - no message returned')
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Create workout links if provided
    if (workoutLinks.length > 0) {
      const linksToInsert = workoutLinks.map((link: { workoutId: string; linkType?: string }) => ({
        message_id: message.id,
        workout_id: link.workoutId,
        link_type: link.linkType || 'reference',
      }))

      try {
        await db.insert(message_workout_links).values(linksToInsert)
      } catch (linksError) {
        logger.error('Failed to create workout links', linksError)
        // Don't fail the request, just log the error
      }
    }

    // Create notification for the recipient about the new message
    try {
      const senderData = await db
        .select({
          name: user.name,
          fullName: user.fullName,
          role: user.userType, // Fix: use userType from database
        })
        .from(user)
        .where(eq(user.id, sessionUser.id))
        .limit(1)

      const sender = senderData[0]
      const senderName = sender?.fullName || sender?.name || 'Someone'
      const senderRole = sender?.role || 'user'
      const roleEmoji = senderRole === 'coach' ? '🏔️' : '🏃'

      await db.insert(notifications).values({
        user_id: recipientId,
        type: 'message',
        title: `New message from ${roleEmoji} ${senderName}`,
        message: content.length > 100 ? content.substring(0, 100) + '...' : content,
        read: false,
        created_at: new Date(),
        data: {
          sender_id: sessionUser.id,
          message_id: message.id,
        },
      })

      logger.info('Notification created for new message', {
        recipientId,
        senderId: sessionUser.id,
        messageId: message.id,
      })
    } catch (notificationError) {
      logger.error('Failed to create notification for new message', notificationError)
      // Don't fail the message creation if notification fails
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    logger.error('API error in POST /messages', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const { messageIds, read } = await request.json()

    if (!Array.isArray(messageIds)) {
      return NextResponse.json(
        {
          error: 'Message IDs must be an array',
        },
        { status: 400 }
      )
    }

    // Update message read status (only for messages sent to the current user)
    await db
      .update(messages)
      .set({ read })
      .where(
        and(
          or(...messageIds.map(id => eq(messages.id, id))),
          eq(messages.recipient_id, sessionUser.id)
        )
      )

    logger.info('Updated message read status', {
      userId: sessionUser.id,
      messageIds,
      read,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('API error in PATCH /messages', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
