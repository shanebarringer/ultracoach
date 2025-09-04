import { and, eq, notExists } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners, user } from '@/lib/schema'

const logger = createLogger('api-runners-available')

// GET /api/runners/available - Get available runners for the authenticated coach
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // Only coaches can browse for runners - check userType
    if (sessionUser.userType !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can browse for runners' }, { status: 403 })
    }

    // Get all runners that the coach doesn't already have a relationship with
    const availableRunners = await db
      .select({
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(
        and(
          eq(user.userType, 'runner'),
          notExists(
            db
              .select()
              .from(coach_runners)
              .where(
                and(
                  eq(coach_runners.coach_id, sessionUser.id),
                  eq(coach_runners.runner_id, user.id)
                )
              )
          )
        )
      )

    return NextResponse.json({ runners: availableRunners })
  } catch (error) {
    logger.error('Error fetching available runners:', error)
    return NextResponse.json({ error: 'Failed to fetch available runners' }, { status: 500 })
  }
}
