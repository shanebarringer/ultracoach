import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = supabaseAdmin

    const { data: race, error } = await supabase.from('races').select('*').eq('id', id).single()

    if (error) {
      console.error('Error fetching race:', error)
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    // Check access permissions
    if (session.user.userType !== 'coach' && race.created_by !== session.user.id) {
      // Runners can only see races they're targeting
      const { data: planWithRace } = await supabase
        .from('training_plans')
        .select('id')
        .eq('runner_id', session.user.id)
        .eq('race_id', id)
        .single()

      if (!planWithRace) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({ race })
  } catch (error) {
    console.error('Error in GET /api/races/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(request)

    if (!session || session.user.userType !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
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

    // Check if race exists and user has permission
    const { data: existingRace, error: fetchError } = await supabase
      .from('races')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingRace) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (existingRace.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: race, error } = await supabase
      .from('races')
      .update({
        name,
        date,
        distance_miles,
        distance_type,
        location,
        elevation_gain_feet: elevation_gain_feet || 0,
        terrain_type,
        website_url: website_url || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating race:', error)
      return NextResponse.json({ error: 'Failed to update race' }, { status: 500 })
    }

    return NextResponse.json({ race })
  } catch (error) {
    console.error('Error in PUT /api/races/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(request)

    if (!session || session.user.userType !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = supabaseAdmin

    // Check if race exists and user has permission
    const { data: existingRace, error: fetchError } = await supabase
      .from('races')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingRace) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (existingRace.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if race is being used in training plans
    const { data: plansUsingRace, error: planError } = await supabase
      .from('training_plans')
      .select('id')
      .eq('race_id', id)
      .limit(1)

    if (planError) {
      console.error('Error checking training plans:', planError)
      return NextResponse.json({ error: 'Failed to check race usage' }, { status: 500 })
    }

    if (plansUsingRace && plansUsingRace.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete race that is being used in training plans',
        },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('races').delete().eq('id', id)

    if (error) {
      console.error('Error deleting race:', error)
      return NextResponse.json({ error: 'Failed to delete race' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/races/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
