import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    // Fetch user details
    const { data: user, error } = await supabaseAdmin
      .from('better_auth_users')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !user) {
      console.error('Failed to fetch user', error)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({ user })
  } catch (error) {
    console.error('API error in GET /users/[id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
