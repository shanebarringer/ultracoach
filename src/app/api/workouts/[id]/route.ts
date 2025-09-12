import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, notifications, training_plans, user, workouts } from '@/lib/schema'

const logger = createLogger('api-workouts-id')

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const { id: workoutId } = await params
    const {
      actualType,
      actualDistance,
      actualDuration,
      workoutNotes,
      injuryNotes,
      status,
      coachFeedback,
    } = await request.json()

    // Fetch the workout and related training plan
    const [workoutData] = await db
      .select({
        workout: {
          id: workouts.id,
          training_plan_id: workouts.training_plan_id,
          planned_type: workouts.planned_type,
          actual_type: workouts.actual_type,
          actual_distance: workouts.actual_distance,
          actual_duration: workouts.actual_duration,
          status: workouts.status,
        },
        plan: {
          id: training_plans.id,
          coach_id: training_plans.coach_id,
          runner_id: training_plans.runner_id,
        },
      })
      .from(workouts)
      .innerJoin(training_plans, eq(workouts.training_plan_id, training_plans.id))
      .where(eq(workouts.id, workoutId))
      .limit(1)

    if (!workoutData) {
      logger.warn('Workout not found', { workoutId, userId: sessionUser.id })
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    const { workout, plan } = workoutData

    // Verify the user has permission to update this workout
    const canUpdate =
      (sessionUser.userType === 'coach' && plan.coach_id === sessionUser.id) ||
      (sessionUser.userType === 'runner' && plan.runner_id === sessionUser.id)

    if (!canUpdate) {
      logger.warn('User attempted to update unauthorized workout', {
        workoutId,
        userId: sessionUser.id,
        userRole: sessionUser.userType,
        planCoachId: plan.coach_id,
        planRunnerId: plan.runner_id,
      })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify active coach-runner relationship
    const hasActiveRelationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          eq(coach_runners.coach_id, plan.coach_id),
          eq(coach_runners.runner_id, plan.runner_id),
          eq(coach_runners.status, 'active')
        )
      )
      .limit(1)

    if (hasActiveRelationship.length === 0) {
      logger.warn('Workout update attempted without active relationship', {
        workoutId,
        coachId: plan.coach_id,
        runnerId: plan.runner_id,
      })
      return NextResponse.json(
        { error: 'No active relationship found between coach and runner' },
        { status: 403 }
      )
    }
    // Prepare update data
    const updateData: Partial<{
      actual_type: string | null
      actual_distance: string | null
      actual_duration: number | null
      workout_notes: string | null
      injury_notes: string | null
      status: string
      coach_feedback: string | null
      updated_at: Date
    }> = {
      updated_at: new Date(),
    }

    if (sessionUser.userType === 'runner') {
      // Runners can update their workout logs
      if (actualType !== undefined) updateData.actual_type = actualType
      if (actualDistance !== undefined)
        updateData.actual_distance = actualDistance?.toString() || null
      if (actualDuration !== undefined) updateData.actual_duration = actualDuration
      if (workoutNotes !== undefined) updateData.workout_notes = workoutNotes
      if (injuryNotes !== undefined) updateData.injury_notes = injuryNotes
      if (status !== undefined) updateData.status = status as string
    } else {
      // Coaches can update feedback and modify planned workouts
      if (coachFeedback !== undefined) updateData.coach_feedback = coachFeedback
      if (actualType !== undefined) updateData.actual_type = actualType
      if (actualDistance !== undefined)
        updateData.actual_distance = actualDistance?.toString() || null
      if (actualDuration !== undefined) updateData.actual_duration = actualDuration
      if (workoutNotes !== undefined) updateData.workout_notes = workoutNotes
      if (injuryNotes !== undefined) updateData.injury_notes = injuryNotes
      if (status !== undefined) updateData.status = status as string
    }

    // Update the workout
    const [updatedWorkout] = await db
      .update(workouts)
      .set(updateData)
      .where(eq(workouts.id, workoutId))
      .returning()

    if (!updatedWorkout) {
      logger.error('Failed to update workout - no workout returned', { workoutId })
      return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
    }
    // Send notification to coach when runner completes workout
    if (sessionUser.userType === 'runner' && status === 'completed') {
      try {
        // Get coach and runner info
        const [coach] = await db
          .select({
            id: user.id,
            full_name: user.fullName,
          })
          .from(user)
          .where(eq(user.id, plan.coach_id))
          .limit(1)

        const [runner] = await db
          .select({
            full_name: user.fullName,
          })
          .from(user)
          .where(eq(user.id, sessionUser.id))
          .limit(1)

        if (coach && runner) {
          const workoutType = actualType || workout.planned_type
          const distance = actualDistance ? ` (${actualDistance} miles)` : ''

          await db.insert(notifications).values({
            user_id: coach.id,
            title: 'Workout Completed',
            message: `${runner.full_name || 'Runner'} completed their ${workoutType}${distance} workout.`,
            type: 'workout',
            read: false,
            created_at: new Date(),
          })

          logger.info('Workout completion notification sent', {
            workoutId,
            coachId: coach.id,
            runnerId: sessionUser.id,
          })
        }
      } catch (error) {
        logger.error('Failed to send workout completion notification', error)
        // Don't fail the main request if notification fails
      }
    }
    return NextResponse.json({ workout: updatedWorkout })
  } catch (error) {
    logger.error('API error in PATCH /workouts/[id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
