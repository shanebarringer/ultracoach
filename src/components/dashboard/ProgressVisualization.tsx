'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import type { Workout } from '@/lib/supabase'

export default function ProgressVisualization() {
  const { data: session } = useSession()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkouts = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const response = await fetch(`/api/workouts?runnerId=${session.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setWorkouts(data.workouts || [])
      }
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])

  const weeklyMileageData = workouts.reduce((acc, workout) => {
    if (workout.status === 'completed' && workout.actual_distance) {
      const weekStart = new Date(workout.date)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const week = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const existingWeek = acc.find(item => item.week === week)
      if (existingWeek) {
        existingWeek.mileage += workout.actual_distance
      } else {
        acc.push({ week, mileage: workout.actual_distance })
      }
    }
    return acc
  }, [] as { week: string; mileage: number }[]).reverse()

  const paceData = workouts
    .filter(w => w.status === 'completed' && w.actual_distance && w.actual_duration)
    .map(w => ({
      date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pace: w.actual_duration / w.actual_distance
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <p className="text-gray-500">Loading progress data...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Weekly Mileage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyMileageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="mileage" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Pace Over Time (min/mi)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={paceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="pace" stroke="#10b981" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
