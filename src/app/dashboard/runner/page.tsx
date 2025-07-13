'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import RunnerDashboard from '@/components/dashboard/RunnerDashboard'

export default function RunnerDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'runner') {
      router.push('/dashboard/coach')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || session.user.role !== 'runner') {
    return null
  }

  return (
    <DashboardLayout>
      <RunnerDashboard />
    </DashboardLayout>
  )
}
