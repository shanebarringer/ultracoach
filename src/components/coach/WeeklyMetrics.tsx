'use client'

import { Chip, Skeleton } from '@heroui/react'
import {
  ActivityIcon,
  CheckCircleIcon,
  MapPinIcon,
  TrendingUpIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react'

import { memo, useMemo } from 'react'

import type { User } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('WeeklyMetrics')

interface WeeklyMetricsProps {
  workouts: Workout[]
  athletes: User[]
  loading: boolean
}

function WeeklyMetrics({ workouts, athletes, loading }: WeeklyMetricsProps) {
  // Calculate metrics from workouts data
  const metrics = useMemo(() => {
    if (loading || workouts.length === 0) {
      return {
        totalWorkouts: 0,
        completedWorkouts: 0,
        completionRate: 0,
        totalDistance: 0,
      }
    }

    const completedWorkouts = workouts.filter(w => w.status === 'completed')
    const totalDistance = completedWorkouts.reduce((sum, w) => {
      const distance = parseFloat(w.actual_distance?.toString() || '0')
      return sum + distance
    }, 0)

    const completionRate =
      workouts.length > 0 ? Math.round((completedWorkouts.length / workouts.length) * 100) : 0

    logger.debug('Calculated weekly metrics', {
      totalWorkouts: workouts.length,
      completedWorkouts: completedWorkouts.length,
      completionRate,
      totalDistance: totalDistance.toFixed(1),
      athletesCount: athletes.length,
    })

    return {
      totalWorkouts: workouts.length,
      completedWorkouts: completedWorkouts.length,
      completionRate,
      totalDistance: totalDistance.toFixed(1),
    }
  }, [workouts, athletes, loading])

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Chip
        startContent={<UsersIcon className="w-3 h-3" />}
        variant="flat"
        color="primary"
        size="sm"
      >
        {athletes.length} Athletes
      </Chip>
      <Chip
        startContent={<ActivityIcon className="w-3 h-3" />}
        variant="flat"
        color="default"
        size="sm"
      >
        {metrics.totalWorkouts} Total
      </Chip>
      <Chip
        startContent={<CheckCircleIcon className="w-3 h-3" />}
        variant="flat"
        color="success"
        size="sm"
      >
        {metrics.completedWorkouts} Completed
      </Chip>
      <Chip
        startContent={<XCircleIcon className="w-3 h-3" />}
        variant="flat"
        color="danger"
        size="sm"
      >
        {metrics.totalWorkouts - metrics.completedWorkouts} Pending
      </Chip>
      <Chip
        startContent={<MapPinIcon className="w-3 h-3" />}
        variant="flat"
        color="warning"
        size="sm"
      >
        {metrics.totalDistance} mi
      </Chip>
      <Chip
        startContent={<TrendingUpIcon className="w-3 h-3" />}
        variant="flat"
        color={
          metrics.completionRate >= 80
            ? 'success'
            : metrics.completionRate >= 60
              ? 'warning'
              : 'danger'
        }
        size="sm"
      >
        {metrics.completionRate}% Rate
      </Chip>
    </div>
  )
}

export default memo(WeeklyMetrics)
