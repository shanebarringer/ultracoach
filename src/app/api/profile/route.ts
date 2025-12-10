import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import {
  certifications,
  coach_statistics,
  social_profiles,
  strava_connections,
  user_profiles,
} from '@/lib/schema'
import type { StravaAthleteData } from '@/types/profile'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('ProfileAPI')

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile (with fallback for missing table)
    let profile: (typeof user_profiles.$inferSelect)[] = []
    try {
      profile = await db
        .select()
        .from(user_profiles)
        .where(eq(user_profiles.user_id, session.user.id))
        .limit(1)
    } catch {
      logger.warn('user_profiles table not found, using empty profile')
    }

    // Get social profiles (with fallback for missing table)
    let socialProfiles: (typeof social_profiles.$inferSelect)[] = []
    try {
      socialProfiles = await db
        .select()
        .from(social_profiles)
        .where(eq(social_profiles.user_id, session.user.id))
    } catch {
      logger.warn('social_profiles table not found, using empty array')
    }

    // Get certifications (with fallback for missing table)
    let userCertifications: (typeof certifications.$inferSelect)[] = []
    try {
      userCertifications = await db
        .select()
        .from(certifications)
        .where(eq(certifications.user_id, session.user.id))
    } catch {
      logger.warn('certifications table not found, using empty array')
    }

    // Get coach statistics (if user is a coach, with fallback for missing table)
    let coachStats = null
    if (session.user.userType === 'coach') {
      try {
        const stats = await db
          .select()
          .from(coach_statistics)
          .where(eq(coach_statistics.user_id, session.user.id))
          .limit(1)

        coachStats = stats[0] || {
          total_athletes: 0,
          active_athletes: 0,
          average_rating: 0,
          total_reviews: 0,
          years_coaching: 0,
          success_stories: 0,
        }
      } catch {
        logger.warn('coach_statistics table not found, using default stats')
        coachStats = {
          total_athletes: 0,
          active_athletes: 0,
          average_rating: 0,
          total_reviews: 0,
          years_coaching: 0,
          success_stories: 0,
        }
      }
    }

    // Get Strava connection status (with fallback for missing table)
    let stravaConnection: (typeof strava_connections.$inferSelect)[] = []
    try {
      stravaConnection = await db
        .select()
        .from(strava_connections)
        .where(eq(strava_connections.user_id, session.user.id))
        .limit(1)
    } catch {
      logger.warn('strava_connections table not found, using empty array')
    }

    return NextResponse.json({
      profile: profile[0] || null,
      social_profiles: socialProfiles,
      certifications: userCertifications,
      coach_statistics: coachStats,
      strava_connected: stravaConnection.length > 0,
      strava_username: stravaConnection[0]
        ? (stravaConnection[0].athlete_data as StravaAthleteData)?.username || null
        : null,
    })
  } catch (error) {
    logger.error('Failed to fetch profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

const profileUpdateSchema = z.object({
  bio: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal('')),
  years_experience: z.number().int().min(0).max(100).optional(),
  specialties: z.array(z.string().max(100)).max(20).optional(),
  achievements: z.array(z.string().max(200)).max(50).optional(),
  availability_status: z.enum(['available', 'limited', 'unavailable']).optional(),
  hourly_rate: z.string().max(20).optional(),
  consultation_enabled: z.boolean().optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Validate input data
    let validatedData
    try {
      validatedData = profileUpdateSchema.parse(body)
    } catch (error) {
      logger.warn('Profile update validation failed:', error)
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: error instanceof z.ZodError ? error.issues : 'Validation failed',
        },
        { status: 400 }
      )
    }

    const {
      bio,
      location,
      website,
      years_experience,
      specialties,
      achievements,
      availability_status,
      hourly_rate,
      consultation_enabled,
    } = validatedData

    // Check if profile exists (with fallback for missing table)
    let existingProfile = []
    try {
      existingProfile = await db
        .select()
        .from(user_profiles)
        .where(eq(user_profiles.user_id, session.user.id))
        .limit(1)
    } catch {
      logger.warn('user_profiles table not found, skipping profile update')
      return NextResponse.json({
        message: 'Profile update skipped - table not found',
      })
    }

    const updateData = {
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(website !== undefined && { website }),
      ...(years_experience !== undefined && { years_experience }),
      ...(specialties !== undefined && { specialties }),
      ...(achievements !== undefined && { achievements }),
      ...(availability_status !== undefined && { availability_status }),
      ...(hourly_rate !== undefined && { hourly_rate }),
      ...(consultation_enabled !== undefined && { consultation_enabled }),
      updated_at: new Date(),
    }

    try {
      if (existingProfile.length > 0) {
        // Update existing profile
        await db
          .update(user_profiles)
          .set(updateData)
          .where(eq(user_profiles.user_id, session.user.id))
      } else {
        // Create new profile
        await db.insert(user_profiles).values({
          user_id: session.user.id,
          ...updateData,
        })
      }
    } catch (error) {
      logger.error('Failed to update user profile:', error)
      return NextResponse.json(
        { error: 'Failed to update profile - database error' },
        { status: 500 }
      )
    }

    logger.info('Profile updated successfully', {
      userId: session.user.id,
      fields: Object.keys(updateData),
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
    })
  } catch (error) {
    logger.error('Failed to update profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
