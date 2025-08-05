import { and, eq, or } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { coach_runners } from '@/lib/schema'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// PUT /api/coach-runners/[id] - Update a coach-runner relationship
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    // Verify the relationship exists and user has permission to modify it
    const relationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          eq(coach_runners.id, id),
          or(
            eq(coach_runners.coach_id, sessionUser.id),
            eq(coach_runners.runner_id, sessionUser.id)
          )
        )
      )
      .limit(1)

    if (relationship.length === 0) {
      return NextResponse.json(
        { error: 'Relationship not found or access denied' },
        { status: 404 }
      )
    }

    // Update the relationship
    const updatedRelationship = await db
      .update(coach_runners)
      .set({
        status: status as 'pending' | 'active' | 'inactive',
        notes,
        updated_at: new Date(),
      })
      .where(eq(coach_runners.id, id))
      .returning()

    return NextResponse.json({ relationship: updatedRelationship[0] })
  } catch (error) {
    console.error('Error updating coach-runner relationship:', error)
    return NextResponse.json({ error: 'Failed to update relationship' }, { status: 500 })
  }
}

// DELETE /api/coach-runners/[id] - Delete a coach-runner relationship
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User
    const { id } = await params

    // Verify the relationship exists and user has permission to delete it
    const relationship = await db
      .select()
      .from(coach_runners)
      .where(
        and(
          eq(coach_runners.id, id),
          or(
            eq(coach_runners.coach_id, sessionUser.id),
            eq(coach_runners.runner_id, sessionUser.id)
          )
        )
      )
      .limit(1)

    if (relationship.length === 0) {
      return NextResponse.json(
        { error: 'Relationship not found or access denied' },
        { status: 404 }
      )
    }

    // Delete the relationship
    await db.delete(coach_runners).where(eq(coach_runners.id, id))

    return NextResponse.json({ message: 'Relationship deleted successfully' })
  } catch (error) {
    console.error('Error deleting coach-runner relationship:', error)
    return NextResponse.json({ error: 'Failed to delete relationship' }, { status: 500 })
  }
}
