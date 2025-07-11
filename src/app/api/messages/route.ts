import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get('recipientId')

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }

    // Fetch messages between the current user and the recipient
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:sender_id(*),
        recipient:recipient_id(*)
      `)
      .or(`
        and(sender_id.eq.${session.user.id},recipient_id.eq.${recipientId}),
        and(sender_id.eq.${recipientId},recipient_id.eq.${session.user.id})
      `)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, recipientId } = await request.json()

    if (!content || !recipientId) {
      return NextResponse.json({ 
        error: 'Content and recipient ID are required' 
      }, { status: 400 })
    }

    // Verify the recipient exists
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Create the message
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert([
        {
          content: content.trim(),
          sender_id: session.user.id,
          recipient_id: recipientId,
          read: false
        }
      ])
      .select(`
        *,
        sender:sender_id(*),
        recipient:recipient_id(*)
      `)
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageIds, read } = await request.json()

    if (!Array.isArray(messageIds)) {
      return NextResponse.json({ 
        error: 'Message IDs must be an array' 
      }, { status: 400 })
    }

    // Update message read status (only for messages sent to the current user)
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ read })
      .in('id', messageIds)
      .eq('recipient_id', session.user.id)

    if (error) {
      console.error('Error updating messages:', error)
      return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}