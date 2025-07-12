'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/layout/Layout'
import type { User } from '@/lib/supabase'

interface RunnerWithStats extends User {
  stats: {
    trainingPlans: number
    completedWorkouts: number
    upcomingWorkouts: number
  }
}

export default function RunnersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [runners, setRunners] = useState<RunnerWithStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRunners = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/runners')
      
      if (!response.ok) {
        console.error('Failed to fetch runners:', response.statusText)
        return
      }

      const data = await response.json()
      setRunners(data.runners || [])
    } catch (error) {
      console.error('Error fetching runners:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

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

    fetchRunners()
  }, [session, status, router, fetchRunners])

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading runners...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!session || session.user.role !== 'coach') {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Runners</h1>
          <p className="text-gray-600">Manage and track your runners&apos; progress</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading runners...</p>
            </div>
          </div>
        ) : runners.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No runners yet</h3>
            <p className="text-gray-500 mb-6">You haven&apos;t created any training plans for runners yet.</p>
            <Link
              href="/training-plans"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Training Plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {runners.map((runner) => (
              <div
                key={runner.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                    {runner.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{runner.full_name}</h3>
                    <p className="text-sm text-gray-500">{runner.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{runner.stats.trainingPlans}</div>
                    <div className="text-xs text-gray-500">Training Plans</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{runner.stats.completedWorkouts}</div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{runner.stats.upcomingWorkouts}</div>
                    <div className="text-xs text-gray-500">Upcoming</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/chat/${runner.id}`}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors text-center"
                  >
                    Message
                  </Link>
                  <Link
                    href="/training-plans"
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    View Plans
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}