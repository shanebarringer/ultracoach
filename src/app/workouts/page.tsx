'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAtom } from 'jotai'
import { Card, CardBody, CardHeader, Chip, Spinner, Tabs, Tab } from '@heroui/react'
import { MountainSnowIcon, ClockIcon, MapPinIcon, TrendingUpIcon } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import WorkoutLogModal from '@/components/workouts/WorkoutLogModal'
import { useWorkouts } from '@/hooks/useWorkouts'
import { uiStateAtom, loadingStatesAtom, filteredWorkoutsAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'

export default function WorkoutsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  useWorkouts() // Initialize workouts data
  const [uiState, setUiState] = useAtom(uiStateAtom)
  const [loadingStates] = useAtom(loadingStatesAtom)
  const [filteredWorkouts] = useAtom(filteredWorkoutsAtom)
  const [showLogWorkout, setShowLogWorkout] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  const handleLogWorkoutSuccess = () => {
    setUiState(prev => ({ ...prev, selectedWorkout: null }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getWorkoutStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'skipped':
        return 'danger'
      default:
        return 'warning'
    }
  }

  const getWorkoutTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'long_run':
        return <MountainSnowIcon className="w-4 h-4" />
      case 'interval':
        return <TrendingUpIcon className="w-4 h-4" />
      case 'tempo':
        return <ClockIcon className="w-4 h-4" />
      default:
        return <MapPinIcon className="w-4 h-4" />
    }
  }

  const getWorkoutIntensityColor = (intensity: number) => {
    if (intensity <= 2) return 'success'  // Zone 1-2: Recovery/Aerobic
    if (intensity <= 4) return 'primary'  // Zone 3-4: Aerobic/Tempo
    if (intensity <= 6) return 'warning'  // Zone 5-6: Tempo/Threshold
    if (intensity <= 8) return 'danger'   // Zone 7-8: Threshold/VO2Max
    return 'secondary'                    // Zone 9-10: Neuromuscular
  }


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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
              <MountainSnowIcon className="w-8 h-8 text-primary" />
              Training Log
            </h1>
            <p className="text-foreground-600 mt-2 text-lg">
              {session.user.role === 'coach' 
                ? 'Guide your athletes to their summit'
                : 'Track your ascent to peak performance'
              }
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8">
          <Tabs 
            aria-label="Training filter"
            color="primary"
            variant="underlined"
            selectedKey={uiState.workoutFilter}
            onSelectionChange={(key) => setUiState(prev => ({ ...prev, workoutFilter: key as 'all' | 'planned' | 'completed' | 'skipped' }))}
            classNames={{
              tabList: "gap-8 w-full relative rounded-none p-0 border-b border-divider",
              cursor: "bg-primary",
              tab: "max-w-fit px-0 h-12",
              tabContent: "group-data-[selected=true]:text-primary font-medium"
            }}
          >
            <Tab key="all" title="All Expeditions" />
            <Tab key="planned" title="Planned" />
            <Tab key="completed" title="Conquered" />
            <Tab key="skipped" title="Deferred" />
          </Tabs>
        </div>

        {loadingStates.workouts ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" color="primary" label="Loading your training history..." />
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <Card className="py-12">
            <CardBody className="text-center">
              <MountainSnowIcon className="mx-auto h-12 w-12 text-foreground-400 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No training sessions found</h3>
              <p className="text-foreground-600">
                {uiState.workoutFilter === 'all' 
                  ? 'Your training journey begins here. Plan your first expedition!'
                  : `No ${uiState.workoutFilter} sessions found. Adjust your view or plan new training.`
                }
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredWorkouts.map((workout) => (
              <Card 
                key={workout.id} 
                className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-primary/60"
                isPressable
                onPress={() => {
                  setUiState(prev => ({ ...prev, selectedWorkout: workout }))
                  setShowLogWorkout(true)
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex items-center gap-3">
                      {getWorkoutTypeIcon(workout.status === 'completed' ? workout.actual_type || 'general' : workout.planned_type || 'general')}
                      <div>
                        <h3 className="text-lg font-semibold text-foreground capitalize">
                          {(workout.status === 'completed' ? workout.actual_type || 'general' : workout.planned_type || 'general').replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-foreground-600">{formatDate(workout.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip 
                        color={getWorkoutStatusColor(workout.status)}
                        variant="flat"
                        size="sm"
                        className="capitalize"
                      >
                        {workout.status}
                      </Chip>
                      {workout.intensity && (
                        <Chip 
                          color={getWorkoutIntensityColor(workout.intensity)}
                          variant="bordered"
                          size="sm"
                        >
                          Zone {Math.ceil(workout.intensity / 2)}
                        </Chip>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground-700 flex items-center gap-2">
                        <MapPinIcon className="w-4 h-4" />
                        Planned Route
                      </h4>
                      <div className="text-sm text-foreground-600">
                        {workout.planned_distance && (
                          <div className="flex items-center gap-1">
                            <span>Distance:</span>
                            <span className="font-medium">{workout.planned_distance} miles</span>
                          </div>
                        )}
                        {workout.planned_duration && (
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>Duration:</span>
                            <span className="font-medium">{workout.planned_duration} min</span>
                          </div>
                        )}
                        {!workout.planned_distance && !workout.planned_duration && (
                          <span className="text-foreground-400 italic">Flexible training session</span>
                        )}
                      </div>
                    </div>
                    
                    {workout.status === 'completed' && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground-700 flex items-center gap-2">
                          <TrendingUpIcon className="w-4 h-4" />
                          Actual Performance
                        </h4>
                        <div className="text-sm text-foreground-600">
                          {workout.actual_distance && (
                            <div className="flex items-center gap-1">
                              <span>Distance:</span>
                              <span className="font-medium text-success">{workout.actual_distance} miles</span>
                            </div>
                          )}
                          {workout.actual_duration && (
                            <div className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              <span>Duration:</span>
                              <span className="font-medium text-success">{workout.actual_duration} min</span>
                            </div>
                          )}
                          {!workout.actual_distance && !workout.actual_duration && (
                            <span className="text-foreground-400 italic">No performance data logged</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {workout.workout_notes && (
                    <div className="mt-4 p-3 bg-content2 rounded-lg">
                      <h4 className="text-sm font-semibold text-foreground-700 mb-2">Training Notes</h4>
                      <p className="text-sm text-foreground-600">{workout.workout_notes}</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
      {uiState.selectedWorkout && (
        <WorkoutLogModal
          isOpen={showLogWorkout}
          onClose={() => setShowLogWorkout(false)}
          onSuccess={handleLogWorkoutSuccess}
          workout={uiState.selectedWorkout as Workout}
        />
      )}
    </Layout>
  )
}