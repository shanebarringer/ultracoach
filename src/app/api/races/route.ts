import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { races } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('RacesAPI')

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      // All users can see all races - both coaches and runners may want to browse races
      const raceResults = await db.select().from(races).orderBy(races.date)

      logger.info('Races fetched successfully', { count: raceResults.length })
      return NextResponse.json({ races: raceResults })
    } catch (error) {
      logger.error('Error fetching races:', error)
      return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 })
    }
  } catch (error) {
    logger.error('Error in GET /api/races:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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

    try {
      const [race] = await db
        .insert(races)
        .values({
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
        .returning()

      logger.info('Race created successfully', { raceId: race.id })
      return NextResponse.json({ race }, { status: 201 })
    } catch (error) {
      logger.error('Error creating race:', error)
      return NextResponse.json({ error: 'Failed to create race' }, { status: 500 })
    }
  } catch (error) {
    logger.error('Error in POST /api/races:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
