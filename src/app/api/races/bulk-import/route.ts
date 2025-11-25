import { and, ilike, or, sql } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import {
  addRateLimitHeaders,
  formatRetryAfter,
  raceBulkImportLimiter,
} from '@/lib/redis-rate-limiter'
import { races } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('RaceBulkImportAPI')

interface BulkImportRaceData {
  name: string
  date?: string
  location?: string
  distance_miles?: number
  distance_type?: string
  elevation_gain_feet?: number
  terrain_type?: string
  website_url?: string
  notes?: string
  source: 'gpx' | 'csv'
  gpx_data?: {
    tracks: Array<{
      name?: string
      points: Array<{
        lat: number
        lon: number
        ele?: number
        time?: string
      }>
    }>
    waypoints: Array<{
      name?: string
      lat: number
      lon: number
      ele?: number
      desc?: string
    }>
  }
}

interface BulkImportRequest {
  races: BulkImportRaceData[]
  skipDuplicateCheck?: boolean
}

type RaceRecord = typeof races.$inferSelect

interface ImportResult {
  success: boolean
  race?: RaceRecord
  error?: string
  isDuplicate?: boolean
  duplicateOf?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Apply rate limiting (stricter for bulk operations)
    const rateLimitResult = await raceBulkImportLimiter.check(session.user.id)
    if (!rateLimitResult.allowed) {
      const retryDisplay = formatRetryAfter(rateLimitResult.retryAfter)
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: `Too many bulk imports. Please try again in ${retryDisplay}.`,
          retryAfter: rateLimitResult.retryAfter, // Always in seconds for API consistency
        },
        { status: 429 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check request size to prevent memory exhaustion attacks
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      logger.warn('Bulk request payload too large', { contentLength, userId: session.user.id })
      return NextResponse.json(
        { error: 'Payload too large - maximum 50MB allowed per bulk import' },
        { status: 413 }
      )
    }

    const importRequest: BulkImportRequest = await request.json()

    if (
      !importRequest.races ||
      !Array.isArray(importRequest.races) ||
      importRequest.races.length === 0
    ) {
      return NextResponse.json({ error: 'No races provided for import' }, { status: 400 })
    }

    // Limit batch size to prevent overwhelming the database
    if (importRequest.races.length > 100) {
      return NextResponse.json(
        {
          error: 'Too many races - maximum 100 races per bulk import',
        },
        { status: 400 }
      )
    }

    logger.info('Starting bulk race import', {
      raceCount: importRequest.races.length,
      userId: session.user.id,
      skipDuplicateCheck: importRequest.skipDuplicateCheck,
    })

    const results: ImportResult[] = []
    const validRacesToInsert: Array<{
      name: string
      date: Date | null
      distance_miles: string
      distance_type: string
      location: string
      elevation_gain_feet: number
      terrain_type: string
      website_url: string | null
      notes: string | null
      created_by: string
    }> = []

    // Process and validate each race
    for (const importRace of importRequest.races) {
      try {
        // Validate required fields
        if (!importRace.name) {
          results.push({
            success: false,
            error: 'Race name is required',
          })
          continue
        }

        // Set defaults for missing fields
        const raceData = {
          name: importRace.name,
          date: importRace.date ? new Date(importRace.date) : null,
          distance_miles: String(importRace.distance_miles || 0),
          distance_type: importRace.distance_type || 'Custom',
          location: importRace.location || 'Unknown Location',
          elevation_gain_feet: importRace.elevation_gain_feet || 0,
          terrain_type: importRace.terrain_type || 'mixed',
          website_url: importRace.website_url || null,
          notes: importRace.notes || null,
          created_by: session.user.id,
        }

        // Validate data
        const distanceNum = parseFloat(raceData.distance_miles)
        if (distanceNum < 0) {
          results.push({
            success: false,
            error: 'Distance must be positive',
          })
          continue
        }

        if (raceData.elevation_gain_feet < 0) {
          results.push({
            success: false,
            error: 'Elevation gain must be positive',
          })
          continue
        }

        // Validate terrain type
        const validTerrainTypes = ['trail', 'mountain', 'road', 'mixed', 'desert', 'forest']
        if (!validTerrainTypes.includes(raceData.terrain_type)) {
          raceData.terrain_type = 'mixed'
        }

        // Validate distance type
        const validDistanceTypes = ['50K', '50M', '100K', '100M', 'Marathon', 'Custom']
        if (!validDistanceTypes.includes(raceData.distance_type)) {
          raceData.distance_type = 'Custom'
        }

        // Check for duplicates if not skipped
        if (!importRequest.skipDuplicateCheck) {
          const existingRaces = await db
            .select()
            .from(races)
            .where(
              and(
                ilike(races.name, `%${raceData.name.trim()}%`),
                or(
                  // Same location
                  raceData.location !== 'Unknown Location'
                    ? ilike(races.location, `%${raceData.location}%`)
                    : sql`false`,
                  // Similar distance (within 5 miles)
                  sql`ABS(CAST(${races.distance_miles} AS FLOAT) - ${distanceNum}) < 5`,
                  // Same date if provided
                  raceData.date ? sql`${races.date} = ${raceData.date}` : sql`false`
                )
              )
            )
            .limit(3)

          if (existingRaces.length > 0) {
            results.push({
              success: false,
              error: 'Duplicate race detected',
              isDuplicate: true,
              duplicateOf: existingRaces.map(r => r.name),
            })
            continue
          }
        }

        // Add to valid races for insertion
        validRacesToInsert.push(raceData)
        results.push({ success: true })
      } catch (error) {
        logger.error('Error processing race for bulk import:', error)
        results.push({
          success: false,
          error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }

    // Bulk insert all valid races in a single transaction
    let insertedRaces: RaceRecord[] = []
    if (validRacesToInsert.length > 0) {
      try {
        insertedRaces = await db.insert(races).values(validRacesToInsert).returning()

        logger.info('Bulk race import completed', {
          totalRequested: importRequest.races.length,
          successfulInserts: insertedRaces.length,
          duplicatesSkipped: results.filter(r => r.isDuplicate).length,
          errors: results.filter(r => !r.success && !r.isDuplicate).length,
          userId: session.user.id,
        })
      } catch (error) {
        logger.error('Database error during bulk insert:', error)
        return NextResponse.json(
          { error: 'Failed to save races to database', details: error },
          { status: 500 }
        )
      }
    }

    // Update results with inserted race data
    let insertedIndex = 0
    for (let i = 0; i < results.length; i++) {
      if (results[i].success && !results[i].isDuplicate) {
        results[i].race = insertedRaces[insertedIndex]
        insertedIndex++
      }
    }

    const summary = {
      totalRequested: importRequest.races.length,
      successful: results.filter(r => r.success).length,
      duplicates: results.filter(r => r.isDuplicate).length,
      errors: results.filter(r => !r.success && !r.isDuplicate).length,
    }

    const response = NextResponse.json(
      {
        summary,
        results,
        insertedRaces,
        message: `Bulk import completed: ${summary.successful} successful, ${summary.duplicates} duplicates skipped, ${summary.errors} errors`,
      },
      { status: 201 }
    )
    return addRateLimitHeaders(response, rateLimitResult)
  } catch (error) {
    logger.error('Error in POST /api/races/bulk-import:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
