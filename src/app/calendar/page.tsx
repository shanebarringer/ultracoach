'use client'

import { CalendarDate } from '@internationalized/date'
import { useAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useRouter } from 'next/navigation'

import MonthlyCalendar from '@/components/calendar/MonthlyCalendar'
import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { useSession } from '@/hooks/useBetterSession'
import { useWorkouts } from '@/hooks/useWorkouts'
import { filteredWorkoutsAtom, uiStateAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  useWorkouts() // Initialize workouts data
  const [filteredWorkouts] = useAtom(filteredWorkoutsAtom)
  const [, setUiState] = useAtom(uiStateAtom)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [status, session?.user?.id]) // Remove router from dependencies since it's stable, use primitive values for session

  const handleWorkoutClick = useCallback(
    (workout: Workout) => {
      console.log('Workout clicked:', workout)
      // TODO: Open workout detail modal/drawer
      setUiState(prev => ({ ...prev, selectedWorkout: workout }))
    },
    [setUiState]
  )

  const handleDateClick = useCallback((date: CalendarDate) => {
    console.log('Date clicked:', date.toString())
    // TODO: Open add workout modal for this date
  }, [])

  if (status === 'loading') {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-content2 rounded-lg w-64 mb-8"></div>
            <div className="grid grid-cols-7 gap-4 mb-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-6 bg-content2 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 bg-content2 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Training Calendar
            </h1>
            <p className="text-foreground-600 mt-2 text-lg">
              {session.user.role === 'coach'
                ? "Visualize and manage your athletes' training schedules"
                : 'Track your training progress and upcoming workouts'}
            </p>
          </div>

          <MonthlyCalendar
            workouts={filteredWorkouts}
            onWorkoutClick={handleWorkoutClick}
            onDateClick={handleDateClick}
            className="max-w-none"
          />

          {/* Training Summary */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-content1 rounded-lg p-6 border border-divider">
              <h3 className="text-lg font-semibold text-foreground mb-2">This Month</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-600">Total Workouts:</span>
                  <span className="font-medium">{filteredWorkouts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-600">Completed:</span>
                  <span className="font-medium text-success">
                    {filteredWorkouts.filter(w => w.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-600">Planned:</span>
                  <span className="font-medium text-primary">
                    {filteredWorkouts.filter(w => w.status === 'planned').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-600">Missed:</span>
                  <span className="font-medium text-danger">
                    {filteredWorkouts.filter(w => w.status === 'skipped').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-content1 rounded-lg p-6 border border-divider">
              <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Volume</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-600">Planned Distance:</span>
                  <span className="font-medium">
                    {filteredWorkouts
                      .reduce((sum, w) => sum + (w.planned_distance || 0), 0)
                      .toFixed(1)}{' '}
                    mi
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-600">Completed Distance:</span>
                  <span className="font-medium text-success">
                    {filteredWorkouts
                      .filter(w => w.status === 'completed')
                      .reduce((sum, w) => sum + (w.actual_distance || w.planned_distance || 0), 0)
                      .toFixed(1)}{' '}
                    mi
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-600">Avg Intensity:</span>
                  <span className="font-medium">
                    {filteredWorkouts.length > 0
                      ? (
                          filteredWorkouts.reduce((sum, w) => sum + (w.intensity || 0), 0) /
                          filteredWorkouts.length
                        ).toFixed(1)
                      : '0.0'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-content1 rounded-lg p-6 border border-divider">
              <h3 className="text-lg font-semibold text-foreground mb-2">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  className="w-full text-left p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  onClick={() => router.push('/workouts')}
                >
                  <div className="text-sm font-medium text-primary">View All Workouts</div>
                  <div className="text-xs text-foreground-600">See detailed workout list</div>
                </button>
                <button
                  className="w-full text-left p-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  onClick={() => router.push('/training-plans')}
                >
                  <div className="text-sm font-medium text-secondary">Training Plans</div>
                  <div className="text-xs text-foreground-600">Manage your training plans</div>
                </button>
                {session.user.role === 'coach' && (
                  <button
                    className="w-full text-left p-2 rounded-lg bg-success/10 hover:bg-success/20 transition-colors"
                    onClick={() => router.push('/runners')}
                  >
                    <div className="text-sm font-medium text-success">Your Athletes</div>
                    <div className="text-xs text-foreground-600">View athlete progress</div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
