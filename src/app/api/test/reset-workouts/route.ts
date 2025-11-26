import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { user, workouts } from '@/lib/schema'

/**
 * Test-only API endpoint to reset workout data
 * Only available in test/development environment
 */
export async function POST(request: NextRequest) {
  // Only allow in test/development environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { userId, userEmail } = body

    let targetUserId = userId

    // If no userId provided, try to find user by email (more reliable for CI)
    if (!targetUserId && userEmail) {
      const foundUser = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, userEmail))
        .limit(1)

      if (foundUser.length > 0) {
        targetUserId = foundUser[0].id
      }
    }

    // Default to test user email if nothing provided
    if (!targetUserId && !userEmail) {
      const testUserEmail = 'alex.rivera@ultracoach.dev'
      const foundUser = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, testUserEmail))
        .limit(1)

      if (foundUser.length > 0) {
        targetUserId = foundUser[0].id
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Reset all workouts for this user to planned status
    const result = await db
      .update(workouts)
      .set({
        status: 'planned',
        actual_distance: null,
        actual_duration: null,
        intensity: null,
        workout_notes: null,
        injury_notes: null,
        updated_at: new Date(),
      })
      .where(eq(workouts.user_id, targetUserId))
      .returning({ id: workouts.id })

    // Get count of planned workouts
    const plannedWorkouts = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.user_id, targetUserId), eq(workouts.status, 'planned')))

    return NextResponse.json({
      success: true,
      resetCount: result.length,
      plannedCount: plannedWorkouts.length,
      message: `Reset ${result.length} workouts, ${plannedWorkouts.length} planned workouts available`,
    })
  } catch (error) {
    console.error('Error resetting workout data:', error)
    return NextResponse.json({ error: 'Failed to reset workout data' }, { status: 500 })
  }
}
