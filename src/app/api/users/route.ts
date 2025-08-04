import { and, eq, ne } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import type { User } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { user } from '@/lib/schema'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as User

    // Get search parameters
    const url = new URL(request.url)
    // const search = url.searchParams.get('search') // Disabled for now
    const roleParam = url.searchParams.get('role') // Optional: filter by role

    // Build the base query - exclude current user
    const conditions = [ne(user.id, sessionUser.id)]

    // Apply search filter if provided - skip for now to fix TypeScript issues
    // if (search && search.trim()) {
    //   const searchTerm = `%${search.trim()}%`
    //   conditions.push(or(
    //     ilike(user.name, searchTerm),
    //     ilike(user.email, searchTerm)
    //   ))
    // }

    // Apply role filter if provided
    if (roleParam && (roleParam === 'coach' || roleParam === 'runner')) {
      conditions.push(eq(user.role, roleParam))
    }

    // Execute query with all conditions
    const users = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        fullName: user.fullName,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(and(...conditions))
      .limit(50)
      .orderBy(user.name)

    // Format users for frontend consumption
    const formattedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name || u.fullName || 'Unknown User',
      role: u.role || 'runner',
      full_name: u.fullName || u.name,
      created_at: u.createdAt,
    }))

    return NextResponse.json({
      users: formattedUsers,
      total: formattedUsers.length,
    })
  } catch (error) {
    console.error('API error in GET /users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
