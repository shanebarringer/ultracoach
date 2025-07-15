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
    const workoutId = searchParams.get('workoutId')
    
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }
    
    // Build query for messages with workout context
    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        workout:workout_id(id, date, planned_type, planned_distance, status),
        workout_links:message_workout_links(
          workout_id,
          link_type,
          workout:workout_id(id, date, planned_type, planned_distance, status)
        )
      `)
      .or(`and(sender_id.eq.${session.user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true })
    
    // If filtering by specific workout
    if (workoutId) {
      query = query.or(`workout_id.eq.${workoutId},message_workout_links.workout_id.eq.${workoutId}`)
    }
    
    const { data: rawMessages, error: messagesError } = await query
    
    if (messagesError) {
      console.error('Failed to fetch messages', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
    
    // Fetch user data for all unique sender/recipient IDs
    const userIds = new Set<string>()
    rawMessages?.forEach(msg => {
      userIds.add(msg.sender_id)
      userIds.add(msg.recipient_id)
    })
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .in('id', Array.from(userIds))
    if (usersError) {
      console.error('Failed to fetch user data', usersError)
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }
    
    // Create user lookup map
    const userMap = new Map()
    users?.forEach(user => userMap.set(user.id, user))
    
    // Join messages with user data and format workout context
    const messages = rawMessages?.map(msg => ({
      ...msg,
      sender: userMap.get(msg.sender_id),
      recipient: userMap.get(msg.recipient_id),
      workoutContext: msg.workout || (msg.workout_links && msg.workout_links.length > 0 
        ? msg.workout_links.map((link: { workout: Record<string, unknown>; link_type: string }) => ({
            ...link.workout,
            linkType: link.link_type
          }))
        : null
      )
    })) || []
    
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('API error in GET /messages', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { 
      content, 
      recipientId, 
      workoutId, 
      contextType = 'general',
      workoutLinks = [] 
    } = await request.json()
    
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
    
    // If workoutId provided, verify user has access to that workout
    if (workoutId) {
      const { data: workout, error: workoutError } = await supabaseAdmin
        .from('workouts')
        .select(`
          id,
          training_plan_id
        `)
        .eq('id', workoutId)
        .single()
      
      if (workoutError || !workout) {
        return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
      }
      
      // Get the training plan to check access
      const { data: trainingPlan, error: planError } = await supabaseAdmin
        .from('training_plans')
        .select('coach_id, runner_id')
        .eq('id', workout.training_plan_id)
        .single()
      
      if (planError || !trainingPlan) {
        return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
      }
      
      const hasAccess = trainingPlan.coach_id === session.user.id || 
                       trainingPlan.runner_id === session.user.id
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to workout' }, { status: 403 })
      }
    }
    
    // Create the message
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert([
        {
          content: content.trim(),
          sender_id: session.user.id,
          recipient_id: recipientId,
          workout_id: workoutId || null,
          context_type: contextType,
          read: false
        }
      ])
      .select(`
        *,
        sender:sender_id(*),
        recipient:recipient_id(*),
        workout:workout_id(id, date, planned_type, planned_distance, status)
      `)
      .single()
      
    if (messageError) {
      console.error('Failed to send message', messageError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }
    
    // Create workout links if provided
    if (workoutLinks.length > 0) {
      const linksToInsert = workoutLinks.map((link: { workoutId: string; linkType?: string }) => ({
        message_id: message.id,
        workout_id: link.workoutId,
        link_type: link.linkType || 'reference'
      }))
      
      const { error: linksError } = await supabaseAdmin
        .from('message_workout_links')
        .insert(linksToInsert)
        
      if (linksError) {
        console.error('Failed to create workout links', linksError)
        // Don't fail the request, just log the error
      }
    }
    
    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('API error in POST /messages', error)
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
      console.error('Failed to update messages', error)
      return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error in PATCH /messages', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}