'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import type { User } from '@/lib/supabase'
import WeeklyPlannerCalendar from '@/components/workouts/WeeklyPlannerCalendar'
import ProgressVisualization from '@/components/dashboard/ProgressVisualization'

// Function to get the start of the current week (Monday)
const getWeekStart = (date: Date) => {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(date.setDate(diff))
}

export default function RunnerDashboard() {
  const { data: session } = useSession()
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()))
  const [loading, setLoading] = useState(true)

  const handleWeekChange = (direction: 'next' | 'prev') => {
    setWeekStart(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
      return newDate
    })
  }

  useEffect(() => {
    if (session?.user) {
      setLoading(false)
    }
  }, [session])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {session?.user && (
            <WeeklyPlannerCalendar 
              runner={session.user as User} 
              weekStart={weekStart} 
            />
          )}
        </div>
        <div className="space-y-8">
          <ProgressVisualization />
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Week Navigation</h3>
            <div className="flex justify-between items-center">
              <button onClick={() => handleWeekChange('prev')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
                &larr; Previous
              </button>
              <p className="text-center font-medium">
                {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
              <button onClick={() => handleWeekChange('next')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

