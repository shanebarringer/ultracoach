import { Redis } from '@upstash/redis'
import { sql } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const logger = createLogger('CronKeepAlive')

/**
 * Keep-alive cron endpoint to prevent database archival due to inactivity.
 *
 * Pings:
 * - Upstash Redis (free tier archives after 14 days of inactivity)
 * - Supabase PostgreSQL (keeps connection pool warm)
 *
 * Scheduled via Vercel Cron to run weekly.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret - fail closed if not configured
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Fail closed: reject if CRON_SECRET is not configured
  if (!cronSecret) {
    logger.error('CRON_SECRET is not set; refusing to serve keep-alive')
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 })
  }

  // Validate the bearer token (Vercel Cron sends CRON_SECRET as Authorization: Bearer <secret>)
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: {
    redis: { success: boolean; latency?: number; error?: string }
    supabase: { success: boolean; latency?: number; error?: string }
  } = {
    redis: { success: false },
    supabase: { success: false },
  }

  // Ping Upstash Redis
  const redisStart = Date.now()
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })

      // Simple PING command - keeps database active
      const pong = await redis.ping()
      results.redis = {
        success: pong === 'PONG',
        latency: Date.now() - redisStart,
      }
      logger.info('Redis keep-alive ping successful', { latency: results.redis.latency })
    } else {
      results.redis = { success: false, error: 'Redis credentials not configured' }
      logger.warn('Redis credentials not configured for keep-alive')
    }
  } catch (error) {
    results.redis = {
      success: false,
      latency: Date.now() - redisStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    logger.error('Redis keep-alive ping failed', { error })
  }

  // Ping Supabase PostgreSQL
  const supabaseStart = Date.now()
  try {
    // Simple query to keep connection warm
    await db.execute(sql`SELECT 1 as ping`)
    results.supabase = {
      success: true,
      latency: Date.now() - supabaseStart,
    }
    logger.info('Supabase keep-alive ping successful', { latency: results.supabase.latency })
  } catch (error) {
    results.supabase = {
      success: false,
      latency: Date.now() - supabaseStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    logger.error('Supabase keep-alive ping failed', { error })
  }

  const allSuccess = results.redis.success && results.supabase.success

  logger.info('Keep-alive cron completed', {
    success: allSuccess,
    redis: results.redis.success,
    supabase: results.supabase.success,
  })

  return NextResponse.json(
    {
      success: allSuccess,
      timestamp: new Date().toISOString(),
      results,
    },
    { status: allSuccess ? 200 : 207 } // 207 Multi-Status if partial success
  )
}
