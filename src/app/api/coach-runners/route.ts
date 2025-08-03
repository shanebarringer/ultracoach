import { and, eq, or } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { coach_runners, user } from '@/lib/schema'

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

    // Build query to get relationships where user is either coach or runner
    const baseQuery = db
      .select({
        id: coach_runners.id,
        coach_id: coach_runners.coach_id,
        runner_id: coach_runners.runner_id,
        status: coach_runners.status,
        relationship_type: coach_runners.relationship_type,
        invited_by: coach_runners.invited_by,
        relationship_started_at: coach_runners.relationship_started_at,
        notes: coach_runners.notes,
        created_at: coach_runners.created_at,
        updated_at: coach_runners.updated_at,
      })
      .from(coach_runners)

    let query = baseQuery.where(
      or(eq(coach_runners.coach_id, sessionUser.id), eq(coach_runners.runner_id, sessionUser.id))
    )

    // Add status filter if provided
    if (status) {
      query = baseQuery.where(
        and(
          or(
            eq(coach_runners.coach_id, sessionUser.id),
            eq(coach_runners.runner_id, sessionUser.id)
          ),
          eq(coach_runners.status, status as 'pending' | 'active' | 'inactive')
        )
      )
    }

    const relationships = await query

    return NextResponse.json({ relationships })
  } catch (error) {
    console.error('Error fetching coach-runner relationships:', error)
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

    if (sessionUser.role === 'coach') {
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
    console.error('Error creating coach-runner relationship:', error)
    return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 })
  }
}
