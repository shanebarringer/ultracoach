import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { plan_templates } from '@/lib/schema'

const logger = createLogger('training-plans-templates-api')

export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching plan templates')

    // Get session for authorization
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      logger.warn('Unauthorized access to plan templates')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch public templates only for now
    const templates = await db
      .select({
        id: plan_templates.id,
        name: plan_templates.name,
        description: plan_templates.description,
        distance_category: plan_templates.distance_type,
        duration_weeks: plan_templates.duration_weeks,
        difficulty_level: plan_templates.difficulty_level,
        peak_weekly_miles: plan_templates.peak_weekly_miles,
        min_base_miles: plan_templates.min_base_miles,
        is_public: plan_templates.is_public,
        created_by: plan_templates.created_by,
      })
      .from(plan_templates)
      .where(eq(plan_templates.is_public, true))
      .orderBy(plan_templates.distance_type, plan_templates.difficulty_level)

    logger.info(`Found ${templates.length} plan templates`)

    return NextResponse.json({
      templates,
      success: true,
    })
  } catch (error) {
    logger.error('Failed to fetch plan templates:', error)
    return NextResponse.json({ error: 'Failed to fetch plan templates' }, { status: 500 })
  }
}
