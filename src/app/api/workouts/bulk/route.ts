import { and, eq, inArray } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, notifications, training_plans, user, workouts } from '@/lib/schema'

const logger = createLogger('api-workouts-bulk')

interface BulkWorkout {
  trainingPlanId: string
  date: string
  plannedType: string
  plannedDistance?: number | null
  plannedDuration?: number | null
  notes?: string
  category?:
    | 'easy'
    | 'tempo'
    | 'interval'
    | 'long_run'
    | 'race_simulation'
    | 'recovery'
    | 'strength'
    | 'cross_training'
    | 'rest'
    | null
  intensity?: number | null
  terrain?: 'road' | 'trail' | 'track' | 'treadmill' | null
  elevationGain?: number | null
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    if (sessionUser.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can create bulk workouts' }, { status: 403 })
    }

    const { workouts: workoutList }: { workouts: BulkWorkout[] } = await request.json()

    if (!workoutList || !Array.isArray(workoutList) || workoutList.length === 0) {
      return NextResponse.json({ error: 'No workouts provided' }, { status: 400 })
    }

    // Verify all training plans belong to this coach
    const trainingPlanIds = [...new Set(workoutList.map(w => w.trainingPlanId))]

    const trainingPlansData = await db
      .select({
        id: training_plans.id,
        coach_id: training_plans.coach_id,
        runner_id: training_plans.runner_id,
      })
      .from(training_plans)
      .where(inArray(training_plans.id, trainingPlanIds))

    if (trainingPlansData.length !== trainingPlanIds.length) {
      logger.warn('Some training plans not found', {
        requestedIds: trainingPlanIds,
        foundIds: trainingPlansData.map(p => p.id),
      })
      return NextResponse.json({ error: 'Some training plans not found' }, { status: 404 })
    }

    // Check if all plans belong to this coach
    const unauthorizedPlans = trainingPlansData.filter(plan => plan.coach_id !== sessionUser.id)
    if (unauthorizedPlans.length > 0) {
      logger.warn('Unauthorized bulk workout creation attempt', {
        coachId: sessionUser.id,
        unauthorizedPlanIds: unauthorizedPlans.map(p => p.id),
      })
      return NextResponse.json({ error: 'Unauthorized training plan access' }, { status: 403 })
    }

    // Verify active coach-runner relationships for all affected runners
    const runnerIds = [...new Set(trainingPlansData.map(p => p.runner_id))]
    const activeRelationships = await db
      .select({ runner_id: coach_runners.runner_id })
      .from(coach_runners)
      .where(
        and(
          eq(coach_runners.coach_id, sessionUser.id),
          inArray(coach_runners.runner_id, runnerIds),
          eq(coach_runners.status, 'active')
        )
      )

    const authorizedRunnerIds = new Set(activeRelationships.map(rel => rel.runner_id))
    const unauthorizedRunners = runnerIds.filter(id => !authorizedRunnerIds.has(id))

    if (unauthorizedRunners.length > 0) {
      logger.warn('Bulk workout creation attempted without active relationships', {
        coachId: sessionUser.id,
        unauthorizedRunnerIds: unauthorizedRunners,
      })
      return NextResponse.json(
        { error: 'No active relationships found with some runners' },
        { status: 403 }
      )
    }

    // Delete existing workouts for the same dates to avoid duplicates
    // const datesToClear = [...new Set(workoutList.map(w => w.date))]

    for (const planId of trainingPlanIds) {
      try {
        await db.delete(workouts).where(eq(workouts.training_plan_id, planId))
        // Note: Need to handle date filtering separately due to inArray with dates
      } catch (deleteError) {
        logger.error('Failed to clear existing workouts', deleteError)
        // Continue anyway - we'll handle duplicates at insert
      }
    }

    // Prepare workouts for insertion
    const workoutsToInsert = workoutList.map(workoutData => ({
      training_plan_id: workoutData.trainingPlanId,
      date: new Date(workoutData.date),
      planned_type: workoutData.plannedType,
      planned_distance: workoutData.plannedDistance?.toString() || null,
      planned_duration: workoutData.plannedDuration || null,
      workout_notes: workoutData.notes || null,
      status: 'planned' as const,
      // Enhanced workout fields
      category: workoutData.category || null,
      intensity: workoutData.intensity || null,
      terrain: workoutData.terrain || null,
      elevation_gain: workoutData.elevationGain || null,
      created_at: new Date(),
      updated_at: new Date(),
    }))

    // Bulk insert workouts
    const insertedWorkouts = await db.insert(workouts).values(workoutsToInsert).returning()

    if (!insertedWorkouts || insertedWorkouts.length === 0) {
      logger.error('Failed to create workouts - no workouts returned')
      return NextResponse.json({ error: 'Failed to create workouts' }, { status: 500 })
    }

    // Send notification to runner about new weekly plan
    if (insertedWorkouts && insertedWorkouts.length > 0) {
      try {
        // Get runner info from the training plan
        const firstPlan = trainingPlansData.find(plan => plan.id === workoutList[0].trainingPlanId)
        if (firstPlan) {
          const [runner] = await db
            .select({
              id: user.id,
              full_name: user.fullName,
            })
            .from(user)
            .where(eq(user.id, firstPlan.runner_id))
            .limit(1)

          if (runner) {
            // Get coach info
            const [coach] = await db
              .select({
                full_name: user.fullName,
              })
              .from(user)
              .where(eq(user.id, sessionUser.id))
              .limit(1)

            const coachName = coach?.full_name || 'Your coach'
            const workoutCount = insertedWorkouts.length

            await db.insert(notifications).values({
              user_id: runner.id,
              title: '⛰️ New Weekly Expedition Plan',
              message: `${coachName} has architected ${workoutCount} new summit ascents for your training expedition.`,
              type: 'workout',
              read: false,
              created_at: new Date(),
            })

            logger.info('Bulk workout notification sent', {
              coachId: sessionUser.id,
              runnerId: runner.id,
              workoutCount,
            })
          }
        }
      } catch (error) {
        logger.error('Failed to send notification for new weekly plan', error)
        // Don't fail the main request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      created: insertedWorkouts?.length || 0,
      workouts: insertedWorkouts,
    })
  } catch (error) {
    logger.error('API error in POST /workouts/bulk', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
