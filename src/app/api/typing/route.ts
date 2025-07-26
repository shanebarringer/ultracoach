import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get('recipientId')

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }

    // Check if recipient is typing to current user
    const { data: typingStatus, error } = await supabaseAdmin
      .from('typing_status')
      .select('is_typing, last_updated')
      .eq('user_id', recipientId)
      .eq('recipient_id', session.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error('Error fetching typing status:', error)
      return NextResponse.json({ error: 'Failed to fetch typing status' }, { status: 500 })
    }

    // Check if typing status is recent (within last 5 seconds)
    const isRecent =
      typingStatus?.last_updated &&
      new Date().getTime() - new Date(typingStatus.last_updated).getTime() < 5000

    return NextResponse.json({
      isTyping: (typingStatus?.is_typing && isRecent) || false,
    })
  } catch (error) {
    console.error('API error in GET /typing:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { recipientId, isTyping } = await request.json()
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }
    // Update or insert typing status
    const { error } = await supabaseAdmin.from('typing_status').upsert({
      user_id: session.user.id,
      recipient_id: recipientId,
      is_typing: isTyping,
      last_updated: new Date().toISOString(),
    })
    if (error) {
      console.error('Failed to update typing status', error)
      return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error in POST /typing', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
