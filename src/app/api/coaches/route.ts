import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { coach_runners, user } from '@/lib/schema'
import type { CoachWithStats } from '@/types/api-responses'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // Check userType from the session
    if (sessionUser.userType !== 'runner') {
      return NextResponse.json({ error: 'Only runners can access coaches' }, { status: 403 })
    }

    // Get all coaches with active relationships to this runner
    const relationships = await db
      .select({
        coach_id: coach_runners.coach_id,
        status: coach_runners.status,
        created_at: coach_runners.created_at,
        coach: {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.userType, // Fix: use userType from database
          created_at: user.createdAt,
        },
      })
      .from(coach_runners)
      .innerJoin(user, eq(coach_runners.coach_id, user.id))
      .where(and(eq(coach_runners.runner_id, sessionUser.id), eq(coach_runners.status, 'active')))

    // Transform the data to include relationship context
    const coachesWithStats: CoachWithStats[] = relationships.map(rel => ({
      id: rel.coach.id,
      email: rel.coach.email,
      full_name: rel.coach.full_name,
      role: rel.coach.role,
      created_at: rel.coach.created_at?.toISOString() || '',
      relationship_status: rel.status,
      connected_at: rel.created_at?.toISOString() || null,
      // TODO: Add actual stats calculation in future enhancement
      stats: {
        trainingPlans: 0,
        completedWorkouts: 0,
        upcomingWorkouts: 0,
      },
    }))

    return NextResponse.json({ coaches: coachesWithStats })
  } catch (error) {
    console.error('API error in GET /coaches', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
