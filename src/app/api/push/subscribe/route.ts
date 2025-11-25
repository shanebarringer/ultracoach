/**
 * Push Notification Subscription API
 *
 * Manages web push notification subscriptions.
 * Allows users to subscribe/unsubscribe from push notifications.
 */
import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { push_subscriptions } from '@/lib/schema'

const logger = createLogger('api-push-subscribe')

/**
 * Subscribe to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const { endpoint, keys, deviceType, browser, userAgent } = await request.json()

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
    }

    // Check if subscription already exists
    const existing = await db
      .select()
      .from(push_subscriptions)
      .where(eq(push_subscriptions.endpoint, endpoint))
      .limit(1)

    if (existing.length > 0) {
      // Update existing subscription
      const [updated] = await db
        .update(push_subscriptions)
        .set({
          active: true,
          last_used_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(push_subscriptions.endpoint, endpoint))
        .returning()

      logger.info('Push subscription updated', {
        userId: sessionUser.id,
        endpoint: endpoint.substring(0, 50) + '...',
      })

      return NextResponse.json({ subscription: updated })
    }

    // Create new subscription
    const [subscription] = await db
      .insert(push_subscriptions)
      .values({
        user_id: sessionUser.id,
        endpoint,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        device_type: deviceType,
        browser,
        user_agent: userAgent || request.headers.get('user-agent') || 'unknown',
        active: true,
        last_used_at: new Date(),
      })
      .returning()

    logger.info('Push subscription created', {
      userId: sessionUser.id,
      endpoint: endpoint.substring(0, 50) + '...',
    })

    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    logger.error('Error subscribing to push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to push notifications' },
      { status: 500 }
    )
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })
    }

    // Deactivate subscription (don't delete in case user wants to re-subscribe)
    await db
      .update(push_subscriptions)
      .set({
        active: false,
        updated_at: new Date(),
      })
      .where(eq(push_subscriptions.endpoint, endpoint))

    logger.info('Push subscription deactivated', {
      userId: sessionUser.id,
      endpoint: endpoint.substring(0, 50) + '...',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error unsubscribing from push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    )
  }
}

/**
 * Get current push subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    const subscriptions = await db
      .select()
      .from(push_subscriptions)
      .where(eq(push_subscriptions.user_id, sessionUser.id))

    return NextResponse.json({ subscriptions })
  } catch (error) {
    logger.error('Error fetching push subscriptions:', error)
    return NextResponse.json({ error: 'Failed to fetch push subscriptions' }, { status: 500 })
  }
}
