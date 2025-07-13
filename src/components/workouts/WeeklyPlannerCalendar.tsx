'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { User, Workout } from '@/lib/supabase'

interface DayWorkout {
  date: Date
  dayName: string
  workout?: {
    type: string
    distance?: number
    duration?: number
    notes?: string
  }
}

interface WeeklyPlannerCalendarProps {
  runner: User
  weekStart: Date
  onWeekUpdate: () => void
}

const WORKOUT_TYPES = [
  'Rest Day',
  'Easy Run',
  'Long Run', 
  'Tempo Run',
  'Interval Training',
  'Fartlek',
  'Hill Training',
  'Recovery Run',
  'Cross Training',
  'Strength Training'
]

export default function WeeklyPlannerCalendar({
  runner,
  weekStart,
  onWeekUpdate
}: WeeklyPlannerCalendarProps) {
  const { data: session } = useSession()
  const [weekWorkouts, setWeekWorkouts] = useState<DayWorkout[]>([])
  const [existingWorkouts, setExistingWorkouts] = useState<Workout[]>([])
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Generate the 7 days of the week
  const generateWeekDays = useCallback((startDate: Date): DayWorkout[] => {
    const days: DayWorkout[] = []
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      days.push({
        date,
        dayName: dayNames[i]
      })
    }
    
    return days
  }, [])

  // Fetch existing workouts for the week
  const fetchExistingWorkouts = useCallback(async () => {
    if (!session?.user?.id || !runner.id) return

    try {
      const startDate = weekStart.toISOString().split('T')[0]
      const endDate = new Date(weekStart)
      endDate.setDate(weekStart.getDate() + 6)
      const endDateStr = endDate.toISOString().split('T')[0]

      const response = await fetch(
        `/api/workouts?runnerId=${runner.id}&startDate=${startDate}&endDate=${endDateStr}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setExistingWorkouts(data.workouts || [])
      }
    } catch (error) {
      console.error('Error fetching existing workouts:', error)
    }
  }, [session?.user?.id, runner.id, weekStart])

  // Initialize week days and fetch existing workouts
  useEffect(() => {
    const days = generateWeekDays(weekStart)
    setWeekWorkouts(days)
    setHasChanges(false)
    fetchExistingWorkouts()
  }, [weekStart, generateWeekDays, fetchExistingWorkouts])

  // Merge existing workouts with week structure
  useEffect(() => {
    setWeekWorkouts(prevDays => 
      prevDays.map(day => {
        const existingWorkout = existingWorkouts.find(w => 
          new Date(w.date).toDateString() === day.date.toDateString()
        )
        
        if (existingWorkout) {
          return {
            ...day,
            workout: {
              type: existingWorkout.planned_type,
              distance: existingWorkout.planned_distance || undefined,
              duration: existingWorkout.planned_duration || undefined,
              notes: existingWorkout.workout_notes || undefined
            }
          }
        }
        
        return day
      })
    )
  }, [existingWorkouts])

  const updateDayWorkout = (dayIndex: number, field: string, value: string | number) => {
    setWeekWorkouts(prev => {
      const updated = [...prev]
      const day = updated[dayIndex]
      
      if (!day.workout) {
        day.workout = { type: 'Easy Run' }
      }
      
      if (field === 'type') {
        day.workout.type = value as string
        // Clear distance/duration for rest days
        if (value === 'Rest Day') {
          day.workout.distance = undefined
          day.workout.duration = undefined
        }
      } else if (field === 'distance') {
        day.workout.distance = value ? Number(value) : undefined
      } else if (field === 'duration') {
        day.workout.duration = value ? Number(value) : undefined
      } else if (field === 'notes') {
        day.workout.notes = value as string
      }
      
      return updated
    })
    setHasChanges(true)
  }

  const clearDayWorkout = (dayIndex: number) => {
    setWeekWorkouts(prev => {
      const updated = [...prev]
      updated[dayIndex].workout = undefined
      return updated
    })
    setHasChanges(true)
  }

  const saveWeekPlan = async () => {
    if (!session?.user?.id || !runner.id) return

    setSaving(true)
    try {
      // Find the runner's training plan
      const plansResponse = await fetch(`/api/training-plans?runnerId=${runner.id}`)
      if (!plansResponse.ok) {
        throw new Error('Failed to find training plan')
      }
      
      const plansData = await plansResponse.json()
      const trainingPlan = plansData.trainingPlans?.[0]
      
      if (!trainingPlan) {
        throw new Error('No training plan found for this runner')
      }

      // Prepare workouts for bulk creation
      const workoutsToCreate = weekWorkouts
        .filter(day => day.workout && day.workout.type !== 'Rest Day')
        .map(day => ({
          trainingPlanId: trainingPlan.id,
          date: day.date.toISOString().split('T')[0],
          plannedType: day.workout!.type,
          plannedDistance: day.workout!.distance || null,
          plannedDuration: day.workout!.duration || null,
          notes: day.workout!.notes || ''
        }))

      // Bulk create workouts
      const response = await fetch('/api/workouts/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workouts: workoutsToCreate
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save workouts')
      }

      setHasChanges(false)
      onWeekUpdate()
      
      // Show success message
      alert(`Successfully planned ${workoutsToCreate.length} workouts for ${runner.full_name}!`)
      
      // Refresh existing workouts
      fetchExistingWorkouts()
    } catch (error) {
      console.error('Error saving week plan:', error)
      alert(error instanceof Error ? error.message : 'Failed to save week plan')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Weekly Plan for {runner.full_name}
          </h3>
          
          {hasChanges && (
            <button
              onClick={saveWeekPlan}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Week Plan'}
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekWorkouts.map((day, index) => (
            <div
              key={day.date.toISOString()}
              className={`border rounded-lg p-4 ${
                isToday(day.date) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              {/* Day Header */}
              <div className="mb-3">
                <h4 className={`font-medium ${isToday(day.date) ? 'text-blue-900' : 'text-gray-900'}`}>
                  {day.dayName}
                </h4>
                <p className={`text-sm ${isToday(day.date) ? 'text-blue-600' : 'text-gray-500'}`}>
                  {formatDate(day.date)}
                </p>
              </div>

              {/* Workout Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Workout Type
                  </label>
                  <select
                    value={day.workout?.type || ''}
                    onChange={(e) => updateDayWorkout(index, 'type', e.target.value)}
                    className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">No workout</option>
                    {WORKOUT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {day.workout && day.workout.type && day.workout.type !== 'Rest Day' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Distance (miles)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={day.workout.distance || ''}
                        onChange={(e) => updateDayWorkout(index, 'distance', e.target.value)}
                        className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., 5.5"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={day.workout.duration || ''}
                        onChange={(e) => updateDayWorkout(index, 'duration', e.target.value)}
                        className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., 60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        rows={2}
                        value={day.workout.notes || ''}
                        onChange={(e) => updateDayWorkout(index, 'notes', e.target.value)}
                        className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Instructions..."
                      />
                    </div>
                  </>
                )}

                {day.workout && (
                  <button
                    onClick={() => clearDayWorkout(index)}
                    className="w-full text-xs text-red-600 hover:text-red-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {hasChanges && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-yellow-800">
                You have unsaved changes. Click &quot;Save Week Plan&quot; to save all workouts.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}