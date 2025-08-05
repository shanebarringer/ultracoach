'use client'

import { useAtom } from 'jotai'
import { memo } from 'react'

import { filteredWorkoutsAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'

import GranularWorkoutCard from './GranularWorkoutCard'

interface PerformantWorkoutsListProps {
  userRole: 'runner' | 'coach'
  onEditWorkout?: (workout: Workout) => void
  onLogWorkout?: (workout: Workout) => void
}

// High-performance workouts list - uses regular workouts atom and passes IDs to granular components
const PerformantWorkoutsList = memo(({ userRole, onEditWorkout, onLogWorkout }: PerformantWorkoutsListProps) => {
  // Use regular filtered workouts atom to get the workout IDs
  const [workouts] = useAtom(filteredWorkoutsAtom)

  if (workouts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">No workouts found</p>
          <p className="text-sm">
            {userRole === 'coach' 
              ? 'Create workouts for your runners to get started.' 
              : 'Your coach will create workouts for you.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Each workout ID gets passed to GranularWorkoutCard which uses workoutAtomFamily for performance */}
      {workouts.map((workout) => (
        <GranularWorkoutCard
          key={workout.id}
          workoutId={workout.id}
          userRole={userRole}
          onEdit={onEditWorkout}
          onLog={onLogWorkout}
        />
      ))}
    </div>
  )
})

PerformantWorkoutsList.displayName = 'PerformantWorkoutsList'

export default PerformantWorkoutsList