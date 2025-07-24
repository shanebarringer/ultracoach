import React from 'react'
import { useAtom } from 'jotai'
import { Card, CardBody } from '@heroui/react'
import { MountainSnowIcon } from 'lucide-react'
import WorkoutCard from '@/components/workouts/WorkoutCard'
import { asyncWorkoutsAtom, uiStateAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'

interface AsyncWorkoutsListProps {
  onWorkoutPress: (workout: Workout) => void
  formatDate: (dateString: string) => string
  getWorkoutStatusColor: (status: string) => 'success' | 'danger' | 'warning'
  getWorkoutTypeIcon: (type: string) => React.ReactNode
  getWorkoutIntensityColor: (intensity: number) => 'success' | 'primary' | 'warning' | 'danger' | 'secondary'
}

export default function AsyncWorkoutsList({
  onWorkoutPress,
  formatDate,
  getWorkoutStatusColor,
  getWorkoutTypeIcon,
  getWorkoutIntensityColor
}: AsyncWorkoutsListProps) {
  // This will suspend until workouts are loaded
  const [workouts] = useAtom(asyncWorkoutsAtom)
  const [uiState] = useAtom(uiStateAtom)
  
  // Filter workouts based on UI state
  const filteredWorkouts = workouts.filter((workout: Workout) => {
    if (uiState.workoutFilter === 'all') return true
    return workout.status === uiState.workoutFilter
  })

  if (filteredWorkouts.length === 0) {
    return (
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
    )
  }

  return (
    <div className="space-y-4">
      {filteredWorkouts.map((workout: Workout) => (
        <WorkoutCard
          key={workout.id}
          workout={workout}
          onPress={onWorkoutPress}
          formatDate={formatDate}
          getWorkoutStatusColor={getWorkoutStatusColor}
          getWorkoutTypeIcon={getWorkoutTypeIcon}
          getWorkoutIntensityColor={getWorkoutIntensityColor}
        />
      ))}
    </div>
  )
}