'use client'

import { Avatar, Button, Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react'
import { format, parseISO } from 'date-fns'
import { useAtomValue } from 'jotai'
import { Activity, Calendar, ExternalLink, Unlink } from 'lucide-react'

import { useEffect, useState } from 'react'

import { useTypedPostHogEvent } from '@/hooks/usePostHogIdentify'
import { useStravaOAuthReturn } from '@/hooks/useStravaOAuthReturn'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { userAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('StravaConnectionCard')

interface StravaAthlete {
  id: number
  name: string
  username?: string
  profile?: string
}

interface StravaStatus {
  connected: boolean
  enabled: boolean
  athlete?: StravaAthlete
  scope?: string[]
  expires_at?: string
  is_expired?: boolean
  connected_since?: string
  error?: string
}

export default function StravaConnectionCard() {
  const [status, setStatus] = useState<StravaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const user = useAtomValue(userAtom) // Read-only access
  const trackEvent = useTypedPostHogEvent()

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/strava/status', {
        credentials: 'same-origin',
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        logger.error('Failed to fetch Strava status:', response.statusText)
        setStatus({ connected: false, enabled: false, error: 'Failed to load status' })
      }
    } catch (error) {
      logger.error('Error fetching Strava status:', error)
      setStatus({ connected: false, enabled: false, error: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  // Handle OAuth return and refresh status
  useStravaOAuthReturn(fetchStatus)

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      logger.info('Redirecting to Strava authorization...')

      // Track Strava connection attempt (type-safe) - only if user is authenticated
      if (user?.id) {
        trackEvent(ANALYTICS_EVENTS.STRAVA_CONNECT_INITIATED, {
          source: 'connection_card',
          userId: user.id,
        })
      }

      const currentUrl = window.location.pathname
      window.location.href = `/api/strava/connect?returnUrl=${encodeURIComponent(currentUrl)}`
    } catch (error) {
      logger.error('Error connecting to Strava:', error)
      toast.error('Network error. Please try again.')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const response = await fetch('/api/strava/disconnect', {
        method: 'POST',
        credentials: 'same-origin',
      })

      if (response.ok) {
        logger.info('Successfully disconnected from Strava')

        // Track Strava disconnection (type-safe) with userId for better correlation
        trackEvent(ANALYTICS_EVENTS.STRAVA_DISCONNECTED, {
          source: 'connection_card',
          userId: user?.id,
        })

        toast.success('Strava account disconnected successfully')
        await fetchStatus() // Refresh status
      } else {
        const errorData = await response.json()
        logger.error('Failed to disconnect from Strava:', errorData)
        toast.error('Failed to disconnect from Strava. Please try again.')
      }
    } catch (error) {
      logger.error('Error disconnecting from Strava:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardBody>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (!status?.enabled) {
    return (
      <Card className="w-full">
        <CardBody>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-500">Strava Integration</h3>
              <p className="text-sm text-gray-400">
                {status?.error || 'Integration not configured'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (!status.connected) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Connect to Strava</h3>
                <p className="text-sm text-default-500">
                  Sync your activities and workouts automatically
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-4">
            <div className="flex items-start space-x-3 text-sm">
              <Calendar className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <div className="font-medium">Automatic Activity Sync</div>
                <div className="text-default-500">
                  Your Strava activities will automatically sync to UltraCoach workouts
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 text-sm">
              <ExternalLink className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <div className="font-medium">Workout Export</div>
                <div className="text-default-500">
                  Send planned workouts to your Strava calendar
                </div>
              </div>
            </div>

            <Divider />

            <Button
              color="primary"
              onPress={handleConnect}
              isLoading={connecting}
              startContent={!connecting ? <Activity className="w-4 h-4" /> : undefined}
              className="w-full"
            >
              {connecting ? 'Connecting...' : 'Connect to Strava'}
            </Button>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Connected state
  const athlete = status.athlete!
  const isExpired = status.is_expired
  const connectedDate = status.connected_since
    ? format(parseISO(status.connected_since), 'MMM d, yyyy')
    : 'Unknown'

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <Avatar
              src={athlete.profile}
              name={athlete.name}
              size="lg"
              className="bg-orange-100"
              fallback={<Activity className="w-6 h-6 text-orange-600" />}
            />
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {athlete.name}
                {isExpired && (
                  <Chip size="sm" color="warning" variant="flat">
                    Expired
                  </Chip>
                )}
              </h3>
              <p className="text-sm text-default-500">
                {athlete.username && `@${athlete.username} • `}
                Connected since {connectedDate}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="space-y-4">
          {status.scope && (
            <div>
              <div className="text-sm font-medium mb-2">Permissions</div>
              <div className="flex flex-wrap gap-2">
                {status.scope.map(scope => (
                  <Chip key={scope} size="sm" variant="flat" color="default">
                    {scope.replace(':', ': ').replace('_', ' ')}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {isExpired && (
            <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <div className="text-sm font-medium text-warning-800">Connection Expired</div>
              <div className="text-sm text-warning-700 mt-1">
                Your Strava connection has expired. Reconnect to continue syncing activities.
              </div>
            </div>
          )}

          {!isExpired && status.scope && !status.scope.includes('activity:read_all') && (
            <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <div className="text-sm font-medium text-warning-800">Limited Permissions</div>
              <div className="text-sm text-warning-700 mt-1">
                Your Strava connection has limited permissions and cannot sync activities. Please
                reconnect to grant activity reading permissions.
              </div>
            </div>
          )}

          <Divider />

          <div className="flex gap-2">
            {isExpired ? (
              <Button
                color="primary"
                onPress={handleConnect}
                isLoading={connecting}
                startContent={!connecting ? <Activity className="w-4 h-4" /> : undefined}
                className="flex-1"
              >
                {connecting ? 'Reconnecting...' : 'Reconnect to Strava'}
              </Button>
            ) : (
              <Button
                variant="flat"
                color="success"
                isDisabled
                startContent={<Activity className="w-4 h-4" />}
                className="flex-1"
              >
                Connected & Active
              </Button>
            )}

            <Button
              variant="light"
              color="danger"
              onPress={handleDisconnect}
              isLoading={disconnecting}
              startContent={!disconnecting ? <Unlink className="w-4 h-4" /> : undefined}
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
