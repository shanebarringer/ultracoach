'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from '@/hooks/useBetterSession'
import { useRouter } from 'next/navigation'
import { useAtom } from 'jotai'
import { Card, CardBody, Spinner, Tabs, Tab } from '@heroui/react'
import { MountainSnowIcon, ClockIcon, MapPinIcon, TrendingUpIcon } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import dynamic from 'next/dynamic'

const WorkoutLogModal = dynamic(() => import('@/components/workouts/WorkoutLogModal'), {
  loading: () => null,
  ssr: false
})
import WorkoutCard from '@/components/workouts/WorkoutCard'
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

  const handleLogWorkoutSuccess = useCallback(() => {
    setUiState(prev => ({ ...prev, selectedWorkout: null }))
  }, [setUiState])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [])

  const getWorkoutStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'skipped':
        return 'danger'
      default:
        return 'warning'
    }
  }, [])

  const getWorkoutTypeIcon = useCallback((type: string) => {
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
  }, [])

  const getWorkoutIntensityColor = useCallback((intensity: number) => {
    if (intensity <= 2) return 'success'  // Zone 1-2: Recovery/Aerobic
    if (intensity <= 4) return 'primary'  // Zone 3-4: Aerobic/Tempo
    if (intensity <= 6) return 'warning'  // Zone 5-6: Tempo/Threshold
    if (intensity <= 8) return 'danger'   // Zone 7-8: Threshold/VO2Max
    return 'secondary'                    // Zone 9-10: Neuromuscular
  }, [])

  const handleWorkoutPress = useCallback((workout: Workout) => {
    setUiState(prev => ({ ...prev, selectedWorkout: workout }))
    setShowLogWorkout(true)
  }, [setUiState])


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
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onPress={handleWorkoutPress}
                formatDate={formatDate}
                getWorkoutStatusColor={getWorkoutStatusColor}
                getWorkoutTypeIcon={getWorkoutTypeIcon}
                getWorkoutIntensityColor={getWorkoutIntensityColor}
              />
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