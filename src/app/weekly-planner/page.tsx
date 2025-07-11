'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import WeeklyPlannerCalendar from '@/components/workouts/WeeklyPlannerCalendar'
import type { User } from '@/lib/supabase'

export default function WeeklyPlannerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [runners, setRunners] = useState<User[]>([])
  const [selectedRunner, setSelectedRunner] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Get current week's Monday
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    return monday
  })

  const fetchRunners = useCallback(async () => {
    if (!session?.user?.id || session.user.role !== 'coach') return

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
  }, [session?.user?.id, session?.user?.role])

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'coach') {
      router.push('/dashboard')
      return
    }

    fetchRunners()
  }, [session, status, router, fetchRunners])

  const formatWeekRange = (monday: Date) => {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    return `${monday.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${sunday.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })}`
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    setCurrentWeek(monday)
  }

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Weekly Workout Planner</h1>
          <p className="text-gray-600 mt-1">
            Plan a full week of workouts for your runners
          </p>
        </div>

        {/* Runner Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Select Runner</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : runners.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No runners found. Create training plans to connect with runners.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {runners.map((runner) => (
                <button
                  key={runner.id}
                  onClick={() => setSelectedRunner(runner)}
                  className={`text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedRunner?.id === runner.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                      {runner.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{runner.full_name}</h3>
                      <p className="text-sm text-gray-500">{runner.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Week Navigation */}
        {selectedRunner && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Week of {formatWeekRange(currentWeek)}
              </h2>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={goToCurrentWeek}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  This Week
                </button>
                
                <button
                  onClick={() => navigateWeek('next')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Calendar */}
        {selectedRunner && (
          <WeeklyPlannerCalendar
            runner={selectedRunner}
            weekStart={currentWeek}
            onWeekUpdate={() => {
              // Refresh runner's data or show success message
              console.log('Week updated successfully!')
            }}
          />
        )}

        {!selectedRunner && !loading && runners.length > 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Select a runner to start planning</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose a runner from the list above to create their weekly workout plan.
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}