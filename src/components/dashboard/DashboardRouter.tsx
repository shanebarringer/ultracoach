'use client'

import CoachDashboard from '@/components/dashboard/CoachDashboard'
import RunnerDashboard from '@/components/dashboard/RunnerDashboard'
import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { useHydrateWorkouts } from '@/hooks/useWorkouts'
import { createLogger } from '@/lib/logger'
import type { ServerSession } from '@/utils/auth-server'

const logger = createLogger('DashboardRouter')

interface Props {
  user: ServerSession['user']
}

/**
 * Dashboard Router (Client Component)
 *
 * Receives authenticated user data from Server Component parents.
 * No authentication logic needed - user is guaranteed to exist and have correct role.
 * Suspense boundaries are handled by parent page components.
 */
export default function DashboardRouter({ user }: Props) {
  logger.info('🔍 DashboardRouter DEBUG - Rendering dashboard for user', {
    userType: user.userType,
  })

  // Hydrate workouts for the dashboard
  useHydrateWorkouts()

  // Handle invalid userType gracefully (should not happen with server-side validation)
  if (!user.userType || (user.userType !== 'coach' && user.userType !== 'runner')) {
    logger.warn('Invalid user userType received, showing fallback', { userType: user.userType })
    return (
      <Layout>
        <ModernErrorBoundary>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800">
                Your account role is not properly configured. Contact support if this issue
                persists. Showing runner dashboard as default.
              </p>
            </div>
            <RunnerDashboard />
          </div>
        </ModernErrorBoundary>
      </Layout>
    )
  }

  // Render the appropriate dashboard based on user role
  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {user.userType === 'coach' ? <CoachDashboard /> : <RunnerDashboard />}
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
