'use client'

import { Select, SelectItem } from '@heroui/react'
import { CalendarDate } from '@internationalized/date'
import { useAtom, useAtomValue } from 'jotai'

import { Suspense, memo, useCallback, useRef } from 'react'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

import MonthlyCalendar from '@/components/calendar/MonthlyCalendar'
import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { CalendarPageSkeleton } from '@/components/ui/LoadingSkeletons'
import { useHydrateWorkouts, useWorkouts } from '@/hooks/useWorkouts'
import {
  calendarUiStateAtom,
  connectedRunnersAtom,
  filteredWorkoutsAtom,
  workoutStatsAtom,
} from '@/lib/atoms/index'
import { refreshableTrainingPlansAtom } from '@/lib/atoms/training-plans'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'
import type { User } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import type { ServerSession } from '@/utils/auth-server'

// Enhanced memoization with custom comparison logic to prevent unnecessary re-renders
const MemoizedMonthlyCalendar = memo(MonthlyCalendar, (prevProps, nextProps) => {
  // Compare workouts array more intelligently
  if (prevProps.workouts.length !== nextProps.workouts.length) {
    return false // Re-render if workout count changed
  }

  // Deep comparison of workout IDs, dates, and status changes
  const prevWorkoutIds = prevProps.workouts.map(w => `${w.id}-${w.date}-${w.status || 'planned'}`)
  const nextWorkoutIds = nextProps.workouts.map(w => `${w.id}-${w.date}-${w.status || 'planned'}`)

  for (let i = 0; i < prevWorkoutIds.length; i++) {
    if (prevWorkoutIds[i] !== nextWorkoutIds[i]) {
      return false // Re-render if any workout changed
    }
  }

  // Compare other props
  return (
    prevProps.onWorkoutClick === nextProps.onWorkoutClick &&
    prevProps.onDateClick === nextProps.onDateClick &&
    prevProps.className === nextProps.className
  )
})

// Dynamic imports for modals to reduce initial bundle size
const WorkoutLogModal = dynamic(() => import('@/components/workouts/WorkoutLogModal'), {
  loading: () => null,
  ssr: false,
})

const AddWorkoutModal = dynamic(() => import('@/components/workouts/AddWorkoutModal'), {
  loading: () => null,
  ssr: false,
})

const logger = createLogger('CalendarPageClient')

interface Props {
  user: ServerSession['user']
}

/**
 * Calendar Content Component (uses async atoms with Suspense)
 *
 * Handles calendar content that requires async data loading.
 */
function CalendarContent({ user }: Props) {
  const router = useRouter()
  const { loading: workoutsLoading, fetchWorkouts } = useWorkouts()
  const filteredWorkouts = useAtomValue(filteredWorkoutsAtom)
  const workoutStats = useAtomValue(workoutStatsAtom)
  const [calendarUiState, setCalendarUiState] = useAtom(calendarUiStateAtom)
  const trainingPlans = useAtomValue(refreshableTrainingPlansAtom) // Using async atom
  const connectedRunners = useAtomValue(connectedRunnersAtom)

  // Prevent race conditions in modal operations
  const operationInProgress = useRef(false)

  const handleWorkoutClick = useCallback(
    (workout: Workout) => {
      logger.debug('Workout clicked:', workout)
      setCalendarUiState(prev => ({
        ...prev,
        showWorkoutModal: true,
        selectedCalendarWorkout: workout,
      }))
    },
    [setCalendarUiState]
  )

  const handleDateClick = useCallback(
    (date: CalendarDate) => {
      logger.debug('Date clicked:', date.toString())
      const selectedDate = date.toString() // ISO format YYYY-MM-DD

      // Check if user has any training plans
      if (trainingPlans.length === 0) {
        toast.warning(
          'No Training Plans',
          'Create a training plan first to add workouts to your calendar.'
        )
        router.push('/training-plans')
        return
      }

      setCalendarUiState(prev => ({
        ...prev,
        showAddWorkoutModal: true,
        selectedDate,
      }))
    },
    [setCalendarUiState, trainingPlans, router]
  )

  const handleRefreshWorkouts = useCallback(async () => {
    try {
      setCalendarUiState(prev => ({ ...prev, workoutsLoading: true }))
      await fetchWorkouts()
      toast.success('Calendar Refreshed', 'Workouts have been updated')
    } catch {
      toast.error('Refresh Failed', 'Unable to refresh workout data')
    } finally {
      setCalendarUiState(prev => ({ ...prev, workoutsLoading: false }))
    }
  }, [fetchWorkouts, setCalendarUiState])

  const handleWorkoutModalClose = useCallback(() => {
    setCalendarUiState(prev => ({
      ...prev,
      showWorkoutModal: false,
      selectedCalendarWorkout: null,
    }))
  }, [setCalendarUiState])

  const handleWorkoutModalSuccess = useCallback(async () => {
    // Prevent race conditions
    if (operationInProgress.current) return
    operationInProgress.current = true

    try {
      // Refresh workouts after successful edit
      await fetchWorkouts()
      handleWorkoutModalClose()
    } finally {
      operationInProgress.current = false
    }
  }, [fetchWorkouts, handleWorkoutModalClose])

  const handleAddWorkoutModalClose = useCallback(() => {
    setCalendarUiState(prev => ({
      ...prev,
      showAddWorkoutModal: false,
      selectedDate: null,
    }))
  }, [setCalendarUiState])

  const handleAddWorkoutSuccess = useCallback(async () => {
    // Prevent race conditions
    if (operationInProgress.current) return
    operationInProgress.current = true

    try {
      // Refresh workouts after successful addition
      await fetchWorkouts()
      handleAddWorkoutModalClose()
      toast.success('Workout Added', 'Your workout has been added to the calendar')
    } finally {
      operationInProgress.current = false
    }
  }, [fetchWorkouts, handleAddWorkoutModalClose])

  // Get the first available training plan for new workout creation
  const defaultTrainingPlanId = trainingPlans.length > 0 ? trainingPlans[0].id : null

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Training Calendar
                </h1>
                <p className="text-foreground-600 mt-2 text-base sm:text-lg">
                  {user.role === 'coach'
                    ? "Visualize and manage your athletes' training schedules"
                    : 'Track your training progress and upcoming workouts'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Runner Dropdown for Coaches */}
                {user.role === 'coach' && connectedRunners.length > 0 && (
                  <Select
                    placeholder="All Runners"
                    size="sm"
                    className="min-w-[160px]"
                    selectedKeys={
                      calendarUiState.selectedRunnerId ? [calendarUiState.selectedRunnerId] : []
                    }
                    onSelectionChange={keys => {
                      const runnerId = Array.from(keys)[0] as string
                      setCalendarUiState(prev => ({ ...prev, selectedRunnerId: runnerId || null }))
                    }}
                  >
                    {[
                      <SelectItem key="">All Runners</SelectItem>,
                      ...connectedRunners.map((runner: User) => (
                        <SelectItem key={runner.id}>{runner.full_name || runner.email}</SelectItem>
                      )),
                    ]}
                  </Select>
                )}

                <button
                  onClick={handleRefreshWorkouts}
                  disabled={workoutsLoading || calendarUiState.workoutsLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg
                    className={`w-4 h-4 ${workoutsLoading || calendarUiState.workoutsLoading ? 'animate-spin' : ''}`}
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
                  {workoutsLoading || calendarUiState.workoutsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            {(workoutsLoading || calendarUiState.workoutsLoading) && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex items-center gap-3 px-4 py-2 bg-background/80 rounded-lg border border-divider">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                  <span className="text-sm font-medium">Loading workouts...</span>
                </div>
              </div>
            )}
            <MemoizedMonthlyCalendar
              workouts={filteredWorkouts}
              onWorkoutClick={handleWorkoutClick}
              onDateClick={handleDateClick}
              className="max-w-none overflow-x-auto"
            />
          </div>

          {/* Empty State */}
          {!workoutsLoading &&
            !calendarUiState.workoutsLoading &&
            (filteredWorkouts || []).length === 0 && (
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
                  {user.role === 'coach'
                    ? "You haven't created any workouts yet. Start by creating a training plan for your athletes."
                    : "You don't have any workouts scheduled yet. Check with your coach or create your own training plan."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <button
                    onClick={() => router.push('/training-plans')}
                    className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {user.role === 'coach' ? 'Create Training Plan' : 'View Training Plans'}
                  </button>
                  {user.role === 'coach' && (
                    <button
                      onClick={() => router.push('/weekly-planner')}
                      className="w-full sm:w-auto px-6 py-3 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-lg transition-colors"
                    >
                      Weekly Planner
                    </button>
                  )}
                </div>
              </div>
            )}

          {/* Training Summary */}
          {(filteredWorkouts || []).length > 0 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                      {Number(workoutStats.plannedDistance || 0).toFixed(1)} mi
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Completed Distance:</span>
                    <span className="font-medium text-success">
                      {Number(workoutStats.completedDistance || 0).toFixed(1)} mi
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Avg Intensity:</span>
                    <span className="font-medium">
                      {Number(workoutStats.avgIntensity || 0).toFixed(1)}
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
                  {user.role === 'coach' && (
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

        {/* Workout Detail Modal */}
        {calendarUiState.selectedCalendarWorkout && (
          <WorkoutLogModal
            isOpen={calendarUiState.showWorkoutModal}
            onClose={handleWorkoutModalClose}
            onSuccess={handleWorkoutModalSuccess}
            workout={calendarUiState.selectedCalendarWorkout}
            defaultToComplete={false}
          />
        )}

        {/* Add Workout Modal */}
        {calendarUiState.showAddWorkoutModal && defaultTrainingPlanId && (
          <AddWorkoutModal
            isOpen={calendarUiState.showAddWorkoutModal}
            onClose={handleAddWorkoutModalClose}
            onSuccess={handleAddWorkoutSuccess}
            trainingPlanId={defaultTrainingPlanId}
            initialDate={calendarUiState.selectedDate || undefined}
          />
        )}
      </ModernErrorBoundary>
    </Layout>
  )
}

/**
 * Calendar Page Client Component
 *
 * Handles calendar interactivity and state management.
 * Receives authenticated user data from Server Component parent.
 */
export default function CalendarPageClient({ user }: Props) {
  useHydrateWorkouts() // Hydrate workouts at entry point

  return (
    <Suspense fallback={<CalendarPageSkeleton />}>
      <CalendarContent user={user} />
    </Suspense>
  )
}
