import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, user } from '@/lib/schema'

const logger = createLogger('api-coach-runners')

// GET /api/coach-runners - Get relationships for the authenticated user
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
    const status = searchParams.get('status')

    logger.debug('Fetching relationships for user', {
      userId: sessionUser.id,
      userType: sessionUser.userType,
      statusFilter: status,
    })

    // We need to do two separate queries to get both coach and runner relationships
    // with proper user data for the "other party"

    // Build conditions based on status filter
    const coachConditions = status
      ? and(
          eq(coach_runners.coach_id, sessionUser.id),
          eq(coach_runners.status, status as 'pending' | 'active' | 'inactive')
        )
      : eq(coach_runners.coach_id, sessionUser.id)

    const runnerConditions = status
      ? and(
          eq(coach_runners.runner_id, sessionUser.id),
          eq(coach_runners.status, status as 'pending' | 'active' | 'inactive')
        )
      : eq(coach_runners.runner_id, sessionUser.id)

    // Query 1: Relationships where current user is a coach
    const finalCoachQuery = db
      .select({
        id: coach_runners.id,
        status: coach_runners.status,
        relationship_type: coach_runners.relationship_type,
        invited_by: coach_runners.invited_by,
        relationship_started_at: coach_runners.relationship_started_at,
        notes: coach_runners.notes,
        created_at: coach_runners.created_at,
        updated_at: coach_runners.updated_at,
        // Other party is the runner
        other_party_id: user.id,
        other_party_name: user.name,
        other_party_full_name: user.fullName,
        other_party_email: user.email,
        other_party_role: user.userType, // Fix: use userType from database
      })
      .from(coach_runners)
      .innerJoin(user, eq(coach_runners.runner_id, user.id))
      .where(coachConditions)

    // Query 2: Relationships where current user is a runner
    const finalRunnerQuery = db
      .select({
        id: coach_runners.id,
        status: coach_runners.status,
        relationship_type: coach_runners.relationship_type,
        invited_by: coach_runners.invited_by,
        relationship_started_at: coach_runners.relationship_started_at,
        notes: coach_runners.notes,
        created_at: coach_runners.created_at,
        updated_at: coach_runners.updated_at,
        // Other party is the coach
        other_party_id: user.id,
        other_party_name: user.name,
        other_party_full_name: user.fullName,
        other_party_email: user.email,
        other_party_role: user.userType, // Fix: use userType from database
      })
      .from(coach_runners)
      .innerJoin(user, eq(coach_runners.coach_id, user.id))
      .where(runnerConditions)

    const [coachRelationships, runnerRelationships] = await Promise.all([
      finalCoachQuery,
      finalRunnerQuery,
    ])

    // Combine and format the results with proper structure expected by frontend
    const allRelationships = [...coachRelationships, ...runnerRelationships]

    const formattedRelationships = allRelationships.map(rel => {
      // Determine if current user is coach or runner based on which query returned this relationship
      const isFromCoachQuery = coachRelationships.includes(rel as never)

      return {
        id: rel.id,
        status: rel.status,
        relationship_type: rel.relationship_type,
        // If from coach query, current user is coach; if from runner query, current user is runner
        is_coach: isFromCoachQuery,
        is_runner: !isFromCoachQuery,
        other_party: {
          id: rel.other_party_id,
          name: rel.other_party_name,
          full_name: rel.other_party_full_name,
          email: rel.other_party_email,
          role: rel.other_party_role,
        },
        invited_by: rel.invited_by,
        relationship_started_at: rel.relationship_started_at,
        notes: rel.notes,
        created_at: rel.created_at,
        updated_at: rel.updated_at,
      }
    })

    logger.debug('Successfully fetched relationships', {
      count: formattedRelationships.length,
      relationships: formattedRelationships.map(r => ({
        id: r.id,
        status: r.status,
        other_party_role: r.other_party.role,
        other_party_email: r.other_party.email,
      })),
    })

    return NextResponse.json({ relationships: formattedRelationships })
  } catch (error) {
    logger.error('Error fetching coach-runner relationships:', error)
    return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 })
  }
}

// POST /api/coach-runners - Create a new coach-runner relationship
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const body = await request.json()
    const { target_user_id, relationship_type = 'standard', notes } = body

    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 })
    }

    // Verify the target user exists
    const targetUser = await db.select().from(user).where(eq(user.id, target_user_id)).limit(1)

    if (targetUser.length === 0) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Determine coach and runner based on roles
    let coach_id: string
    let runner_id: string
    let invited_by: 'coach' | 'runner'

    if (sessionUser.userType === 'coach') {
      coach_id = sessionUser.id
      runner_id = target_user_id
      invited_by = 'coach'
    } else {
      coach_id = target_user_id
      runner_id = sessionUser.id
      invited_by = 'runner'
    }

    // Check if relationship already exists
    const existingRelationship = await db
      .select()
      .from(coach_runners)
      .where(and(eq(coach_runners.coach_id, coach_id), eq(coach_runners.runner_id, runner_id)))
      .limit(1)

    if (existingRelationship.length > 0) {
      return NextResponse.json({ error: 'Relationship already exists' }, { status: 409 })
    }

    // Create the relationship
    const newRelationship = await db
      .insert(coach_runners)
      .values({
        coach_id,
        runner_id,
        status: 'pending',
        relationship_type: relationship_type as 'standard' | 'invited',
        invited_by,
        notes,
      })
      .returning()

    return NextResponse.json({ relationship: newRelationship[0] }, { status: 201 })
  } catch (error) {
    logger.error('Error creating coach-runner relationship:', error)
    return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 })
  }
}
