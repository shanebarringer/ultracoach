import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = supabaseAdmin

    // Get all races for coaches, or races for specific runners
    let query = supabase.from('races').select('*').order('date', { ascending: true })

    if (session.user.role === 'coach') {
      // Coaches can see all races
      query = query.or(`created_by.eq.${session.user.id},created_by.is.null`)
    } else {
      // Runners can see races they're targeting in their training plans
      // First get the race IDs for this runner
      const { data: runnerPlans } = await supabase
        .from('training_plans')
        .select('race_id')
        .eq('runner_id', session.user.id)
        .not('race_id', 'is', null)

      const raceIds = runnerPlans?.map(plan => plan.race_id).filter(Boolean) || []

      if (raceIds.length > 0) {
        query = query.in('id', raceIds)
      } else {
        // No races found for this runner
        query = query.eq('id', 'no-races-found')
      }
    }

    const { data: races, error } = await query

    if (error) {
      console.error('Error fetching races:', error)
      return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 })
    }

    return NextResponse.json({ races })
  } catch (error) {
    console.error('Error in GET /api/races:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request)

    if (!session || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      name,
      date,
      distance_miles,
      distance_type,
      location,
      elevation_gain_feet,
      terrain_type,
      website_url,
      notes,
    } = await request.json()

    if (!name || !date || !distance_miles || !distance_type || !location || !terrain_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = supabaseAdmin

    const { data: race, error } = await supabase
      .from('races')
      .insert({
        name,
        date,
        distance_miles,
        distance_type,
        location,
        elevation_gain_feet: elevation_gain_feet || 0,
        terrain_type,
        website_url: website_url || null,
        notes: notes || null,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating race:', error)
      return NextResponse.json({ error: 'Failed to create race' }, { status: 500 })
    }

    return NextResponse.json({ race }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/races:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
