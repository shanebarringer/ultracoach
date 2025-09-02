'use client'

import { Button, Card, CardBody, CardHeader, Chip, Progress, Spinner } from '@heroui/react'
import { useAtom } from 'jotai'
import { loadable } from 'jotai/utils'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MapPin,
  RefreshCw,
  Zap,
} from 'lucide-react'

import { memo, useCallback, useMemo, useState } from 'react'

import { useStravaOAuthReturn } from '@/hooks/useStravaOAuthReturn'
import {
  stravaActionsAtom,
  stravaActivitiesRefreshableAtom,
  stravaConnectionStatusAtom,
  stravaStateAtom,
  syncStatsAtom,
  triggerWorkoutMatchingAtom,
  workoutStravaShowPanelAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'
import type { StravaActivity } from '@/types/strava'

const logger = createLogger('StravaDashboardWidget')

interface StravaDashboardWidgetProps {
  className?: string
}

interface ProcessedActivity {
  id: number
  name: string
  date: string
  distance: string
  duration: number
  location?: string
}

/**
 * Strava integration widget for the runner dashboard
 * Provides quick access to sync status, recent activities, and connection management
 */
const StravaDashboardWidget = memo(({ className = '' }: StravaDashboardWidgetProps) => {
  const [stravaState] = useAtom(stravaStateAtom)
  const [connectionStatusLoadable] = useAtom(loadable(stravaConnectionStatusAtom))
  const [, refreshActivities] = useAtom(stravaActivitiesRefreshableAtom)
  const [syncStats] = useAtom(syncStatsAtom)
  const [, setShowStravaPanel] = useAtom(workoutStravaShowPanelAtom)
  const [, dispatchStravaAction] = useAtom(stravaActionsAtom)
  const [, triggerMatching] = useAtom(triggerWorkoutMatchingAtom)
  const [isSyncing, setIsSyncing] = useState(false)

  // Handle OAuth return and refresh status
  useStravaOAuthReturn()

  // Connection status indicator
  const connectionInfo = useMemo(() => {
    if (connectionStatusLoadable.state === 'loading') {
      return {
        color: 'warning' as const,
        text: 'Checking...',
        icon: <Spinner size="sm" />,
        description: 'Verifying connection status',
      }
    }
    if (connectionStatusLoadable.state === 'hasError') {
      return {
        color: 'danger' as const,
        text: 'Error',
        icon: <Zap className="h-4 w-4" />,
        description: 'Failed to check connection status',
      }
    }

    const connectionStatus =
      connectionStatusLoadable.state === 'hasData' ? connectionStatusLoadable.data : null

    if (connectionStatus?.connected || stravaState.connection?.isConnected) {
      return {
        color: 'success' as const,
        text: 'Connected',
        icon: <Activity className="h-4 w-4" />,
        description: 'Your Strava account is linked',
      }
    }
    return {
      color: 'danger' as const,
      text: 'Not Connected',
      icon: <Zap className="h-4 w-4" />,
      description: 'Connect to sync your activities',
    }
  }, [connectionStatusLoadable, stravaState.connection?.isConnected])

  // Recent activities for quick overview
  const recentActivities = useMemo(() => {
    if (!stravaState.activities) return []
    return stravaState.activities
      .filter((activity: StravaActivity) => activity.type === 'Run')
      .slice(0, 3)
      .map((activity: StravaActivity) => ({
        id: activity.id,
        name: activity.name,
        date: new Date(activity.start_date).toLocaleDateString(),
        distance: (activity.distance / 1000).toFixed(1),
        duration: Math.round(activity.moving_time / 60),
        location: activity.location_city,
      }))
  }, [stravaState.activities])

  // Sync progress calculation
  const syncProgress = useMemo(() => {
    if (syncStats.total === 0) return 0
    return Math.round((syncStats.synced / syncStats.total) * 100)
  }, [syncStats])

  // Handler functions
  const handleConnectStrava = useCallback(() => {
    logger.info('Initiating Strava connection from dashboard widget')
    const currentUrl = window.location.pathname
    window.location.href = `/api/strava/connect?returnUrl=${encodeURIComponent(currentUrl)}`
  }, [])

  const handleSyncActivities = useCallback(async () => {
    logger.info('Manual sync triggered from dashboard widget')
    setIsSyncing(true)
    try {
      // First fetch fresh activities from Strava API
      logger.debug('Fetching fresh activities from Strava...')
      await refreshActivities()

      // Trigger workout matching to find planned vs actual discrepancies
      logger.debug('Triggering workout matching for diffing analysis...')
      await triggerMatching()

      // Auto-sync the most recent running activities (last 3)
      logger.debug('Checking activities for sync', {
        hasActivities: !!stravaState.activities,
        activityCount: stravaState.activities?.length || 0,
        stravaState: {
          connection: stravaState.connection,
          loading: stravaState.loading,
          error: stravaState.error,
        },
      })

      if (stravaState.activities && stravaState.activities.length > 0) {
        const recentRuns = stravaState.activities
          .filter((activity: StravaActivity) => activity.type === 'Run')
          .slice(0, 3)

        logger.info('Auto-syncing recent running activities', {
          count: recentRuns.length,
          activityIds: recentRuns.map((a: StravaActivity) => a.id),
        })

        // Dispatch sync actions for each recent run
        for (const activity of recentRuns) {
          dispatchStravaAction({
            type: 'SYNC_ACTIVITY',
            payload: {
              activityId: activity.id.toString(), // Keep as string for atom key
              syncAsWorkout: true,
            },
          })
        }

        toast.success(`Syncing ${recentRuns.length} recent runs to workouts`)
      }

      logger.info('Successfully refreshed and syncing activities from Strava')
    } catch (error) {
      logger.error('Failed to sync activities:', error)
      toast.error('Failed to sync Strava activities')
      throw error
    } finally {
      setIsSyncing(false)
    }
  }, [
    refreshActivities,
    triggerMatching,
    stravaState.activities,
    stravaState.connection,
    stravaState.error,
    stravaState.loading,
    dispatchStravaAction,
  ])

  const handleOpenStravaPanel = useCallback(() => {
    logger.debug('Opening Strava workout panel from dashboard widget')
    setShowStravaPanel(true)
    // Navigate to workouts page for full integration
    window.location.href = '/workouts'
  }, [setShowStravaPanel])

  const handleViewActivity = useCallback((activityId: string) => {
    window.open(`https://www.strava.com/activities/${activityId}`, '_blank')
  }, [])

  return (
    <Card className={`h-fit ${className}`} data-testid="strava-dashboard-widget">
      <CardHeader>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Strava Sync</h2>
          </div>
          <Chip
            size="sm"
            color={connectionInfo.color}
            variant="flat"
            startContent={connectionInfo.icon}
          >
            {connectionInfo.text}
          </Chip>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {!(
          connectionStatusLoadable.state === 'hasData' && connectionStatusLoadable.data?.connected
        ) && !stravaState.connection?.isConnected ? (
          // Connection Setup State
          <div className="text-center py-4">
            <Zap className="h-12 w-12 text-warning mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Connect Your Strava</h3>
            <p className="text-sm text-foreground-600 mb-4">{connectionInfo.description}</p>
            <Button
              onPress={handleConnectStrava}
              className="w-full bg-[#FC4C02] hover:bg-[#E8440B] text-white font-medium"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect to Strava
            </Button>
          </div>
        ) : (
          <>
            {/* Sync Overview */}
            {syncStats.total > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Sync Progress</span>
                  <span className="text-sm text-foreground-600">{syncProgress}%</span>
                </div>
                <Progress value={syncProgress} color="success" size="sm" className="w-full" />
                <div className="flex justify-between text-xs text-foreground-600">
                  <span>{syncStats.synced} synced</span>
                  <span>{syncStats.total} total activities</span>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="bordered"
                color="primary"
                className="flex-1"
                onPress={handleSyncActivities}
                isLoading={isSyncing || stravaState.loading}
                startContent={<RefreshCw className="h-4 w-4" />}
              >
                Sync Now
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="secondary"
                className="flex-1"
                onPress={handleOpenStravaPanel}
                startContent={<Activity className="h-4 w-4" />}
              >
                View Details
              </Button>
            </div>

            {/* Recent Activities */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-foreground">Recent Runs</h4>
                {recentActivities.length > 0 && (
                  <Button
                    size="sm"
                    variant="light"
                    onPress={handleSyncActivities}
                    isIconOnly
                    aria-label="Refresh activities"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {stravaState.loading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-foreground-400 mx-auto mb-2" />
                  <p className="text-sm text-foreground-600">No recent runs found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivities.map((activity: ProcessedActivity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-content2 hover:bg-content3 transition-colors cursor-pointer"
                      onClick={() => handleViewActivity(activity.id.toString())}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.name}</p>
                        <div className="flex items-center gap-3 text-xs text-foreground-600">
                          <span>{activity.distance}km</span>
                          <span>{activity.duration}min</span>
                          {activity.location && (
                            <>
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{activity.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-600">{activity.date}</span>
                        <ExternalLink className="h-3 w-3 text-foreground-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Footer */}
            <div className="pt-3 border-t border-divider">
              <div className="flex justify-between items-center text-xs text-foreground-600">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  <span>Auto-sync enabled</span>
                </div>
                <Button
                  size="sm"
                  variant="light"
                  className="text-xs h-6"
                  onPress={handleOpenStravaPanel}
                >
                  Manage
                </Button>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
})

StravaDashboardWidget.displayName = 'StravaDashboardWidget'

export default StravaDashboardWidget
