import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search parameters
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const role = url.searchParams.get('role') // Optional: filter by role

    // Build the query
    let query = supabaseAdmin
      .from('better_auth_users')
      .select('id, email, name, role, full_name, created_at')
      .neq('id', session.user.id) // Exclude current user

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = search.trim()
      query = query.or(
        `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`
      )
    }

    // Apply role filter if provided
    if (role && (role === 'coach' || role === 'runner')) {
      query = query.eq('role', role)
    }

    // Limit results for performance
    query = query.limit(50).order('name', { ascending: true })

    const { data: users, error } = await query

    if (error) {
      console.error('Failed to fetch users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Format users for frontend consumption
    const formattedUsers =
      users?.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name || user.full_name || 'Unknown User',
        role: user.role || 'runner',
        full_name: user.full_name || user.name,
        created_at: user.created_at,
      })) || []

    return NextResponse.json({
      users: formattedUsers,
      total: formattedUsers.length,
    })
  } catch (error) {
    console.error('API error in GET /users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
