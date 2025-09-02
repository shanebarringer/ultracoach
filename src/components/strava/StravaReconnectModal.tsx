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
  ModalFooter,
  ModalHeader,
  Progress,
  Spinner,
} from '@heroui/react'
import { useAtom } from 'jotai'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import {
  stravaActivitiesRefreshableAtom,
  stravaConnectionStatusAtom,
  stravaStateAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'

const logger = createLogger('StravaReconnectModal')

interface StravaReconnectModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: 'expired' | 'permissions' | 'error' | 'manual'
}

/**
 * Advanced Strava reconnection modal with intelligent diagnostics
 *
 * Features:
 * - Automatic connection status detection
 * - Smart reconnection with permission validation
 * - Connection health diagnostics
 * - Auto-retry logic with exponential backoff
 * - Visual connection progress indicators
 * - Comprehensive error handling and user guidance
 */
const StravaReconnectModal = memo(
  ({ isOpen, onClose, reason = 'manual' }: StravaReconnectModalProps) => {
    const [stravaState] = useAtom(stravaStateAtom)
    const [connectionStatus] = useAtom(stravaConnectionStatusAtom)
    const [, refreshActivities] = useAtom(stravaActivitiesRefreshableAtom)

    const [reconnecting, setReconnecting] = useState(false)
    const [testing, setTesting] = useState(false)
    const [connectionProgress, setConnectionProgress] = useState(0)
    const [lastError, setLastError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [autoRetryEnabled, setAutoRetryEnabled] = useState(true)

    // Connection diagnostics
    const diagnostics = useMemo(() => {
      const issues: Array<{
        type: 'error' | 'warning' | 'info'
        message: string
        action?: string
      }> = []

      if (!connectionStatus.connected) {
        issues.push({
          type: 'error',
          message: 'Strava account is not connected',
          action: 'Click "Reconnect to Strava" to authorize access',
        })
      }

      if (stravaState.needsReconnect) {
        issues.push({
          type: 'warning',
          message: 'Connection requires updated permissions',
          action: 'Reconnect to grant necessary activity access',
        })
      }

      if (!stravaState.canSync) {
        issues.push({
          type: 'warning',
          message: 'Limited sync capabilities detected',
          action: 'Ensure all activity permissions are granted during reconnection',
        })
      }

      if (reason === 'expired') {
        issues.push({
          type: 'info',
          message: 'Authentication token has expired',
          action: 'This is normal - simply reconnect to refresh access',
        })
      }

      if (reason === 'permissions') {
        issues.push({
          type: 'warning',
          message: 'Insufficient permissions for activity sync',
          action: 'Make sure to allow "View data about your activities" during reconnection',
        })
      }

      if (stravaState.error) {
        issues.push({
          type: 'error',
          message: `Connection error: ${stravaState.error}`,
          action: 'Try reconnecting or check your internet connection',
        })
      }

      return issues
    }, [connectionStatus, stravaState, reason])

    // Test current connection
    const handleTestConnection = useCallback(async () => {
      setTesting(true)
      setLastError(null)
      setConnectionProgress(0)

      try {
        logger.info('Testing Strava connection')
        setConnectionProgress(25)

        // Test basic connection
        const statusResponse = await fetch('/api/strava/status')
        setConnectionProgress(50)

        if (!statusResponse.ok) {
          throw new Error('Connection test failed')
        }

        const statusData = await statusResponse.json()
        setConnectionProgress(75)

        // Test activity access if connected
        if (statusData.connected) {
          logger.debug('Testing activity access')
          await refreshActivities()
        }

        setConnectionProgress(100)
        logger.info('Connection test successful')

        // If successful and was auto-retrying, reset retry count
        if (retryCount > 0) {
          setRetryCount(0)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error('Connection test failed:', error)
        setLastError(errorMessage)

        if (autoRetryEnabled) {
          setRetryCount(prev => prev + 1)
        }
      } finally {
        setTesting(false)
        setConnectionProgress(0)
      }
    }, [refreshActivities, retryCount, autoRetryEnabled])

    // Auto-retry logic with exponential backoff
    useEffect(() => {
      let retryTimeout: NodeJS.Timeout

      if (autoRetryEnabled && lastError && retryCount < 3 && isOpen) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000) // Max 10 seconds

        logger.debug(`Auto-retry scheduled in ${delay}ms (attempt ${retryCount + 1}/3)`)

        retryTimeout = setTimeout(() => {
          if (isOpen && !reconnecting) {
            logger.info('Auto-retry attempt triggered', { retryCount: retryCount + 1 })
            handleTestConnection()
          }
        }, delay)
      }

      return () => {
        if (retryTimeout) {
          clearTimeout(retryTimeout)
        }
      }
    }, [autoRetryEnabled, lastError, retryCount, isOpen, reconnecting, handleTestConnection])

    // Handle reconnection
    const handleReconnect = useCallback(() => {
      setReconnecting(true)
      logger.info('Initiating Strava reconnection', { reason })

      // Add reason parameter to help with diagnostics
      const connectUrl = new URL('/api/strava/connect', window.location.origin)
      if (reason) {
        connectUrl.searchParams.set('reason', reason)
      }

      window.location.href = connectUrl.toString()
    }, [reason])

    // Handle successful reconnection (would be called from parent)
    const handleReconnectSuccess = useCallback(() => {
      logger.info('Strava reconnection successful')
      setReconnecting(false)
      setLastError(null)
      setRetryCount(0)
      onClose()
    }, [onClose])

    // Expose handleReconnectSuccess for potential future use
    // Currently not used but kept for API completeness
    void handleReconnectSuccess

    // Get reason display info
    const reasonInfo = useMemo(() => {
      switch (reason) {
        case 'expired':
          return {
            title: 'Connection Expired',
            description: 'Your Strava connection has expired and needs to be refreshed.',
            color: 'warning' as const,
            icon: <Zap className="h-5 w-5" />,
          }
        case 'permissions':
          return {
            title: 'Permission Update Required',
            description: 'Additional permissions are needed to sync your activities.',
            color: 'warning' as const,
            icon: <AlertCircle className="h-5 w-5" />,
          }
        case 'error':
          return {
            title: 'Connection Error',
            description: 'There was an error with your Strava connection.',
            color: 'danger' as const,
            icon: <WifiOff className="h-5 w-5" />,
          }
        default:
          return {
            title: 'Reconnect to Strava',
            description: 'Refresh your connection to ensure seamless activity syncing.',
            color: 'primary' as const,
            icon: <Activity className="h-5 w-5" />,
          }
      }
    }, [reason])

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        isDismissable={!reconnecting}
        hideCloseButton={reconnecting}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${reasonInfo.color}/10`}>{reasonInfo.icon}</div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{reasonInfo.title}</h2>
                <p className="text-sm text-foreground-600">{reasonInfo.description}</p>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="space-y-6">
            {/* Connection Status */}
            <Card className="border-default/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-lg font-semibold">Connection Status</h3>
                  <Chip
                    size="sm"
                    color={stravaState.isConnected ? 'success' : 'danger'}
                    variant="flat"
                    startContent={
                      stravaState.isConnected ? (
                        <Wifi className="h-3 w-3" />
                      ) : (
                        <WifiOff className="h-3 w-3" />
                      )
                    }
                  >
                    {stravaState.isConnected ? 'Connected' : 'Disconnected'}
                  </Chip>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                {testing && (
                  <div className="space-y-3">
                    <Progress
                      value={connectionProgress}
                      color="primary"
                      size="sm"
                      className="w-full"
                      label="Testing connection..."
                    />
                    <div className="flex items-center gap-2 text-sm text-foreground-600">
                      <Spinner size="sm" />
                      <span>Verifying Strava access...</span>
                    </div>
                  </div>
                )}

                {!testing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${stravaState.connection?.connected ? 'text-success' : 'text-default-400'}`}
                      />
                      <span className="text-sm">Basic Connection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${stravaState.canSync ? 'text-success' : 'text-default-400'}`}
                      />
                      <span className="text-sm">Activity Access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${stravaState.activities && stravaState.activities.length > 0 ? 'text-success' : 'text-default-400'}`}
                      />
                      <span className="text-sm">Recent Activities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${!stravaState.needsReconnect ? 'text-success' : 'text-default-400'}`}
                      />
                      <span className="text-sm">Up-to-date Permissions</span>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Diagnostics */}
            {diagnostics.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    Connection Diagnostics
                  </h3>
                </CardHeader>
                <CardBody className="space-y-3">
                  {diagnostics.map((issue, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        issue.type === 'error'
                          ? 'bg-danger/10 border-danger/20'
                          : issue.type === 'warning'
                            ? 'bg-warning/10 border-warning/20'
                            : 'bg-primary/10 border-primary/20'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{issue.message}</p>
                      {issue.action && (
                        <p className="text-xs text-foreground-600 mt-1">{issue.action}</p>
                      )}
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}

            {/* Auto-retry status */}
            {retryCount > 0 && (
              <Card className="border-warning/20 bg-warning/5">
                <CardBody className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-warning animate-spin" />
                      <span className="text-sm text-warning">
                        Auto-retry attempt {retryCount}/3
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="light"
                      color="warning"
                      onPress={() => setAutoRetryEnabled(false)}
                    >
                      Cancel Auto-retry
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Error display */}
            {lastError && (
              <Card className="border-danger/20 bg-danger/5">
                <CardBody className="py-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-danger">Connection Test Failed</p>
                      <p className="text-xs text-danger/80 mt-1">{lastError}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </ModalBody>

          <ModalFooter className="gap-3">
            <Button variant="light" onPress={onClose} disabled={reconnecting}>
              Cancel
            </Button>

            <Button
              variant="bordered"
              color="primary"
              onPress={handleTestConnection}
              disabled={testing || reconnecting}
              startContent={testing ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
            >
              Test Connection
            </Button>

            <Button
              color="primary"
              onPress={handleReconnect}
              disabled={reconnecting || testing}
              startContent={
                reconnecting ? <Spinner size="sm" /> : <ExternalLink className="h-4 w-4" />
              }
            >
              {reconnecting ? 'Reconnecting...' : 'Reconnect to Strava'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  }
)

StravaReconnectModal.displayName = 'StravaReconnectModal'

export default StravaReconnectModal
