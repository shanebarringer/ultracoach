import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { coach_runners, user } from '@/lib/schema'
import { getServerSession } from '@/lib/server-auth'

interface RunnerWithStats {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  stats?: {
    trainingPlans: number
    completedWorkouts: number
    upcomingWorkouts: number
  }
  relationship_status: 'pending' | 'active' | 'inactive'
  connected_at: string | null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all runners with active relationships to this coach
    const relationships = await db
      .select({
        runner_id: coach_runners.runner_id,
        status: coach_runners.status,
        created_at: coach_runners.created_at,
        runner: {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          created_at: user.createdAt,
        },
      })
      .from(coach_runners)
      .innerJoin(user, eq(coach_runners.runner_id, user.id))
      .where(and(eq(coach_runners.coach_id, session.user.id), eq(coach_runners.status, 'active')))

    // Transform the data to include relationship context
    const runnersWithStats: RunnerWithStats[] = relationships.map(rel => ({
      id: rel.runner.id,
      email: rel.runner.email,
      full_name: rel.runner.full_name,
      role: rel.runner.role,
      created_at: rel.runner.created_at?.toISOString() || '',
      relationship_status: rel.status,
      connected_at: rel.created_at?.toISOString() || null,
      // TODO: Add actual stats calculation in future enhancement
      stats: {
        trainingPlans: 0,
        completedWorkouts: 0,
        upcomingWorkouts: 0,
      },
    }))

    return NextResponse.json({ runners: runnersWithStats })
  } catch (error) {
    console.error('API error in GET /runners', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
