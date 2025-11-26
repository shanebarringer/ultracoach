'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Progress,
  Spinner,
  useDisclosure,
} from '@heroui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Upload, Watch } from 'lucide-react'

import { memo, useCallback, useEffect, useState } from 'react'

import {
  garminActionsAtom,
  garminConnectionStatusAtom,
  garminStateAtom,
  garminSyncStatsAtom,
  workoutGarminShowPanelAtom,
} from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

import GarminSyncProgress, { type SyncProgressItem } from './GarminSyncProgress'

const logger = createLogger('GarminWorkoutPanel')

interface GarminWorkoutPanelProps {
  className?: string
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
 * Collapsible Garmin integration panel for the workout page
 * Provides quick access to Garmin sync, upcoming workouts, and connection status
 */
const GarminWorkoutPanel = memo(({ className = '' }: GarminWorkoutPanelProps) => {
  const [showPanel, setShowPanel] = useAtom(workoutGarminShowPanelAtom)
  const garminState = useAtomValue(garminStateAtom)
  const connectionStatus = useAtomValue(garminConnectionStatusAtom)
  const syncStats = useAtomValue(garminSyncStatsAtom)
  const dispatchGarminAction = useSetAtom(garminActionsAtom)

  const [isSyncing, setIsSyncing] = useState(false)
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<ApiWorkout[]>([])
  const [syncItems, setSyncItems] = useState<SyncProgressItem[]>([])

  // Modal for sync progress
  const {
    isOpen: isSyncModalOpen,
    onOpen: onSyncModalOpen,
    onClose: onSyncModalClose,
  } = useDisclosure()

  const fetchUpcomingWorkouts = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const response = await fetch(
        `/api/workouts?start_date=${today}&end_date=${weekFromNow}&limit=10`,
        {
          credentials: 'same-origin',
        }
      )

      if (!response.ok) {
        logger.warn('Failed to fetch upcoming workouts', { status: response.status })
        return
      }

      const data = await response.json()
      setUpcomingWorkouts(data.workouts || [])
    } catch (error) {
      logger.error('Failed to fetch upcoming workouts:', error)
    }
  }, [])

  // Fetch upcoming workouts when panel opens
  useEffect(() => {
    if (showPanel && (connectionStatus?.connected || garminState.isConnected)) {
      logger.debug('Panel opened - fetching upcoming workouts')
      fetchUpcomingWorkouts()
    }
  }, [showPanel, connectionStatus?.connected, garminState.isConnected, fetchUpcomingWorkouts])

  const handleTogglePanel = useCallback(() => {
    logger.debug('Toggling Garmin panel', { currentState: showPanel })
    setShowPanel(!showPanel)
  }, [showPanel, setShowPanel])

  const handleSyncWorkout = useCallback(
    async (workoutId: string) => {
      logger.info('Syncing single workout to Garmin', { workoutId })
      setIsSyncing(true)
      try {
        dispatchGarminAction({
          type: 'SYNC_WORKOUT',
          payload: { workoutId },
        })

        toast.success('Workout synced to Garmin')
        await fetchUpcomingWorkouts() // Refresh to show sync status
      } catch (error) {
        logger.error('Failed to sync workout:', error)
        toast.error('Failed to sync workout to Garmin')
      } finally {
        setIsSyncing(false)
      }
    },
    [dispatchGarminAction, fetchUpcomingWorkouts]
  )

  const handleSyncAll = useCallback(async () => {
    logger.info('Syncing all upcoming workouts to Garmin')
    setIsSyncing(true)
    try {
      const workoutsToSync = upcomingWorkouts.filter(w => !w.garmin_workout_id)

      if (workoutsToSync.length === 0) {
        toast.info('All workouts are already synced')
        setIsSyncing(false)
        return
      }

      logger.debug('Syncing workouts to Garmin', { count: workoutsToSync.length })

      // Initialize sync items with pending status
      const initialSyncItems: SyncProgressItem[] = workoutsToSync.map(workout => ({
        id: workout.id,
        name: workout.planned_type || 'Workout',
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
            payload: { workouts: [workout.id] },
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
      await fetchUpcomingWorkouts() // Refresh to show sync status
    } catch (error) {
      logger.error('Failed to sync workouts:', error)
      toast.error('Failed to sync workouts to Garmin')
    } finally {
      setIsSyncing(false)
    }
  }, [upcomingWorkouts, dispatchGarminAction, fetchUpcomingWorkouts, onSyncModalOpen])

  const handleConnectGarmin = useCallback(() => {
    logger.info('Redirecting to Garmin connection')
    window.location.href = '/api/garmin/connect?returnUrl=/workouts'
  }, [])

  const syncProgress = syncStats.total > 0 ? (syncStats.synced / syncStats.total) * 100 : 0

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <Button
        size="sm"
        variant="flat"
        className="absolute -left-10 top-4 z-10"
        onPress={handleTogglePanel}
        isIconOnly
        aria-label={showPanel ? 'Hide Garmin panel' : 'Show Garmin panel'}
      >
        {showPanel ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Panel Content */}
      {showPanel && (
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <Watch className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Garmin Sync</h3>
              </div>
              <Chip
                size="sm"
                color={connectionStatus?.connected ? 'success' : 'danger'}
                variant="flat"
              >
                {connectionStatus?.connected ? 'Connected' : 'Not Connected'}
              </Chip>
            </div>
          </CardHeader>

          <Divider />

          <CardBody className="space-y-4">
            {!connectionStatus?.connected ? (
              // Not Connected State
              <div className="text-center py-6">
                <Watch className="h-12 w-12 text-warning mx-auto mb-4" />
                <p className="text-sm text-foreground-600 mb-4">
                  Connect your Garmin account to sync workouts
                </p>
                <Button
                  onPress={handleConnectGarmin}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                >
                  Connect Garmin
                </Button>
              </div>
            ) : (
              <>
                {/* Sync Progress */}
                {syncStats.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sync Progress</span>
                      <span>{Math.round(syncProgress)}%</span>
                    </div>
                    <Progress value={syncProgress} color="success" size="sm" />
                    <div className="flex justify-between text-xs text-foreground-600">
                      <span>{syncStats.synced} synced</span>
                      <span>{syncStats.total} total</span>
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
                    onPress={handleSyncAll}
                    isLoading={isSyncing}
                    startContent={<Upload className="h-4 w-4" />}
                  >
                    Sync All
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="secondary"
                    className="flex-1"
                    onPress={fetchUpcomingWorkouts}
                    startContent={<RefreshCw className="h-4 w-4" />}
                  >
                    Refresh
                  </Button>
                </div>

                <Divider />

                {/* Upcoming Workouts List */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Upcoming Workouts (Next 7 Days)</h4>
                  {garminState.loading ? (
                    <div className="flex justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : upcomingWorkouts.length === 0 ? (
                    <p className="text-sm text-foreground-600 text-center py-4">
                      No upcoming workouts
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {upcomingWorkouts.map((workout: ApiWorkout) => (
                        <div
                          key={workout.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-content2 hover:bg-content3 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {workout.planned_type || 'Workout'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-foreground-600">
                              <span>{new Date(workout.date).toLocaleDateString()}</span>
                              {workout.planned_distance && (
                                <span>
                                  {workout.planned_distance}
                                  {workout.planned_distance_unit || 'mi'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {workout.garmin_workout_id ? (
                              <Chip
                                size="sm"
                                color="success"
                                variant="flat"
                                startContent={<CheckCircle2 className="h-3 w-3" />}
                              >
                                Synced
                              </Chip>
                            ) : (
                              <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                onPress={() => handleSyncWorkout(workout.id)}
                                isLoading={isSyncing}
                                isIconOnly
                                aria-label="Sync workout"
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

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
    </div>
  )
})

GarminWorkoutPanel.displayName = 'GarminWorkoutPanel'

export default GarminWorkoutPanel
