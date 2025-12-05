import { z } from 'zod'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { races } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('RacesAPI')

/**
 * Zod schema for race creation validation
 * Validates types, formats, and ranges for all race fields
 *
 * Note: distance_miles accepts number and converts to string for Drizzle decimal type
 */
const CreateRaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  date: z
    .string()
    .min(1, 'Date is required')
    .refine(val => !isNaN(new Date(val).getTime()), { message: 'Invalid date format' }),
  distance_miles: z.number().positive('Distance must be positive'),
  distance_type: z.string().min(1, 'Distance type is required'),
  location: z.string().min(1, 'Location is required').max(500, 'Location too long'),
  elevation_gain_feet: z.number().int().nonnegative('Elevation cannot be negative').optional(),
  terrain_type: z.string().min(1, 'Terrain type is required'),
  website_url: z.string().url('Invalid URL format').optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
})

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
      return NextResponse.json(raceResults)
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

    // Parse JSON with error handling for malformed requests
    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      logger.error('Invalid JSON in request body:', error)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    // Validate request body with Zod schema
    const validation = CreateRaceSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('Race creation validation failed:', validation.error.flatten())
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
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
    } = validation.data

    try {
      const [race] = await db
        .insert(races)
        .values({
          name,
          date: new Date(date), // Convert ISO string to Date for Drizzle timestamp type
          distance_miles: String(distance_miles), // Convert to string for Drizzle decimal type
          distance_type,
          location,
          elevation_gain_feet: elevation_gain_feet ?? 0,
          terrain_type,
          website_url: website_url ?? null,
          notes: notes ?? null,
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
