/**
 * Product Tour API Routes
 *
 * GET: Fetch user's tour completion status
 * POST: Update tour completion status
 * PATCH: Reset tour for re-taking
 */
import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user_onboarding } from '@/lib/schema'

const logger = createLogger('api/tours')

type TourId = 'coach-onboarding' | 'runner-onboarding'

interface TourUpdateRequest {
  tourId: TourId
  action: 'complete' | 'start' | 'reset'
}

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

    const body = (await request.json()) as TourUpdateRequest
    const { tourId, action } = body

    if (!tourId || !['coach-onboarding', 'runner-onboarding'].includes(tourId)) {
      return NextResponse.json({ error: 'Invalid tour ID' }, { status: 400 })
    }

    if (!action || !['complete', 'start', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

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
    const isCoachTour = tourId === 'coach-onboarding'
    const updateData: Record<string, unknown> = {
      updated_at: now,
    }

    switch (action) {
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
      tourId,
      action,
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
