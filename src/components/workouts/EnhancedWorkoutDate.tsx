'use client'

import { useAtom } from 'jotai'
import { Calendar } from 'lucide-react'

import { memo } from 'react'

import { formatDateConsistent } from '@/lib/utils/date'

type WorkoutAtom = import('jotai').Atom<import('@/lib/supabase').Workout | null>

/**
 * EnhancedWorkoutDate - Client-only component for displaying relative workout dates
 * This component calculates relative time labels ("Today", "Tomorrow", "In X days")
 * which are inherently non-deterministic between server and client renders.
 * It's rendered client-side only to avoid hydration mismatches.
 */
const EnhancedWorkoutDate = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  const workoutDate = new Date(workout.date || '')
  const today = new Date()
  const diffInDays = Math.ceil((workoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const getDateLabel = () => {
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Tomorrow'
    if (diffInDays === -1) return 'Yesterday'
    if (diffInDays > 0) return `In ${diffInDays} days`
    if (diffInDays < 0) return `${Math.abs(diffInDays)} days ago`
    return formatDateConsistent(workoutDate)
  }

  const getDateColor = () => {
    if (diffInDays === 0) return 'text-primary'
    if (diffInDays === 1) return 'text-secondary'
    if (diffInDays < -7) return 'text-foreground-400'
    return 'text-foreground-600'
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-foreground-400" />
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${getDateColor()}`}>{getDateLabel()}</span>
        <span className="text-xs text-foreground-400">
          {formatDateConsistent(workoutDate, 'EEE, MMM d')}
        </span>
      </div>
    </div>
  )
})
EnhancedWorkoutDate.displayName = 'EnhancedWorkoutDate'

export default EnhancedWorkoutDate
