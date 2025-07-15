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
    
    // Fetch messages between the current user and the recipient
    const { data: rawMessages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${session.user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true })
    
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
    
    // Get workout IDs from messages for batch fetching
    const workoutIds = [...new Set(rawMessages?.filter(msg => msg.workout_id).map(msg => msg.workout_id) || [])]
    
    // Fetch workout data if any messages have workout context
    const workoutMap = new Map()
    if (workoutIds.length > 0) {
      const { data: workouts } = await supabaseAdmin
        .from('workouts')
        .select('id, date, planned_type, planned_distance, status, workout_notes')
        .in('id', workoutIds)
      
      workouts?.forEach(workout => workoutMap.set(workout.id, workout))
    }
    
    // Join messages with user data and workout context
    const messages = rawMessages?.map(msg => ({
      ...msg,
      sender: userMap.get(msg.sender_id),
      recipient: userMap.get(msg.recipient_id),
      workout: msg.workout_id ? workoutMap.get(msg.workout_id) : null
    })) || []
    
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('API error in GET /messages', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request)
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
      .select('*')
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
    const session = await getServerSession(request)
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