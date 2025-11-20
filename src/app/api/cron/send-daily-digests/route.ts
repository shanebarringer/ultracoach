/**
 * Daily Digest Email Cron Job
 *
 * Generates and sends daily digest emails to users who have enabled them.
 * Should run once per day (e.g., 7:00 AM in user's timezone).
 *
 * Example cron schedule:
 * - Daily at 7 AM UTC: 0 7 * * *
 * - Daily at 8 AM UTC: 0 8 * * *
 */
import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { queueEmail } from '@/lib/email/email-service'
import { EMAIL_TEMPLATES } from '@/lib/email/resend-client'
import { createLogger } from '@/lib/logger'
import { user, user_settings } from '@/lib/schema'

const logger = createLogger('CronDailyDigests')

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max execution

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Generating daily digest emails')

    // Find users with daily digest enabled
    const usersWithDigest = await db
      .select({ user: user, settings: user_settings })
      .from(user)
      .leftJoin(user_settings, eq(user.id, user_settings.user_id))
      .where(
        // This will need proper JSON filtering in production
        eq(user.email, user.email) // Placeholder - implement JSON filtering for notification_preferences
      )

    let queuedCount = 0

    for (const { user: userData, settings } of usersWithDigest) {
      // Check if user has email notifications enabled
      const notifPrefs = settings?.notification_preferences as {
        email_enabled?: boolean
        email_frequency?: string
        email_weekly_summary?: boolean
      } | null

      if (!notifPrefs?.email_enabled || notifPrefs?.email_frequency !== 'daily') {
        continue
      }

      try {
        // TODO: Fetch user's actual data (upcoming workouts, unread messages, etc.)
        // For now, use placeholder data
        const templateData = {
          recipientName: userData.name || 'Runner',
          date: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          upcomingWorkouts: [], // TODO: Fetch from workouts table
          unreadMessages: 0, // TODO: Fetch from messages table
          dashboardUrl: `${process.env.BETTER_AUTH_URL}/dashboard`,
        }

        await queueEmail({
          userId: userData.id,
          recipientEmail: userData.email,
          subject: `🏔️ Your Daily Summit Report - ${new Date().toLocaleDateString()}`,
          templateId: EMAIL_TEMPLATES.DAILY_DIGEST,
          templateData,
          priority: 3, // Medium priority
        })

        queuedCount++
      } catch (error) {
        logger.error(`Failed to queue digest for user ${userData.id}:`, error)
      }
    }

    logger.info(`Daily digests queued`, { count: queuedCount })

    return NextResponse.json({
      success: true,
      queuedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Daily digest cron failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
