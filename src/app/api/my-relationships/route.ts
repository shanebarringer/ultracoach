import { eq, or } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { coach_runners, user } from '@/lib/schema'

// GET /api/my-relationships - Get relationships with full user details for the authenticated user
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

    // Get relationships with user details
    const query = db
      .select({
        // Relationship details
        id: coach_runners.id,
        status: coach_runners.status,
        relationship_type: coach_runners.relationship_type,
        invited_by: coach_runners.invited_by,
        relationship_started_at: coach_runners.relationship_started_at,
        notes: coach_runners.notes,
        created_at: coach_runners.created_at,
        updated_at: coach_runners.updated_at,

        // Coach details
        coach_id: coach_runners.coach_id,
        coach_name: user.name,
        coach_full_name: user.fullName,
        coach_email: user.email,

        // Runner details - we'll need a second join for this
        runner_id: coach_runners.runner_id,
      })
      .from(coach_runners)
      .innerJoin(user, eq(user.id, coach_runners.coach_id))
      .where(
        or(eq(coach_runners.coach_id, sessionUser.id), eq(coach_runners.runner_id, sessionUser.id))
      )

    const relationshipsWithCoach = await query

    // Now get runner details for each relationship
    const relationshipsWithDetails = await Promise.all(
      relationshipsWithCoach.map(async rel => {
        const runnerDetails = await db
          .select({
            name: user.name,
            fullName: user.fullName,
            email: user.email,
          })
          .from(user)
          .where(eq(user.id, rel.runner_id))
          .limit(1)

        return {
          ...rel,
          runner_name: runnerDetails[0]?.name,
          runner_full_name: runnerDetails[0]?.fullName,
          runner_email: runnerDetails[0]?.email,
          // Determine the user's perspective
          is_coach: sessionUser.id === rel.coach_id,
          is_runner: sessionUser.id === rel.runner_id,
          // Get the other party's details based on perspective
          other_party:
            sessionUser.id === rel.coach_id
              ? {
                  id: rel.runner_id,
                  name: runnerDetails[0]?.name,
                  full_name: runnerDetails[0]?.fullName,
                  email: runnerDetails[0]?.email,
                  role: 'runner' as const,
                }
              : {
                  id: rel.coach_id,
                  name: rel.coach_name,
                  full_name: rel.coach_full_name,
                  email: rel.coach_email,
                  role: 'coach' as const,
                },
        }
      })
    )

    // Filter by status if provided
    const filteredRelationships = status
      ? relationshipsWithDetails.filter(rel => rel.status === status)
      : relationshipsWithDetails

    return NextResponse.json({ relationships: filteredRelationships })
  } catch (error) {
    console.error('Error fetching user relationships:', error)
    return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 })
  }
}
