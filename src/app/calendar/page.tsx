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
import { filteredWorkoutsAtom, uiStateAtom, workoutStatsAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'
import { toast } from '@/lib/toast'

const logger = createLogger('CalendarPage')

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { loading: workoutsLoading, fetchWorkouts } = useWorkouts()
  const [filteredWorkouts] = useAtom(filteredWorkoutsAtom)
  const [workoutStats] = useAtom(workoutStatsAtom)
  const [, setUiState] = useAtom(uiStateAtom)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [status, session, router]) // Include all dependencies as required by ESLint

  const handleWorkoutClick = useCallback(
    (workout: Workout) => {
      logger.debug('Workout clicked:', workout)
      setUiState(prev => ({ ...prev, selectedWorkout: workout }))
      toast.info('Workout Details', 'Workout detail modal coming soon!')
    },
    [setUiState]
  )

  const handleDateClick = useCallback((date: CalendarDate) => {
    logger.debug('Date clicked:', date.toString())
    toast.info('Add Workout', 'Add workout modal coming soon!')
  }, [])

  const handleRefreshWorkouts = useCallback(async () => {
    try {
      await fetchWorkouts()
      toast.success('Calendar Refreshed', 'Workouts have been updated')
    } catch {
      toast.error('Refresh Failed', 'Unable to refresh workout data')
    }
  }, [fetchWorkouts])

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Training Calendar
                </h1>
                <p className="text-foreground-600 mt-2 text-lg">
                  {session.user.role === 'coach'
                    ? "Visualize and manage your athletes' training schedules"
                    : 'Track your training progress and upcoming workouts'}
                </p>
              </div>
              <button
                onClick={handleRefreshWorkouts}
                disabled={workoutsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50"
              >
                <svg
                  className={`w-4 h-4 ${workoutsLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {workoutsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="relative">
            {workoutsLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex items-center gap-3 px-4 py-2 bg-background/80 rounded-lg border border-divider">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                  <span className="text-sm font-medium">Loading workouts...</span>
                </div>
              </div>
            )}
            <MonthlyCalendar
              workouts={filteredWorkouts}
              onWorkoutClick={handleWorkoutClick}
              onDateClick={handleDateClick}
              className="max-w-none"
            />
          </div>

          {/* Empty State */}
          {!workoutsLoading && (filteredWorkouts || []).length === 0 && (
            <div className="mt-8 text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 bg-content2 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-foreground-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Workouts Found</h3>
              <p className="text-foreground-600 mb-6 max-w-md mx-auto">
                {session.user.role === 'coach'
                  ? "You haven't created any workouts yet. Start by creating a training plan for your athletes."
                  : "You don't have any workouts scheduled yet. Check with your coach or create your own training plan."}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push('/training-plans')}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {session.user.role === 'coach' ? 'Create Training Plan' : 'View Training Plans'}
                </button>
                {session.user.role === 'coach' && (
                  <button
                    onClick={() => router.push('/weekly-planner')}
                    className="px-6 py-3 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-lg transition-colors"
                  >
                    Weekly Planner
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Training Summary */}
          {(filteredWorkouts || []).length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-content1 rounded-lg p-6 border border-divider">
                <h3 className="text-lg font-semibold text-foreground mb-2">This Month</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Total Workouts:</span>
                    <span className="font-medium">{workoutStats.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Completed:</span>
                    <span className="font-medium text-success">{workoutStats.completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Planned:</span>
                    <span className="font-medium text-primary">{workoutStats.planned}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Missed:</span>
                    <span className="font-medium text-danger">{workoutStats.skipped}</span>
                  </div>
                </div>
              </div>

              <div className="bg-content1 rounded-lg p-6 border border-divider">
                <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Volume</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Planned Distance:</span>
                    <span className="font-medium">
                      {workoutStats.plannedDistance.toFixed(1)} mi
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Completed Distance:</span>
                    <span className="font-medium text-success">
                      {workoutStats.completedDistance.toFixed(1)} mi
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Avg Intensity:</span>
                    <span className="font-medium">{workoutStats.avgIntensity.toFixed(1)}</span>
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
          )}
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
