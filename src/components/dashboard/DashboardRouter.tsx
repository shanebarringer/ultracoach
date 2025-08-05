'use client'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import CoachDashboard from '@/components/dashboard/CoachDashboard'
import RunnerDashboard from '@/components/dashboard/RunnerDashboard'
import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { useSession } from '@/hooks/useBetterSession'
import { createLogger } from '@/lib/logger'

const logger = createLogger('DashboardRouter')

export default function DashboardRouter() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      logger.info('No session found, redirecting to signin')
      router.push('/auth/signin')
      return
    }

    const userRole = session.user.role
    logger.info('User role detected:', { role: userRole, email: session.user.email })

    // Handle undefined or invalid roles by defaulting to runner
    if (!userRole || (userRole !== 'coach' && userRole !== 'runner')) {
      logger.warn('Invalid or missing user role, defaulting to runner', { role: userRole })
      // Don't redirect, just render runner dashboard as fallback
      return
    }

    // Only redirect if we're on the wrong dashboard for the user's role
    const currentPath = window.location.pathname

    if (userRole === 'coach' && currentPath === '/dashboard/runner') {
      logger.info('Coach user on runner dashboard, redirecting to coach dashboard')
      router.push('/dashboard/coach')
      return
    }

    if (userRole === 'runner' && currentPath === '/dashboard/coach') {
      logger.info('Runner user on coach dashboard, redirecting to runner dashboard')
      router.push('/dashboard/runner')
      return
    }
  }, [status, session, router]) // Include all dependencies as required by ESLint

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Redirecting to sign in...</div>
        </div>
      </Layout>
    )
  }

  const userRole = session.user.role

  // Handle invalid roles gracefully
  if (!userRole || (userRole !== 'coach' && userRole !== 'runner')) {
    logger.warn('Rendering runner dashboard as fallback for invalid role', { role: userRole })
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
          {userRole === 'coach' ? <CoachDashboard /> : <RunnerDashboard />}
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
