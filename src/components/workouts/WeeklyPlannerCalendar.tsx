'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User, Workout } from '@/lib/supabase'
import AddWorkoutModal from '@/components/workouts/AddWorkoutModal'

interface WeeklyPlannerCalendarProps {
  runner: User
  weekStart: Date
}

export default function WeeklyPlannerCalendar({ runner, weekStart }: WeeklyPlannerCalendarProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const fetchWorkouts = useCallback(async () => {
    setLoading(true)
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
        setWorkouts(data.workouts || [])
      }
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }, [runner.id, weekStart])

  useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])

  const handleAddWorkout = (date: Date) => {
    setSelectedDate(date)
    setSelectedWorkout(null)
    setIsModalOpen(true)
  }

  const handleEditWorkout = (workout: Workout) => {
    setSelectedWorkout(workout)
    setSelectedDate(new Date(workout.date))
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedWorkout(null)
    setSelectedDate(null)
    fetchWorkouts() // Refresh workouts after modal closes
  }

  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    return {
      date,
      workouts: workouts.filter(w => new Date(w.date).toDateString() === date.toDateString())
    }
  })

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Weekly Schedule for {runner.full_name}</h3>
          {loading ? (
            <div className="text-center py-12"><p className="text-gray-500">Loading workouts...</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {days.map(({ date, workouts }) => (
                <div key={date.toISOString()} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50 hover:shadow-md transition-shadow">
                  <p className="font-bold text-primary text-center text-md">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <p className="text-sm text-gray-600 text-center mb-2">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  <div className="space-y-2 min-h-[100px]">
                    {workouts.map(workout => (
                      <div key={workout.id} onClick={() => handleEditWorkout(workout)} className="bg-secondary text-secondary-foreground rounded-lg p-2 text-xs cursor-pointer hover:bg-opacity-90">
                        <p className="font-bold">{workout.planned_type}</p>
                        {workout.planned_distance && <p>{workout.planned_distance} mi</p>}
                        {workout.planned_duration && <p>{workout.planned_duration} min</p>}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handleAddWorkout(date)} className="w-full mt-2 text-center text-sm text-primary hover:underline">+ Add Workout</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {isModalOpen && selectedDate && (
        <AddWorkoutModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          runnerId={runner.id}
          date={selectedDate}
          workout={selectedWorkout}
        />
      )}
    </>
  )
}
