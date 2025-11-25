// Garmin Connection Card - Settings UI Component
// Manages Garmin OAuth connection in Settings page
// Created: 2025-01-12
// Epic: ULT-16

'use client'

import { Button, Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react'

import { useEffect, useState } from 'react'

import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

// Garmin Connection Card - Settings UI Component
// Manages Garmin OAuth connection in Settings page
// Created: 2025-01-12
// Epic: ULT-16

const logger = createLogger('garmin-connection-card')

interface GarminConnectionStatus {
  connected: boolean
  garminUserId: string | null
  lastSync: string | null
  tokenExpired: boolean | null
  syncStatus: string | null
  connectedAt: string | null
}

export default function GarminConnectionCard() {
  const [status, setStatus] = useState<GarminConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch connection status on mount
  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/garmin/status', {
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Garmin status')
      }

      const data = await response.json()
      setStatus(data)

      logger.debug('Garmin status fetched', {
        connected: data.connected,
        tokenExpired: data.tokenExpired,
      })
    } catch (error) {
      logger.error('Failed to fetch Garmin status', {
        error: error instanceof Error ? error.message : 'Unknown',
      })
      toast.error('Failed to load Garmin connection status')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      logger.info('Initiating Garmin connection')

      // Redirect to OAuth flow
      window.location.href = '/api/garmin/connect'
    } catch (error) {
      logger.error('Failed to initiate Garmin connection', {
        error: error instanceof Error ? error.message : 'Unknown',
      })
      toast.error('Failed to connect Garmin account')
    }
  }

  const handleDisconnect = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect your Garmin account? This will remove all sync settings.'
      )
    ) {
      return
    }

    try {
      setActionLoading(true)
      logger.info('Disconnecting Garmin account')

      const response = await fetch('/api/garmin/disconnect', {
        method: 'DELETE',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect Garmin')
      }

      toast.success('Garmin account disconnected successfully')

      // Refresh status
      await fetchStatus()
    } catch (error) {
      logger.error('Failed to disconnect Garmin', {
        error: error instanceof Error ? error.message : 'Unknown',
      })
      toast.error('Failed to disconnect Garmin account')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSyncNow = async () => {
    try {
      setActionLoading(true)
      logger.info('Manual Garmin sync initiated')

      // TODO: Implement manual sync endpoint
      toast.info('Manual sync coming soon!')
    } catch (error) {
      logger.error('Manual sync failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      })
      toast.error('Failed to sync workouts')
    } finally {
      setActionLoading(false)
    }
  }

  // Format last sync time
  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never'

    const date = new Date(lastSync)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <p className="text-md font-semibold">Garmin Connect Integration</p>
            <p className="text-small text-default-500">Loading...</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="animate-pulse">
            <div className="h-4 bg-default-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-default-200 rounded w-1/2"></div>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col flex-1">
          <p className="text-md font-semibold">🏔️ Garmin Connect Integration</p>
          <p className="text-small text-default-500">Sync workouts to your Garmin device</p>
        </div>
        {status?.connected && (
          <Chip color={status.tokenExpired ? 'warning' : 'success'} variant="flat" size="sm">
            {status.tokenExpired ? 'Token Expired' : 'Connected'}
          </Chip>
        )}
      </CardHeader>
      <Divider />
      <CardBody className="gap-4">
        {status?.connected ? (
          <>
            {/* Connection Info */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-small text-default-600">Status:</span>
                <Chip
                  color={status.syncStatus === 'active' ? 'success' : 'default'}
                  variant="flat"
                  size="sm"
                >
                  {status.syncStatus || 'Unknown'}
                </Chip>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-small text-default-600">Garmin User ID:</span>
                <span className="text-small font-mono">{status.garminUserId}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-small text-default-600">Last Sync:</span>
                <span className="text-small">{formatLastSync(status.lastSync)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-small text-default-600">Connected:</span>
                <span className="text-small">
                  {status.connectedAt
                    ? new Date(status.connectedAt).toLocaleDateString()
                    : 'Unknown'}
                </span>
              </div>
            </div>

            <Divider />

            {/* Features List */}
            <div className="flex flex-col gap-2">
              <p className="text-small font-semibold">What you can do:</p>
              <ul className="text-small text-default-600 space-y-1 ml-4">
                <li>✅ Sync workouts to Garmin Connect calendar</li>
                <li>✅ Import completed activities from Garmin</li>
                <li>✅ View workout guidance on your device</li>
                <li>✅ Automatic daily sync (next 7 days)</li>
              </ul>
            </div>

            <Divider />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                color="primary"
                variant="flat"
                onPress={handleSyncNow}
                isLoading={actionLoading}
                className="flex-1"
              >
                Sync Now
              </Button>
              <Button
                color="danger"
                variant="light"
                onPress={handleDisconnect}
                isLoading={actionLoading}
              >
                Disconnect
              </Button>
            </div>

            {/* Token Expiration Warning */}
            {status.tokenExpired && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                <p className="text-small text-warning-800 font-semibold">⚠️ Token Expired</p>
                <p className="text-small text-warning-700 mt-1">
                  Your Garmin connection token has expired. Please reconnect to continue syncing.
                </p>
                <Button
                  color="warning"
                  size="sm"
                  variant="flat"
                  onPress={handleConnect}
                  className="mt-2"
                >
                  Reconnect Garmin
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <div className="flex flex-col gap-4">
              <p className="text-small text-default-600">
                Connect your Garmin account to automatically sync your UltraCoach workouts to your
                Garmin device and import completed activities.
              </p>

              <div className="bg-default-100 rounded-lg p-4">
                <p className="text-small font-semibold mb-2">Benefits:</p>
                <ul className="text-small text-default-600 space-y-1 ml-4">
                  <li>📱 Workouts appear in Garmin Connect calendar</li>
                  <li>⌚ Follow guided workouts on your watch</li>
                  <li>📊 Automatic activity import after completion</li>
                  <li>🔄 Daily sync keeps you up-to-date</li>
                </ul>
              </div>

              <Button
                color="primary"
                onPress={handleConnect}
                isLoading={actionLoading}
                className="w-full"
              >
                Connect Garmin Account
              </Button>

              <p className="text-tiny text-default-400 text-center">
                You&apos;ll be redirected to Garmin to authorize UltraCoach
              </p>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}
