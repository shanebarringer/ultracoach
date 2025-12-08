/**
 * Tours API Route
 *
 * GET: Fetch user's tour completion status
 * POST: Update tour via action parameter ('start', 'complete', 'reset')
 */
import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import type { TourId } from '@/lib/atoms/tours'
import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user_onboarding } from '@/lib/schema'

const logger = createLogger('api/tours')

/**
 * GET /api/tours
 * Fetch user's tour completion status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [userOnboarding] = await db
      .select({
        coachTourCompleted: user_onboarding.coach_tour_completed,
        runnerTourCompleted: user_onboarding.runner_tour_completed,
        lastTourStartedAt: user_onboarding.last_tour_started_at,
        lastTourCompletedAt: user_onboarding.last_tour_completed_at,
      })
      .from(user_onboarding)
      .where(eq(user_onboarding.user_id, session.user.id))

    if (!userOnboarding) {
      // Return default state if no onboarding record exists
      return NextResponse.json({
        coachTourCompleted: false,
        runnerTourCompleted: false,
        lastTourStartedAt: null,
        lastTourCompletedAt: null,
      })
    }

    return NextResponse.json(userOnboarding)
  } catch (error) {
    logger.error('Failed to fetch tour status', { error })
    return NextResponse.json({ error: 'Failed to fetch tour status' }, { status: 500 })
  }
}

/**
 * POST /api/tours
 * Update tour completion status
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Type guard and validate tourId
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const tourId = (body as Record<string, unknown>).tourId
    const action = (body as Record<string, unknown>).action

    const validTourIds = ['coach-onboarding', 'runner-onboarding'] as const
    if (!tourId || typeof tourId !== 'string' || !validTourIds.includes(tourId as TourId)) {
      return NextResponse.json({ error: 'Invalid tour ID' }, { status: 400 })
    }

    const validActions = ['complete', 'start', 'reset'] as const
    if (
      !action ||
      typeof action !== 'string' ||
      !validActions.includes(action as (typeof validActions)[number])
    ) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // After validation, narrow types for TypeScript
    const validatedTourId = tourId as TourId
    const validatedAction = action as (typeof validActions)[number]

    const now = new Date()

    // Check if user has onboarding record
    const [existingRecord] = await db
      .select()
      .from(user_onboarding)
      .where(eq(user_onboarding.user_id, session.user.id))

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Onboarding record not found. Complete onboarding first.' },
        { status: 404 }
      )
    }

    // Build update based on action and tour type
    const isCoachTour = validatedTourId === 'coach-onboarding'
    const updateData: Partial<typeof user_onboarding.$inferInsert> = {
      updated_at: now,
    }

    switch (validatedAction) {
      case 'start':
        updateData.last_tour_started_at = now
        break

      case 'complete':
        if (isCoachTour) {
          updateData.coach_tour_completed = true
        } else {
          updateData.runner_tour_completed = true
        }
        updateData.last_tour_completed_at = now
        break

      case 'reset':
        if (isCoachTour) {
          updateData.coach_tour_completed = false
        } else {
          updateData.runner_tour_completed = false
        }
        break
    }

    const [updated] = await db
      .update(user_onboarding)
      .set(updateData)
      .where(eq(user_onboarding.user_id, session.user.id))
      .returning({
        coachTourCompleted: user_onboarding.coach_tour_completed,
        runnerTourCompleted: user_onboarding.runner_tour_completed,
        lastTourStartedAt: user_onboarding.last_tour_started_at,
        lastTourCompletedAt: user_onboarding.last_tour_completed_at,
      })

    logger.info('Tour status updated', {
      userId: session.user.id,
      tourId: validatedTourId,
      action: validatedAction,
    })

    return NextResponse.json({
      success: true,
      tourState: updated,
    })
  } catch (error) {
    logger.error('Failed to update tour status', { error })
    return NextResponse.json({ error: 'Failed to update tour status' }, { status: 500 })
  }
}
