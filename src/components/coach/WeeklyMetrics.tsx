'use client'

import { Card, CardBody, Chip, Skeleton } from '@heroui/react'
import {
  ActivityIcon,
  CheckCircleIcon,
  MapPinIcon,
  TrendingUpIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react'

import { useMemo } from 'react'

import type { User } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('WeeklyMetrics')

interface WeeklyMetricsProps {
  workouts: Workout[]
  athletes: User[]
  loading: boolean
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default'
  loading?: boolean
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card className="border-t-4 border-t-primary/60">
        <CardBody className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardBody>
      </Card>
    )
  }

  const colorClasses = {
    primary: 'border-t-primary/60 bg-primary/10 text-primary',
    secondary: 'border-t-secondary/60 bg-secondary/10 text-secondary',
    success: 'border-t-success/60 bg-success/10 text-success',
    warning: 'border-t-warning/60 bg-warning/10 text-warning',
    danger: 'border-t-danger/60 bg-danger/10 text-danger',
    default: 'border-t-default/60 bg-default/10 text-default',
  }

  return (
    <Card
      className={`border-t-4 ${colorClasses[color].split(' ')[0]} hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
    >
      <CardBody className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground-600 uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-foreground">{value}</span>
              {subtitle && <span className="text-lg text-foreground-500">{subtitle}</span>}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color].split(' ')[1]}`}>
            <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[2]}`} />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default function WeeklyMetrics({ workouts, athletes, loading }: WeeklyMetricsProps) {
  // Calculate metrics from workouts data
  const metrics = useMemo(() => {
    if (loading || workouts.length === 0) {
      return {
        totalWorkouts: 0,
        completedWorkouts: 0,
        completionRate: 0,
        totalDistance: 0,
        avgCompletionRate: 0,
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
      avgCompletionRate: completionRate, // Simplified for now
    }
  }, [workouts, athletes, loading])

  return (
    <Card className="bg-linear-to-br from-secondary/10 to-primary/10 border-t-4 border-t-secondary">
      <CardBody className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUpIcon className="w-6 h-6 text-secondary" />
          <div>
            <h3 className="text-xl font-semibold text-foreground">Weekly Performance Summary</h3>
            <p className="text-foreground/70 text-sm">Key metrics for expedition progress</p>
          </div>
        </div>

        {/* Quick Status Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Chip
            startContent={<UsersIcon className="w-3 h-3" />}
            variant="flat"
            color="primary"
            size="sm"
          >
            {athletes.length} Athletes
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
            {metrics.totalDistance} mi Total
          </Chip>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Workouts"
            value={metrics.totalWorkouts}
            subtitle="scheduled"
            icon={ActivityIcon}
            color="primary"
            loading={loading}
          />

          <MetricCard
            title="Completion Rate"
            value={metrics.completionRate}
            subtitle="%"
            icon={CheckCircleIcon}
            color={
              metrics.completionRate >= 80
                ? 'success'
                : metrics.completionRate >= 60
                  ? 'warning'
                  : 'danger'
            }
            loading={loading}
          />

          <MetricCard
            title="Distance Covered"
            value={metrics.totalDistance}
            subtitle="miles"
            icon={MapPinIcon}
            color="secondary"
            loading={loading}
          />

          <MetricCard
            title="Active Athletes"
            value={athletes.length}
            subtitle="training"
            icon={UsersIcon}
            color="warning"
            loading={loading}
          />
        </div>
      </CardBody>
    </Card>
  )
}
