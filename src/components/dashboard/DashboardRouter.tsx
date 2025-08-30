'use client'

import CoachDashboard from '@/components/dashboard/CoachDashboard'
import RunnerDashboard from '@/components/dashboard/RunnerDashboard'
import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
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
 */
export default function DashboardRouter({ user }: Props) {
  logger.info('🔍 DashboardRouter DEBUG - Rendering dashboard for user:', {
    role: user.role,
    email: user.email,
    fullUser: JSON.stringify(user, null, 2),
  })

  // Handle invalid roles gracefully (should not happen with server-side validation)
  if (!user.role || (user.role !== 'coach' && user.role !== 'runner')) {
    logger.warn('Invalid user role received, showing fallback', { role: user.role })
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
          {user.role === 'coach' ? <CoachDashboard /> : <RunnerDashboard />}
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
