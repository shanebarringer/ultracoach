import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user } from '@/lib/schema'

const logger = createLogger('api-notification-preferences')

// Default notification preferences
const defaultPreferences = {
  messages: true,
  workouts: true,
  training_plans: true,
  races: true,
  reminders: true,
  toast_notifications: true,
  email_notifications: false, // Disabled by default to avoid spam
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // Get user's current notification preferences
    const userData = await db
      .select({
        notification_preferences: user.notification_preferences,
      })
      .from(user)
      .where(eq(user.id, sessionUser.id))
      .limit(1)

    const preferences = userData[0]?.notification_preferences || defaultPreferences

    return NextResponse.json({ preferences })
  } catch (error) {
    logger.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const { preferences } = await request.json()

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences format' }, { status: 400 })
    }

    // Merge with default preferences to ensure all keys exist
    const updatedPreferences = { ...defaultPreferences, ...preferences }

    // Update user's notification preferences
    await db
      .update(user)
      .set({
        notification_preferences: updatedPreferences,
      })
      .where(eq(user.id, sessionUser.id))

    logger.info('Updated notification preferences', {
      userId: sessionUser.id,
      preferences: updatedPreferences,
    })

    return NextResponse.json({ preferences: updatedPreferences })
  } catch (error) {
    logger.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
