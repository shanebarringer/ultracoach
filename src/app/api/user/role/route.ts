import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { better_auth_users } from '@/lib/schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

const db = drizzle(pool)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Database now uses Better Auth IDs directly - only query better_auth_users table
    const betterAuthUser = await db
      .select({ role: better_auth_users.role })
      .from(better_auth_users)
      .where(eq(better_auth_users.id, userId))
      .limit(1)

    if (!betterAuthUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRole = betterAuthUser[0].role || 'runner'
    return NextResponse.json({ role: userRole })
  } catch (error) {
    console.error('Error fetching user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user from the session
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { role } = body

    if (!role || !['runner', 'coach'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (runner or coach)' },
        { status: 400 }
      )
    }

    // Update the user's role in the database
    await db
      .update(better_auth_users)
      .set({ role })
      .where(eq(better_auth_users.id, session.user.id))

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
