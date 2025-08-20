'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Progress,
  Spinner,
  Switch,
} from '@heroui/react'
import { useAtom } from 'jotai'
import { loadable } from 'jotai/utils'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react'

import { memo, useCallback, useEffect, useMemo } from 'react'

import {
  stravaActivitiesRefreshableAtom,
  stravaConnectionStatusAtom,
  stravaStateAtom,
  syncStatsAtom,
  workoutStravaShowPanelAtom,
} from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import type { StravaActivity } from '@/types/strava'

const logger = createLogger('StravaWorkoutPanel')

interface StravaWorkoutPanelProps {
  className?: string
}

/**
 * Collapsible Strava integration panel for the workout page
 * Provides quick access to Strava sync, recent activities, and connection status
 */
const StravaWorkoutPanel = memo(({ className = '' }: StravaWorkoutPanelProps) => {
  const [showPanel, setShowPanel] = useAtom(workoutStravaShowPanelAtom)
  const [stravaState] = useAtom(stravaStateAtom)
  const [connectionStatusLoadable] = useAtom(loadable(stravaConnectionStatusAtom))
  const [, refreshActivities] = useAtom(stravaActivitiesRefreshableAtom)
  const [syncStats] = useAtom(syncStatsAtom)

  // Auto-refresh activities when panel opens
  useEffect(() => {
    if (showPanel && stravaState.connection?.isConnected) {
      logger.debug('Panel opened - refreshing Strava activities')
      refreshActivities()
    }
  }, [showPanel, stravaState.connection?.isConnected, refreshActivities])

  const handleTogglePanel = useCallback(() => {
    logger.debug('Toggling Strava panel', { currentState: showPanel })
    setShowPanel(!showPanel)
  }, [showPanel, setShowPanel])

  const handleSyncActivities = useCallback(async () => {
    logger.info('Manual sync triggered from workout panel')
    try {
      await refreshActivities()
      // Future: Trigger actual sync with backend
    } catch (error) {
      logger.error('Failed to sync activities:', error)
    }
  }, [refreshActivities])

  const handleConnectStrava = useCallback(() => {
    logger.info('Initiating Strava connection from workout panel')
    const currentUrl = window.location.pathname
    window.location.href = `/api/strava/connect?returnUrl=${encodeURIComponent(currentUrl)}`
  }, [])

  // Recent activities for display
  const recentActivities = useMemo(() => {
    if (!stravaState.activities) return []
    return stravaState.activities
      .filter((activity: StravaActivity) => activity.type === 'Run')
      .slice(0, 3)
  }, [stravaState.activities])

  // Connection status indicator
  const connectionIndicator = useMemo(() => {
    if (connectionStatusLoadable.state === 'loading') {
      return { color: 'warning' as const, text: 'Checking...', icon: <Spinner size="sm" /> }
    }

    const connectionStatus =
      connectionStatusLoadable.state === 'hasData' ? connectionStatusLoadable.data : null

    if (connectionStatus?.connected || stravaState.connection?.isConnected) {
      return {
        color: 'success' as const,
        text: 'Connected',
        icon: <Activity className="h-4 w-4" />,
      }
    }
    return { color: 'danger' as const, text: 'Disconnected', icon: <Zap className="h-4 w-4" /> }
  }, [connectionStatusLoadable, stravaState.connection?.isConnected])

  return (
    <div className={`relative ${className}`}>
      {/* Enhanced Alpine Toggle Button */}
      <Button
        isIconOnly
        variant="shadow"
        color="primary"
        className={`fixed top-1/2 transform -translate-y-1/2 z-20 transition-all duration-300 shadow-lg border border-primary/20 bg-gradient-to-br from-primary/90 to-secondary/90 hover:shadow-xl hover:scale-110 ${
          showPanel ? 'right-80' : 'right-4'
        }`}
        onPress={handleTogglePanel}
        aria-label={showPanel ? 'Close Strava panel' : 'Open Strava panel'}
      >
        {showPanel ? (
          <ChevronRight className="h-5 w-5 text-white" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-white" />
        )}
      </Button>

      {/* Enhanced Alpine Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-gradient-to-b from-background via-content1/50 to-background border-l-4 border-l-primary/60 shadow-2xl transform transition-transform duration-300 ease-in-out z-10 backdrop-blur-sm ${
          showPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Enhanced Alpine Header */}
          <div className="flex-shrink-0 p-4 border-b border-divider bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Strava Sync</h3>
                  <p className="text-xs text-foreground-600">🏔️ Alpine Integration</p>
                </div>
              </div>
              <Chip
                size="sm"
                color={connectionIndicator.color}
                variant="shadow"
                startContent={connectionIndicator.icon}
                className="font-medium"
              >
                {connectionIndicator.text}
              </Chip>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {stravaState.connection?.isConnected ? (
                <Button
                  variant="solid"
                  color="primary"
                  size="sm"
                  startContent={<RefreshCw className="h-4 w-4" />}
                  onPress={handleSyncActivities}
                  isLoading={stravaState.loading}
                  className="flex-1"
                >
                  Sync Now
                </Button>
              ) : (
                <Button
                  variant="solid"
                  color="primary"
                  size="sm"
                  startContent={<ExternalLink className="h-4 w-4" />}
                  onPress={handleConnectStrava}
                  className="flex-1"
                >
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!(
              connectionStatusLoadable.state === 'hasData' &&
              connectionStatusLoadable.data?.connected
            ) && !stravaState.connection?.isConnected ? (
              // Connection Setup
              <Card>
                <CardBody className="text-center py-8">
                  <Zap className="h-12 w-12 text-warning mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Connect Your Strava</h4>
                  <p className="text-sm text-foreground-600 mb-4">
                    Automatically sync your runs and compare planned vs actual workouts.
                  </p>
                  <Button color="primary" onPress={handleConnectStrava} className="w-full">
                    Connect to Strava
                  </Button>
                </CardBody>
              </Card>
            ) : (
              <>
                {/* Sync Stats */}
                {syncStats.total > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Sync Overview
                      </h4>
                    </CardHeader>
                    <CardBody className="pt-0 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground-600">Activities</span>
                        <span className="font-medium">{syncStats.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground-600">Synced</span>
                        <span className="font-medium text-success">{syncStats.synced}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground-600">Pending</span>
                        <span className="font-medium text-warning">{syncStats.pending}</span>
                      </div>
                      {syncStats.total > 0 && (
                        <Progress
                          value={(syncStats.synced / syncStats.total) * 100}
                          color="success"
                          size="sm"
                          className="mt-2"
                        />
                      )}
                    </CardBody>
                  </Card>
                )}

                {/* Recent Activities */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center w-full">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Recent Runs
                      </h4>
                      {recentActivities.length > 0 && (
                        <Button
                          variant="light"
                          size="sm"
                          onPress={handleSyncActivities}
                          isIconOnly
                          aria-label="Refresh activities"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardBody className="pt-0">
                    {stravaState.loading ? (
                      <div className="flex justify-center py-4">
                        <Spinner size="sm" />
                      </div>
                    ) : recentActivities.length === 0 ? (
                      <div className="text-center py-4">
                        <Clock className="h-8 w-8 text-foreground-400 mx-auto mb-2" />
                        <p className="text-sm text-foreground-600">No recent runs found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentActivities.map((activity: StravaActivity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-content2 hover:bg-content3 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{activity.name}</p>
                              <div className="flex items-center gap-2 text-xs text-foreground-600">
                                <span>{(activity.distance / 1000).toFixed(1)}km</span>
                                <span>•</span>
                                <span>{Math.round(activity.moving_time / 60)}min</span>
                                {activity.location_city && (
                                  <>
                                    <span>•</span>
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{activity.location_city}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              as="a"
                              href={`https://www.strava.com/activities/${activity.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="View on Strava"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Auto-sync Settings */}
                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="text-sm font-semibold">Sync Settings</h4>
                  </CardHeader>
                  <CardBody className="pt-0 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Auto-sync activities</p>
                        <p className="text-xs text-foreground-600">Automatically import new runs</p>
                      </div>
                      <Switch size="sm" defaultSelected />
                    </div>
                    <Divider />
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Match workouts</p>
                        <p className="text-xs text-foreground-600">Auto-match planned workouts</p>
                      </div>
                      <Switch size="sm" defaultSelected />
                    </div>
                  </CardBody>
                </Card>
              </>
            )}
          </div>

          {/* Footer */}
          {((connectionStatusLoadable.state === 'hasData' &&
            connectionStatusLoadable.data?.connected) ||
            stravaState.connection?.isConnected) && (
            <div className="flex-shrink-0 p-4 border-t border-divider bg-content1">
              <div className="flex items-center justify-between text-xs text-foreground-600">
                <span>Last sync: Never</span>
                <Button
                  variant="light"
                  size="sm"
                  className="text-xs h-6"
                  onPress={() => {
                    // Future: Open detailed Strava browser modal
                    logger.info('Opening detailed Strava activity browser')
                  }}
                >
                  View All
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {showPanel && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-0"
          onClick={handleTogglePanel}
          aria-hidden="true"
        />
      )}
    </div>
  )
})

StravaWorkoutPanel.displayName = 'StravaWorkoutPanel'

export default StravaWorkoutPanel
