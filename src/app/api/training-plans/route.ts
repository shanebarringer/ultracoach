import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role === 'coach') {
      const { data, error } = await supabaseAdmin
        .from('training_plans')
        .select('*, runners:runner_id(*)')
        .eq('coach_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Failed to fetch training plans for coach', error)
        return NextResponse.json({ error: 'Failed to fetch training plans' }, { status: 500 })
      }
      return NextResponse.json({ trainingPlans: data || [] })
    } else {
      const { data, error } = await supabaseAdmin
        .from('training_plans')
        .select('*, coaches:coach_id(*)')
        .eq('runner_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Failed to fetch training plans for runner', error)
        return NextResponse.json({ error: 'Failed to fetch training plans' }, { status: 500 })
      }
      return NextResponse.json({ trainingPlans: data || [] })
    }
  } catch (error) {
    console.error('Internal server error in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    if (!session?.user || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { title, description, runnerEmail, targetRaceDate, targetRaceDistance } = await request.json()
    if (!title || !runnerEmail) {
      return NextResponse.json({ error: 'Title and runner email are required' }, { status: 400 })
    }
    // Find the runner by email
    const { data: runner, error: runnerError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', runnerEmail)
      .eq('role', 'runner')
      .single()
    if (runnerError || !runner) {
      return NextResponse.json({ error: 'Runner not found with that email' }, { status: 404 })
    }
    // Create the training plan
    const { data: trainingPlan, error: planError } = await supabaseAdmin
      .from('training_plans')
      .insert([
        {
          title,
          description,
          coach_id: session.user.id,
          runner_id: runner.id,
          target_race_date: targetRaceDate || null,
          target_race_distance: targetRaceDistance || null,
        },
      ])
      .select()
      .single()
    if (planError) {
      console.error('Failed to create training plan', planError)
      return NextResponse.json({ error: 'Failed to create training plan' }, { status: 500 })
    }
    return NextResponse.json({ trainingPlan }, { status: 201 })
  } catch (error) {
    console.error('Internal server error in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}