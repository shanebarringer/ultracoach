'use client'

import { Spinner } from '@heroui/react'
import { useAtom } from 'jotai'
import { Mountain } from 'lucide-react'

import { useCallback, useEffect } from 'react'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import EnhancedWorkoutsList from '@/components/workouts/EnhancedWorkoutsList'
import { useSession } from '@/hooks/useBetterSession'
import { useWorkouts } from '@/hooks/useWorkouts'
import { loadingStatesAtom, uiStateAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'

const WorkoutLogModal = dynamic(() => import('@/components/workouts/WorkoutLogModal'), {
  loading: () => null,
  ssr: false,
})

export default function WorkoutsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  useWorkouts() // Initialize workouts data
  const [uiState, setUiState] = useAtom(uiStateAtom)
  const [loadingStates] = useAtom(loadingStatesAtom)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [status, session, router]) // Include all dependencies as required by ESLint

  const handleLogWorkoutSuccess = useCallback(() => {
    setUiState(prev => ({ ...prev, selectedWorkout: null }))
  }, [setUiState])

  const handleWorkoutPress = useCallback(
    (workout: Workout) => {
      setUiState(prev => ({ ...prev, selectedWorkout: workout, showLogWorkout: true }))
    },
    [setUiState]
  )

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" label="Loading your training journey..." />
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
                <Mountain className="w-8 h-8 text-primary" />
                Training Log
              </h1>
              <p className="text-foreground-600 mt-2 text-lg">
                {session.user.role === 'coach'
                  ? 'Guide your athletes to their summit'
                  : 'Track your ascent to peak performance'}
              </p>
            </div>
          </div>

          {/* Note: Filtering is now handled by the enhanced workouts list component */}

          {/* Enhanced Workout List with Advanced Filtering */}
          {loadingStates.workouts ? (
            <div className="flex justify-center items-center h-64">
              <Spinner size="lg" color="primary" label="Loading your training history..." />
            </div>
          ) : (
            <EnhancedWorkoutsList
              userRole={session?.user?.role as 'runner' | 'coach'}
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
            />
          )}
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
