'use client'

import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Avatar, Button, Card, CardBody, Chip, Progress, Tooltip } from '@heroui/react'
import classNames from 'classnames'

import { memo } from 'react'

import { useRouter } from 'next/navigation'

import type { AthleteWithMetrics } from '@/lib/atoms/dashboard'

interface AthleteCardProps {
  athlete: AthleteWithMetrics
  viewMode?: 'grid' | 'list'
}

/**
 * Enhanced athlete card component for the coach dashboard.
 * Displays athlete info, weekly metrics, trends, and quick actions.
 */
function AthleteCardComponent({ athlete, viewMode = 'grid' }: AthleteCardProps) {
  const router = useRouter()
  const { relationship, metrics } = athlete

  const handleViewProgress = () => {
    router.push(`/weekly-planner/${relationship.other_party.id}`)
  }

  const handleSendMessage = () => {
    router.push(`/chat/${relationship.other_party.id}`)
  }

  const handleScheduleWorkout = () => {
    router.push(`/weekly-planner/${relationship.other_party.id}`)
  }

  // Determine status display
  const getStatusColor = () => {
    if (metrics.needsAttention) return 'warning'
    if (relationship.status === 'active') return 'success'
    if (relationship.status === 'pending') return 'default'
    return 'default'
  }

  const getStatusLabel = () => {
    if (metrics.needsAttention) return 'Needs Attention'
    return relationship.status
  }

  // Get trend icon and color
  const getTrendDisplay = () => {
    if (metrics.trend > 0) {
      return {
        icon: ArrowTrendingUpIcon,
        color: 'text-success',
        bgColor: 'bg-success/10',
      }
    } else if (metrics.trend < 0) {
      return {
        icon: ArrowTrendingDownIcon,
        color: 'text-danger',
        bgColor: 'bg-danger/10',
      }
    }
    return null
  }

  const trendDisplay = getTrendDisplay()

  // Get initials for avatar
  const getInitials = () => {
    const name = relationship.other_party.full_name || relationship.other_party.name || 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.charAt(0).toUpperCase()
  }

  // Format last activity text
  const getLastActivityText = () => {
    if (metrics.daysSinceLastActivity === null) {
      return 'No activity yet'
    }
    if (metrics.daysSinceLastActivity === 0) {
      return 'Active today'
    }
    if (metrics.daysSinceLastActivity === 1) {
      return '1 day ago'
    }
    return `${metrics.daysSinceLastActivity} days ago`
  }

  // List view - compact horizontal layout
  if (viewMode === 'list') {
    return (
      <div
        className={classNames(
          'flex items-center gap-4 p-3 rounded-lg border transition-colors',
          'hover:bg-content2',
          metrics.needsAttention
            ? 'border-warning/50 bg-warning/5'
            : 'border-divider bg-content1/50'
        )}
        data-testid={`athlete-card-${relationship.other_party.id}`}
      >
        {/* Avatar */}
        <Avatar
          name={getInitials()}
          size="sm"
          className={classNames(
            'flex-shrink-0',
            metrics.needsAttention ? 'ring-2 ring-warning ring-offset-2' : ''
          )}
          classNames={{
            base: 'bg-primary',
            name: 'text-white font-semibold text-xs',
          }}
        />

        {/* Name & Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate text-sm">
              {relationship.other_party.full_name || relationship.other_party.name || 'User'}
            </span>
            <Chip size="sm" color={getStatusColor()} variant="flat" className="capitalize text-xs">
              {getStatusLabel()}
            </Chip>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center min-w-[60px]">
            <div className="font-semibold text-foreground">
              {metrics.weeklyMileage.toFixed(1)} mi
            </div>
            <div className="text-xs text-foreground-500">This week</div>
          </div>
          <div className="text-center min-w-[50px]">
            <div className="font-semibold text-foreground">{metrics.completionRate}%</div>
            <div className="text-xs text-foreground-500">Complete</div>
          </div>
          {trendDisplay && (
            <div className={classNames('flex items-center gap-1', trendDisplay.color)}>
              <trendDisplay.icon className="w-4 h-4" />
              <span className="text-xs font-medium">
                {metrics.trend > 0 ? '+' : ''}
                {metrics.trend}%
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <Tooltip content="Send Message">
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              color="success"
              onPress={handleSendMessage}
              aria-label="Send message"
              data-testid={`message-btn-${relationship.other_party.id}`}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="View Progress">
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              color="primary"
              onPress={handleViewProgress}
              aria-label="View progress"
              data-testid={`progress-btn-${relationship.other_party.id}`}
            >
              <ChartBarIcon className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
    )
  }

  // Grid view - detailed card layout
  return (
    <Card
      shadow="sm"
      className={classNames(
        'transition-all duration-200 hover:shadow-md',
        metrics.needsAttention ? 'border-2 border-warning/50 bg-warning/5' : ''
      )}
      data-testid={`athlete-card-${relationship.other_party.id}`}
    >
      <CardBody className="p-4">
        {/* Header: Avatar, Name, Status */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar
            name={getInitials()}
            size="md"
            className={classNames(
              metrics.needsAttention ? 'ring-2 ring-warning ring-offset-2' : ''
            )}
            classNames={{
              base: 'bg-primary',
              name: 'text-white font-semibold',
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground truncate">
                {relationship.other_party.full_name || relationship.other_party.name || 'User'}
              </h4>
              <Chip size="sm" color={getStatusColor()} variant="flat" className="capitalize">
                {getStatusLabel()}
              </Chip>
            </div>
            <p className="text-xs text-foreground-500 truncate">{relationship.other_party.email}</p>
          </div>

          {/* Needs attention indicator */}
          {metrics.needsAttention && (
            <Tooltip content={`No activity for ${metrics.daysSinceLastActivity || 'N/A'} days`}>
              <div className="p-1.5 rounded-full bg-warning/20">
                <ExclamationTriangleIcon className="w-4 h-4 text-warning" />
              </div>
            </Tooltip>
          )}
        </div>

        {/* Metrics Section */}
        <div className="space-y-3 mb-4">
          {/* Weekly Mileage with Trend */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-600">Weekly Mileage</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {metrics.weeklyMileage.toFixed(1)} mi
              </span>
              {trendDisplay && (
                <div
                  className={classNames(
                    'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium',
                    trendDisplay.bgColor,
                    trendDisplay.color
                  )}
                >
                  <trendDisplay.icon className="w-3 h-3" />
                  <span>
                    {metrics.trend > 0 ? '+' : ''}
                    {metrics.trend}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Completion Rate Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-foreground-600">Completion Rate</span>
              <span className="text-sm font-medium text-foreground">{metrics.completionRate}%</span>
            </div>
            <Progress
              value={metrics.completionRate}
              size="sm"
              color={
                metrics.completionRate >= 80
                  ? 'success'
                  : metrics.completionRate >= 50
                    ? 'primary'
                    : 'warning'
              }
              aria-label="Workout completion rate"
              classNames={{
                track: 'bg-default-100',
              }}
            />
            <div className="flex justify-between text-xs text-foreground-500 mt-1">
              <span>
                {metrics.completedWorkoutsThisWeek}/{metrics.totalWorkoutsThisWeek} workouts
              </span>
              <span>{getLastActivityText()}</span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            color="success"
            className="flex-1"
            startContent={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
            onPress={handleSendMessage}
            data-testid={`message-btn-${relationship.other_party.id}`}
          >
            Message
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            className="flex-1"
            startContent={<CalendarDaysIcon className="w-4 h-4" />}
            onPress={handleScheduleWorkout}
            data-testid={`schedule-btn-${relationship.other_party.id}`}
          >
            Schedule
          </Button>
          <Tooltip content="View Progress">
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              color="default"
              onPress={handleViewProgress}
              aria-label="View progress"
              data-testid={`progress-btn-${relationship.other_party.id}`}
            >
              <ChartBarIcon className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      </CardBody>
    </Card>
  )
}

// Memoize to prevent unnecessary re-renders
export const AthleteCard = memo(AthleteCardComponent)
export default AthleteCard
