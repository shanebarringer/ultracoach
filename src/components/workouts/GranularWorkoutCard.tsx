'use client'

import { Badge, Button, Card, CardBody, CardFooter, CardHeader } from '@heroui/react'
import { useAtom } from 'jotai'
import { Calendar, Clock, MapPin, Target } from 'lucide-react'

import { memo } from 'react'

import { useUnitConverter } from '@/hooks/useUnitConverter'
import { workoutAtomFamily } from '@/lib/atoms/index'
import type { Workout } from '@/lib/supabase'
import { formatDateConsistent } from '@/lib/utils/date'

type WorkoutAtom = import('jotai').Atom<Workout | null>

interface GranularWorkoutCardProps {
  workoutId: string
  userRole: 'runner' | 'coach'
  onEdit?: (workout: Workout) => void
  onLog?: (workout: Workout) => void
}

// Individual workout name component - only re-renders when name changes
const WorkoutName = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  return (
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
      {workout.planned_type || 'Workout'}
    </h3>
  )
})
WorkoutName.displayName = 'WorkoutName'

// Individual workout status component - only re-renders when status changes
const WorkoutStatus = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'planned':
        return 'primary'
      case 'skipped':
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <Badge color={getStatusColor(workout.status || 'planned')} variant="flat">
      {(workout.status || 'planned').charAt(0).toUpperCase() +
        (workout.status || 'planned').slice(1)}
    </Badge>
  )
})
WorkoutStatus.displayName = 'WorkoutStatus'

// Individual workout date component - only re-renders when date changes
const WorkoutDate = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  return (
    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
      <Calendar className="h-4 w-4 mr-1" />
      {formatDateConsistent(workout.date)}
    </div>
  )
})
WorkoutDate.displayName = 'WorkoutDate'

// Individual workout distance component - only re-renders when distance changes
const WorkoutDistance = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  const converter = useUnitConverter()
  if (!workout) return null

  const distance = workout.actual_distance || workout.planned_distance
  if (!distance) return null

  return (
    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
      <MapPin className="h-4 w-4 mr-1" />
      {converter.distance(Number(distance), 'miles')}
    </div>
  )
})
WorkoutDistance.displayName = 'WorkoutDistance'

// Individual workout duration component - only re-renders when duration changes
const WorkoutDuration = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  const duration = workout.actual_duration || workout.planned_duration
  if (!duration) return null

  return (
    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
      <Clock className="h-4 w-4 mr-1" />
      {duration} min
    </div>
  )
})
WorkoutDuration.displayName = 'WorkoutDuration'

// Individual workout intensity component - only re-renders when intensity changes
const WorkoutIntensity = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  if (!workout.intensity) return null

  return (
    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
      <Target className="h-4 w-4 mr-1" />
      {workout.intensity}/10 intensity
    </div>
  )
})
WorkoutIntensity.displayName = 'WorkoutIntensity'

// Main granular workout card - uses individual components for optimal performance
const GranularWorkoutCard = memo(
  ({ workoutId, userRole: _userRole, onEdit, onLog }: GranularWorkoutCardProps) => {
    const workoutAtom = workoutAtomFamily(workoutId)
    const [workout] = useAtom(workoutAtom)

    if (!workout) {
      return (
        <Card className="w-full">
          <CardBody>
            <div className="text-center text-gray-500 dark:text-gray-400">Workout not found</div>
          </CardBody>
        </Card>
      )
    }

    return (
      <Card className="w-full hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex justify-between items-start">
          <div className="flex-1">
            <WorkoutName workoutAtom={workoutAtom} />
            <WorkoutDate workoutAtom={workoutAtom} />
          </div>
          <WorkoutStatus workoutAtom={workoutAtom} />
        </CardHeader>

        <CardBody className="space-y-2">
          <WorkoutDistance workoutAtom={workoutAtom} />
          <WorkoutDuration workoutAtom={workoutAtom} />
          <WorkoutIntensity workoutAtom={workoutAtom} />

          {/* Notes preview */}
          {workout.workout_notes && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <p className="line-clamp-2">{workout.workout_notes}</p>
            </div>
          )}
        </CardBody>

        <CardFooter className="gap-2">
          {onEdit && (
            <Button size="sm" variant="bordered" onPress={() => onEdit(workout)}>
              Edit
            </Button>
          )}
          {onLog && workout.status !== 'completed' && (
            <Button size="sm" color="primary" onPress={() => onLog(workout)}>
              Log Workout
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }
)

GranularWorkoutCard.displayName = 'GranularWorkoutCard'

export default GranularWorkoutCard
