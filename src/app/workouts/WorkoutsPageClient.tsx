'use client'

import { Button, Spinner } from '@heroui/react'
import { useAtom } from 'jotai'
import { Activity, Mountain } from 'lucide-react'

import { useCallback } from 'react'

import dynamic from 'next/dynamic'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import StravaWorkoutPanel from '@/components/strava/StravaWorkoutPanel'
import EnhancedWorkoutsList from '@/components/workouts/EnhancedWorkoutsList'
import { useWorkouts } from '@/hooks/useWorkouts'
import { loadingStatesAtom, uiStateAtom, workoutStravaShowPanelAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'
import type { ServerSession } from '@/utils/auth-server'

const WorkoutLogModal = dynamic(() => import('@/components/workouts/WorkoutLogModal'), {
  loading: () => null,
  ssr: false,
})

interface Props {
  user: ServerSession['user']
}

/**
 * Workouts Page Client Component
 *
 * Handles workout interactivity and state management.
 * Receives authenticated user data from Server Component parent.
 */
export default function WorkoutsPageClient({ user }: Props) {
  useWorkouts() // Initialize workouts data
  const [uiState, setUiState] = useAtom(uiStateAtom)
  const [loadingStates] = useAtom(loadingStatesAtom)
  const [showStravaPanel, setShowStravaPanel] = useAtom(workoutStravaShowPanelAtom)

  const handleLogWorkoutSuccess = useCallback(() => {
    setUiState(prev => ({ ...prev, selectedWorkout: null }))
  }, [setUiState])

  const handleWorkoutPress = useCallback(
    (workout: Workout) => {
      setUiState(prev => ({
        ...prev,
        selectedWorkout: workout,
        showLogWorkout: true,
        defaultToComplete: workout.status !== 'completed',
      }))
    },
    [setUiState]
  )

  const handleToggleStravaPanel = useCallback(() => {
    setShowStravaPanel(!showStravaPanel)
  }, [showStravaPanel, setShowStravaPanel])

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
                <Mountain className="w-8 h-8 text-primary" />
                Training Log
              </h1>
              <p className="text-foreground-600 mt-2 text-lg">
                {user.role === 'coach'
                  ? 'Guide your athletes to their summit'
                  : 'Track your ascent to peak performance'}
              </p>
            </div>

            {/* Strava Panel Toggle */}
            <Button
              variant={showStravaPanel ? 'solid' : 'bordered'}
              color="primary"
              onPress={handleToggleStravaPanel}
              startContent={<Activity className="h-4 w-4" />}
              className="hidden sm:flex"
            >
              Strava Sync
            </Button>
          </div>

          {/* Note: Filtering is now handled by the enhanced workouts list component */}

          {/* Enhanced Workout List with Advanced Filtering */}
          {loadingStates.workouts ? (
            <div className="flex justify-center items-center h-64">
              <Spinner size="lg" color="primary" label="Loading your training history..." />
            </div>
          ) : (
            <EnhancedWorkoutsList
              userRole={user?.role as 'runner' | 'coach'}
              onLogWorkout={handleWorkoutPress}
              variant="default"
            />
          )}

          {uiState.selectedWorkout && (
            <WorkoutLogModal
              isOpen={uiState.showLogWorkout}
              onClose={() => setUiState(prev => ({ ...prev, showLogWorkout: false }))}
              onSuccess={handleLogWorkoutSuccess}
              workout={uiState.selectedWorkout as Workout}
              defaultToComplete={uiState.defaultToComplete}
            />
          )}

          {/* Strava Integration Panel */}
          <StravaWorkoutPanel />
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
