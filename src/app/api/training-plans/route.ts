import { and, eq, inArray } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, training_plans, user } from '@/lib/schema'

const logger = createLogger('api-training-plans')

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // First, get active relationships for the user
    let activeRelationships: Array<{ coach_id: string; runner_id: string }> = []

    if (sessionUser.userType === 'coach') {
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

    // If no active relationships, return empty array
    if (activeRelationships.length === 0) {
      return NextResponse.json({ trainingPlans: [] })
    }

    // Fetch training plans based on active relationships using Drizzle
    if (sessionUser.userType === 'coach') {
      // For coaches: get training plans for connected runners
      const runnerIds = activeRelationships.map(rel => rel.runner_id)

      const plans = await db
        .select({
          id: training_plans.id,
          title: training_plans.title,
          description: training_plans.description,
          coach_id: training_plans.coach_id,
          runner_id: training_plans.runner_id,
          target_race_date: training_plans.target_race_date,
          target_race_distance: training_plans.target_race_distance,
          created_at: training_plans.created_at,
          updated_at: training_plans.updated_at,
          // Include runner details
          runner_name: user.name,
          runner_full_name: user.fullName,
          runner_email: user.email,
        })
        .from(training_plans)
        .leftJoin(user, eq(training_plans.runner_id, user.id))
        .where(
          and(
            inArray(training_plans.runner_id, runnerIds),
            eq(training_plans.coach_id, sessionUser.id)
          )
        )
        .orderBy(training_plans.created_at)

      return NextResponse.json({ trainingPlans: plans })
    } else {
      // For runners: get training plans from connected coaches
      const coachIds = activeRelationships.map(rel => rel.coach_id)

      const plans = await db
        .select({
          id: training_plans.id,
          title: training_plans.title,
          description: training_plans.description,
          coach_id: training_plans.coach_id,
          runner_id: training_plans.runner_id,
          target_race_date: training_plans.target_race_date,
          target_race_distance: training_plans.target_race_distance,
          created_at: training_plans.created_at,
          updated_at: training_plans.updated_at,
          // Include coach details
          coach_name: user.name,
          coach_full_name: user.fullName,
          coach_email: user.email,
        })
        .from(training_plans)
        .leftJoin(user, eq(training_plans.coach_id, user.id))
        .where(
          and(
            inArray(training_plans.coach_id, coachIds),
            eq(training_plans.runner_id, sessionUser.id)
          )
        )
        .orderBy(training_plans.created_at)

      return NextResponse.json({ trainingPlans: plans })
    }
  } catch (error) {
    logger.error('Internal server error in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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

    if (sessionUser.userType !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can create training plans' }, { status: 403 })
    }

    const { title, description, runnerId, targetRaceDate, targetRaceDistance } =
      await request.json()

    if (!title || !runnerId) {
      return NextResponse.json({ error: 'Title and runner ID are required' }, { status: 400 })
    }

    // Verify the coach has an active relationship with this runner
    const activeRelationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          eq(coach_runners.coach_id, sessionUser.id),
          eq(coach_runners.runner_id, runnerId),
          eq(coach_runners.status, 'active')
        )
      )
      .limit(1)

    if (activeRelationship.length === 0) {
      return NextResponse.json(
        {
          error:
            'You can only create training plans for runners you have an active relationship with',
        },
        { status: 403 }
      )
    }

    // Create the training plan using Drizzle
    const [trainingPlan] = await db
      .insert(training_plans)
      .values({
        title,
        description,
        coach_id: sessionUser.id,
        runner_id: runnerId,
        target_race_date: targetRaceDate ? new Date(targetRaceDate) : null,
        target_race_distance: targetRaceDistance,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning()

    if (!trainingPlan) {
      logger.error('Failed to create training plan - no plan returned')
      return NextResponse.json({ error: 'Failed to create training plan' }, { status: 500 })
    }

    return NextResponse.json({ trainingPlan }, { status: 201 })
  } catch (error) {
    logger.error('Internal server error in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
