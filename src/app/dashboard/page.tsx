import { redirect } from 'next/navigation'

import { createLogger } from '@/lib/logger'
import { requireAuth } from '@/utils/auth-server'

const logger = createLogger('DashboardPage')

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Dashboard Entry Point (Server Component)
 *
 * Universal dashboard route that redirects users to their role-specific dashboard.
 * This fixes the 404 issue when users navigate to /dashboard directly.
 */
export default async function DashboardPage() {
  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()

  // TEMPORARY DEBUG: Track dashboard routing decisions
  logger.info('🔍 DASHBOARD ROUTING ENHANCED:', {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    roleType: typeof session.user.role,
    isCoach: session.user.role === 'coach',
    isRunner: session.user.role === 'runner',
    willRedirectTo: session.user.role === 'coach' ? '/dashboard/coach' : '/dashboard/runner',
    timestamp: new Date().toISOString(),
    deployment: process.env.VERCEL_URL ? 'vercel' : 'local',
    nodeEnv: process.env.NODE_ENV,
  })

  // Redirect to role-specific dashboard
  if (session.user.role === 'coach') {
    redirect('/dashboard/coach')
  } else {
    redirect('/dashboard/runner')
  }
}
