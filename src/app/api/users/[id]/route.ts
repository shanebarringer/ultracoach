import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Logger } from 'tslog'

const logger = new Logger({ name: 'users-id-api' })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    // Fetch user details
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !user) {
      logger.error('Failed to fetch user')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({ user })
  } catch {
    logger.error('API error in GET /users/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}