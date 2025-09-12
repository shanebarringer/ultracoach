'use client'

import { Button, Select, SelectItem } from '@heroui/react'
import { useAtom } from 'jotai'
import { Activity, Mountain, Plus, Users } from 'lucide-react'

import { useCallback, useMemo, useState } from 'react'

import dynamic from 'next/dynamic'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import StravaWorkoutPanel from '@/components/strava/StravaWorkoutPanel'
import { WorkoutsPageSkeleton } from '@/components/ui/LoadingSkeletons'
import EnhancedWorkoutsList from '@/components/workouts/EnhancedWorkoutsList'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useWorkouts } from '@/hooks/useWorkouts'
import {
  loadingStatesAtom,
  uiStateAtom,
  workoutStravaShowPanelAtom,
  workoutsAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'
import type { ServerSession } from '@/utils/auth-server'

const logger = createLogger('WorkoutsPageClient')

const WorkoutLogModal = dynamic(() => import('@/components/workouts/WorkoutLogModal'), {
  loading: () => null,
  ssr: false,
})

const AddWorkoutModal = dynamic(() => import('@/components/workouts/AddWorkoutModal'), {
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
  const [workouts, setWorkouts] = useAtom(workoutsAtom)

  // Coach-specific state and data
  const [selectedRunnerId, setSelectedRunnerId] = useState<string>('all')
  const { runners } = useDashboardData() // Get runner data for coach view

  const isCoach = user.role === 'coach'

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

  // Fetch workouts for specific runner (coach only)
  const fetchRunnerWorkouts = useCallback(
    async (runnerId: string) => {
      if (!isCoach) return

      logger.debug('Fetching workouts for runner', { runnerId })

      try {
        const params = new URLSearchParams()
        if (runnerId !== 'all') {
          params.append('runnerId', runnerId)
        }

        const response = await fetch(`/api/workouts?${params}`, {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setWorkouts(data.workouts || [])
          logger.debug('Successfully fetched runner workouts', {
            runnerId,
            count: data.workouts?.length || 0,
          })
        } else {
          logger.error('Failed to fetch runner workouts', {
            runnerId,
            status: response.status,
          })
        }
      } catch (error) {
        logger.error('Error fetching runner workouts:', error)
      }
    },
    [isCoach, setWorkouts]
  )

  // Handle runner selection change
  const handleRunnerSelectionChange = useCallback(
    (keys: 'all' | Set<React.Key>) => {
      const selectedKeys = keys === 'all' ? new Set(['all']) : keys
      const runnerId = Array.from(selectedKeys)[0] as string
      setSelectedRunnerId(runnerId)

      if (isCoach) {
        fetchRunnerWorkouts(runnerId)
      }
    },
    [isCoach, fetchRunnerWorkouts]
  )

  // Get current runner context for display
  const currentRunnerContext = useMemo(() => {
    if (!isCoach) return null

    if (selectedRunnerId === 'all') {
      return {
        name: 'All Athletes',
        email: `${runners.length} connected runners`,
        count: workouts.length,
      }
    }

    const selectedRunner = runners.find(r => r.id === selectedRunnerId)
    if (!selectedRunner) return null

    const runnerWorkouts = workouts.filter(w => w.user_id === selectedRunnerId)
    return {
      name: selectedRunner.full_name || 'Unknown Runner',
      email: selectedRunner.email,
      count: runnerWorkouts.length,
    }
  }, [isCoach, selectedRunnerId, runners, workouts])

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-6 mb-8">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <Mountain className="w-8 h-8 text-primary" />
                  Training Log
                </h1>
                <p className="text-foreground-600 mt-2 text-lg">
                  {user.role === 'coach'
                    ? 'Guide your athletes to their summit'
                    : 'Track your ascent to peak performance'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {!isCoach && (
                  <Button
                    variant="solid"
                    color="primary"
                    onPress={() => setUiState(prev => ({ ...prev, isAddWorkoutModalOpen: true }))}
                    startContent={<Plus className="h-4 w-4" />}
                  >
                    New Workout
                  </Button>
                )}
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
            </div>

            {/* Coach Controls */}
            {isCoach && (
              <div className="bg-content1 border border-divider rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* Runner Selection */}
                  <div className="flex-1 max-w-xs">
                    <Select
                      label="Select Athlete"
                      placeholder="Choose a runner..."
                      selectedKeys={[selectedRunnerId]}
                      onSelectionChange={handleRunnerSelectionChange}
                      startContent={<Users className="h-4 w-4 text-foreground-500" />}
                      items={[
                        {
                          id: 'all',
                          name: 'All Athletes',
                          email: `${runners.length} connected runners`,
                        },
                        ...runners.map(runner => ({
                          id: runner.id,
                          name: runner.full_name || 'Unknown Runner',
                          email: runner.email,
                        })),
                      ]}
                    >
                      {item => (
                        <SelectItem key={item.id} textValue={item.name}>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-xs text-foreground-500">{item.email}</span>
                          </div>
                        </SelectItem>
                      )}
                    </Select>
                  </div>

                  {/* Current Context Display */}
                  {currentRunnerContext && (
                    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {currentRunnerContext.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {currentRunnerContext.name}
                        </div>
                        <div className="text-xs text-foreground-600">
                          {currentRunnerContext.email} • {currentRunnerContext.count} workouts
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Note: Filtering is now handled by the enhanced workouts list component */}

          {/* Enhanced Workout List with Advanced Filtering */}
          {loadingStates.workouts ? (
            <WorkoutsPageSkeleton />
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

          {/* Add Workout Modal */}
          {uiState.isAddWorkoutModalOpen && (
            <AddWorkoutModal
              isOpen={uiState.isAddWorkoutModalOpen}
              onClose={() => setUiState(prev => ({ ...prev, isAddWorkoutModalOpen: false }))}
              onSuccess={() => {
                setUiState(prev => ({ ...prev, isAddWorkoutModalOpen: false }))
                // Refresh workouts would go here if needed
              }}
              // trainingPlanId is optional for standalone workouts
            />
          )}

          {/* Strava Integration Panel */}
          <StravaWorkoutPanel />
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
