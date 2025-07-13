'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { User } from '@/lib/supabase'
import WeeklyPlannerCalendar from '@/components/workouts/WeeklyPlannerCalendar'

// Function to get the start of the current week (Monday)
const getWeekStart = (date: Date) => {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(date.setDate(diff))
}

export default function CoachDashboard() {
  const { data: session } = useSession()
  const [runners, setRunners] = useState<User[]>([])
  const [selectedRunner, setSelectedRunner] = useState<User | null>(null)
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()))
  const [loading, setLoading] = useState(true)

  const fetchRunners = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const response = await fetch('/api/runners')
      if (response.ok) {
        const data = await response.json()
        const fetchedRunners = data.runners || []
        setRunners(fetchedRunners)
        if (fetchedRunners.length > 0) {
          setSelectedRunner(fetchedRunners[0])
        }
      }
    } catch (error) {
      console.error('Error fetching runners:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchRunners()
  }, [fetchRunners])

  const handleWeekChange = (direction: 'next' | 'prev') => {
    setWeekStart(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
      return newDate
    })
  }

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
          {selectedRunner ? (
            <WeeklyPlannerCalendar 
              key={selectedRunner.id} 
              runner={selectedRunner} 
              weekStart={weekStart} 
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">No Runner Selected</h3>
              <p className="text-gray-500">Please select a runner to view their weekly plan.</p>
            </div>
          )}
        </div>
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Runners</h3>
            {runners.length === 0 ? (
              <p className="text-gray-500">No runners assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {runners.map((runner) => (
                  <button
                    key={runner.id}
                    onClick={() => setSelectedRunner(runner)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selectedRunner?.id === runner.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-medium">{runner.full_name}</p>
                    <p className="text-sm">{runner.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
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
