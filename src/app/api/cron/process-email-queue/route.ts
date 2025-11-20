/**
 * Email Queue Processing Cron Job
 *
 * Processes pending emails from the queue.
 * Should be called by a cron service (Vercel Cron or similar).
 *
 * Example cron schedule:
 * - Every 5 minutes: "0,5,10,15,20,25,30,35,40,45,50,55 * * * *"
 * - Every hour: "0 * * * *"
 */
import { NextRequest, NextResponse } from 'next/server'

import { processEmailQueue } from '@/lib/email/email-service'
import { createLogger } from '@/lib/logger'

const logger = createLogger('CronProcessEmailQueue')

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (prevents unauthorized calls)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Processing email queue via cron')

    // Process up to 50 emails per run
    const result = await processEmailQueue(50)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Cron email queue processing failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
