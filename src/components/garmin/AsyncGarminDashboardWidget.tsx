'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Progress,
  Spinner,
  useDisclosure,
} from '@heroui/react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Upload,
  Watch,
} from 'lucide-react'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import {
  garminActionsAtom,
  garminConnectionStatusAtom,
  garminStateAtom,
  garminSyncStatsAtom,
} from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

import GarminSyncProgress, { type SyncProgressItem } from './GarminSyncProgress'

const logger = createLogger('AsyncGarminDashboardWidget')

interface AsyncGarminDashboardWidgetProps {
  className?: string
}

interface ProcessedWorkout {
  id: string
  name: string
  date: string
  distance: string
  duration: number
  syncStatus: 'synced' | 'pending' | 'failed'
}

interface ApiWorkout {
  id: string
  date: string
  planned_type?: string
  planned_distance?: number
  planned_distance_unit?: string
  planned_duration?: number
  garmin_workout_id?: string
}

/**
 * Async Garmin integration widget that uses Suspense
 * This component reads from async atoms directly and throws promises
 */
const AsyncGarminDashboardWidget = memo(({ className = '' }: AsyncGarminDashboardWidgetProps) => {
  // Optimize Jotai hooks: use useAtomValue for read-only, useSetAtom for write-only
  const garminState = useAtomValue(garminStateAtom)
  const connectionStatus = useAtomValue(garminConnectionStatusAtom)
  const syncStats = useAtomValue(garminSyncStatsAtom)

  const dispatchGarminAction = useSetAtom(garminActionsAtom)

  const [isSyncing, setIsSyncing] = useState(false)
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<ProcessedWorkout[]>([])
  const [syncItems, setSyncItems] = useState<SyncProgressItem[]>([])

  // Modal for sync progress
  const {
    isOpen: isSyncModalOpen,
    onOpen: onSyncModalOpen,
    onClose: onSyncModalClose,
  } = useDisclosure()

  // Fetch upcoming workouts on mount and when connection changes
  useEffect(() => {
    if (connectionStatus?.connected || garminState.isConnected) {
      fetchUpcomingWorkouts()
    }
  }, [connectionStatus?.connected, garminState.isConnected, fetchUpcomingWorkouts])

  // Fetch upcoming workouts (next 7 days)
  const fetchUpcomingWorkouts = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const response = await fetch(
        `/api/workouts?start_date=${today}&end_date=${weekFromNow}&limit=3`,
        {
          credentials: 'same-origin',
        }
      )

      if (!response.ok) {
        logger.warn('Failed to fetch upcoming workouts', {
          status: response.status,
          statusText: response.statusText,
        })
        return
      }

      const data = await response.json()
      const workouts = (data.workouts || []).map((workout: ApiWorkout) => ({
        id: workout.id,
        name: workout.planned_type || 'Workout',
        date: new Date(workout.date).toLocaleDateString(),
        distance: workout.planned_distance
          ? `${workout.planned_distance}${workout.planned_distance_unit || 'mi'}`
          : 'N/A',
        duration: workout.planned_duration || 0,
        syncStatus: workout.garmin_workout_id ? 'synced' : 'pending',
      }))

      setUpcomingWorkouts(workouts)
    } catch (error) {
      logger.error('Failed to fetch upcoming workouts:', error)
    }
  }, [])

  // Connection status indicator
  const connectionInfo = useMemo(() => {
    if (connectionStatus?.connected || garminState.isConnected) {
      return {
        color: 'success' as const,
        text: 'Connected',
        icon: <Watch className="h-4 w-4" />,
        description: 'Your Garmin account is linked',
      }
    }
    return {
      color: 'danger' as const,
      text: 'Not Connected',
      icon: <Activity className="h-4 w-4" />,
      description: 'Connect to sync your workouts',
    }
  }, [connectionStatus, garminState.isConnected])

  // Sync progress calculation
  const syncProgress = useMemo(() => {
    if (syncStats.total === 0) return 0
    return Math.round((syncStats.synced / syncStats.total) * 100)
  }, [syncStats])

  // Handler functions
  const handleConnectGarmin = useCallback(() => {
    logger.info('Initiating Garmin connection from dashboard widget')
    const currentUrl = window.location.pathname
    window.location.href = `/api/garmin/connect?returnUrl=${encodeURIComponent(currentUrl)}`
  }, [])

  const handleSyncWorkouts = useCallback(async () => {
    logger.info('Manual sync triggered from dashboard widget')
    setIsSyncing(true)
    try {
      // Sync upcoming workouts to Garmin
      if (upcomingWorkouts.length > 0) {
        const workoutsToSync = upcomingWorkouts.filter(w => w.syncStatus !== 'synced')

        if (workoutsToSync.length > 0) {
          logger.debug('Syncing workouts to Garmin', { count: workoutsToSync.length })

          // Initialize sync items with pending status
          const initialSyncItems: SyncProgressItem[] = workoutsToSync.map(workout => ({
            id: workout.id,
            name: workout.name,
            status: 'pending' as const,
          }))
          setSyncItems(initialSyncItems)
          onSyncModalOpen()

          // Sync workouts one by one with progress updates
          for (let i = 0; i < workoutsToSync.length; i++) {
            const workout = workoutsToSync[i]

            // Update to syncing status
            setSyncItems(prev =>
              prev.map(item =>
                item.id === workout.id ? { ...item, status: 'syncing' as const } : item
              )
            )

            try {
              // Dispatch individual sync action
              dispatchGarminAction({
                type: 'SYNC_BULK',
                payload: {
                  workouts: [workout.id],
                },
              })

              // Small delay to allow sync to process
              await new Promise(resolve => setTimeout(resolve, 500))

              // Update to success status
              setSyncItems(prev =>
                prev.map(item =>
                  item.id === workout.id ? { ...item, status: 'success' as const } : item
                )
              )
            } catch (error) {
              // Update to error status
              setSyncItems(prev =>
                prev.map(item =>
                  item.id === workout.id
                    ? { ...item, status: 'error' as const, error: 'Sync failed' }
                    : item
                )
              )
              logger.error('Failed to sync workout:', { workoutId: workout.id, error })
            }
          }

          toast.success(`Synced ${workoutsToSync.length} workouts to Garmin`)
        } else {
          toast.info('All workouts are already synced')
        }
      }

      // Refresh the workout list
      await fetchUpcomingWorkouts()

      logger.info('Successfully synced workouts to Garmin')
    } catch (error) {
      logger.error('Failed to sync workouts:', error)
      toast.error('Failed to sync workouts to Garmin')
    } finally {
      setIsSyncing(false)
    }
  }, [upcomingWorkouts, dispatchGarminAction, fetchUpcomingWorkouts, onSyncModalOpen])

  const handleViewSettings = useCallback(() => {
    logger.debug('Opening Garmin settings from dashboard widget')
    window.location.href = '/settings?tab=integrations'
  }, [])

  return (
    <Card className={`h-fit ${className}`} data-testid="garmin-dashboard-widget">
      <CardHeader>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Watch className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Garmin Sync</h2>
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
        {!connectionStatus?.connected && !garminState.isConnected ? (
          // Connection Setup State
          <div className="text-center py-4">
            <Watch className="h-12 w-12 text-warning mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Connect Your Garmin</h3>
            <p className="text-sm text-foreground-600 mb-4">{connectionInfo.description}</p>
            <Button
              onPress={handleConnectGarmin}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect to Garmin
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
                  <span>{syncStats.total} total workouts</span>
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
                onPress={handleSyncWorkouts}
                isLoading={isSyncing || garminState.loading}
                startContent={<RefreshCw className="h-4 w-4" />}
              >
                Sync Now
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="secondary"
                className="flex-1"
                onPress={handleViewSettings}
                startContent={<Activity className="h-4 w-4" />}
              >
                View Details
              </Button>
            </div>

            {/* Upcoming Workouts */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-foreground">Upcoming Workouts</h4>
                {upcomingWorkouts.length > 0 && (
                  <Button
                    size="sm"
                    variant="light"
                    onPress={fetchUpcomingWorkouts}
                    isIconOnly
                    aria-label="Refresh workouts"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {garminState.loading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : upcomingWorkouts.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-foreground-400 mx-auto mb-2" />
                  <p className="text-sm text-foreground-600">No upcoming workouts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingWorkouts.map((workout: ProcessedWorkout) => (
                    <div
                      key={workout.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-content2 hover:bg-content3 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{workout.name}</p>
                        <div className="flex items-center gap-3 text-xs text-foreground-600">
                          <span>{workout.distance}</span>
                          <span>{workout.duration}min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-600">{workout.date}</span>
                        {workout.syncStatus === 'synced' && (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        )}
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
                  onPress={handleViewSettings}
                >
                  Manage
                </Button>
              </div>
            </div>
          </>
        )}
      </CardBody>

      {/* Sync Progress Modal */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={onSyncModalClose}
        size="2xl"
        scrollBehavior="inside"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <span>Syncing Workouts to Garmin</span>
          </ModalHeader>
          <ModalBody className="pb-6">
            <GarminSyncProgress items={syncItems} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  )
})

AsyncGarminDashboardWidget.displayName = 'AsyncGarminDashboardWidget'

export default AsyncGarminDashboardWidget
