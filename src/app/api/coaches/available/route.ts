import { and, eq, notExists } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { coach_runners, user } from '@/lib/schema'

// GET /api/coaches/available - Get available coaches for the authenticated runner
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // Only runners can browse for coaches - use transformed session data
    if ((sessionUser as User & { role?: 'coach' | 'runner' }).role !== 'runner') {
      return NextResponse.json({ error: 'Only runners can browse for coaches' }, { status: 403 })
    }

    // Get all coaches that the runner doesn't already have a relationship with
    const availableCoaches = await db
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
          eq(user.userType, 'coach'),
          notExists(
            db
              .select()
              .from(coach_runners)
              .where(
                and(
                  eq(coach_runners.coach_id, user.id),
                  eq(coach_runners.runner_id, sessionUser.id)
                )
              )
          )
        )
      )

    return NextResponse.json({ coaches: availableCoaches })
  } catch (error) {
    console.error('Error fetching available coaches:', error)
    return NextResponse.json({ error: 'Failed to fetch available coaches' }, { status: 500 })
  }
}
