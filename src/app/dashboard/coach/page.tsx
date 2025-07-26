'use client'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import CoachDashboard from '@/components/dashboard/CoachDashboard'
import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { useSession } from '@/hooks/useBetterSession'

export default function CoachDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'coach') {
      router.push('/dashboard/runner')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!session || session.user.role !== 'coach') {
    return null
  }

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CoachDashboard />
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
