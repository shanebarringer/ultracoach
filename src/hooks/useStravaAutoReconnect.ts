/**
 * Auto-reconnect hook for Strava connection management
 *
 * Features:
 * - Automatic connection health monitoring
 * - Smart retry logic with exponential backoff
 * - Connection state persistence
 * - User-configurable reconnection preferences
 * - Integration with existing Jotai atoms
 */
import { useAtom } from 'jotai'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { stravaConnectionStatusAtom, stravaStateAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'

const logger = createLogger('StravaAutoReconnect')

interface AutoReconnectOptions {
  enabled?: boolean
  maxRetries?: number
  initialDelay?: number // milliseconds
  maxDelay?: number // milliseconds
  onReconnectNeeded?: (reason: 'expired' | 'error' | 'permissions') => void
  onReconnectSuccess?: () => void
  onReconnectFailed?: (error: string) => void
}

interface AutoReconnectState {
  isMonitoring: boolean
  retryCount: number
  lastAttempt: number | null
  nextAttempt: number | null
  lastError: string | null
  reconnectReason: 'expired' | 'error' | 'permissions' | null
}

const defaultOptions: Required<AutoReconnectOptions> = {
  enabled: true,
  maxRetries: 3,
  initialDelay: 5000, // 5 seconds
  maxDelay: 300000, // 5 minutes
  onReconnectNeeded: () => {},
  onReconnectSuccess: () => {},
  onReconnectFailed: () => {},
}

/**
 * Hook for automatic Strava connection management
 */
export function useStravaAutoReconnect(options: AutoReconnectOptions = {}) {
  const opts = useMemo(() => ({ ...defaultOptions, ...options }), [options])

  const [stravaState] = useAtom(stravaStateAtom)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [connectionStatus] = useAtom(stravaConnectionStatusAtom)

  const [autoReconnectState, setAutoReconnectState] = useState<AutoReconnectState>({
    isMonitoring: false,
    retryCount: 0,
    lastAttempt: null,
    nextAttempt: null,
    lastError: null,
    reconnectReason: null,
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastConnectionState = useRef(stravaState.isConnected)

  // Calculate next retry delay with exponential backoff
  const calculateRetryDelay = useCallback(
    (retryCount: number) => {
      const delay = Math.min(opts.initialDelay * Math.pow(2, retryCount), opts.maxDelay)
      // Add jitter to prevent thundering herd
      const jitter = delay * 0.1 * Math.random()
      return Math.floor(delay + jitter)
    },
    [opts.initialDelay, opts.maxDelay]
  )

  // Test connection health
  const testConnection = useCallback(async (): Promise<{
    isHealthy: boolean
    reason?: 'expired' | 'error' | 'permissions'
    error?: string
  }> => {
    try {
      logger.debug('Testing Strava connection health')

      const response = await fetch('/api/strava/status', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`)
      }

      const statusData = await response.json()

      // Check various health indicators
      if (!statusData.connected) {
        return { isHealthy: false, reason: 'error' }
      }

      if (statusData.token_expired) {
        return { isHealthy: false, reason: 'expired' }
      }

      if (!statusData.has_activity_scope) {
        return { isHealthy: false, reason: 'permissions' }
      }

      // Test actual activity access
      const activitiesResponse = await fetch('/api/strava/activities?limit=1')
      if (!activitiesResponse.ok) {
        if (activitiesResponse.status === 401) {
          return { isHealthy: false, reason: 'expired' }
        }
        if (activitiesResponse.status === 403) {
          return { isHealthy: false, reason: 'permissions' }
        }
        throw new Error(`Activities test failed: ${activitiesResponse.status}`)
      }

      logger.debug('Connection health check passed')
      return { isHealthy: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Connection health check failed:', error)
      return {
        isHealthy: false,
        reason: 'error',
        error: errorMessage,
      }
    }
  }, [])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!opts.enabled || autoReconnectState.isMonitoring) return

    logger.info('Starting Strava connection monitoring')
    setAutoReconnectState(prev => ({
      ...prev,
      isMonitoring: true,
      retryCount: 0,
      lastError: null,
    }))
  }, [opts.enabled, autoReconnectState.isMonitoring])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    logger.info('Stopping Strava connection monitoring')

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setAutoReconnectState(prev => ({
      ...prev,
      isMonitoring: false,
      nextAttempt: null,
    }))
  }, [])

  // Force immediate reconnection check
  const checkNow = useCallback(async () => {
    if (!opts.enabled) return

    logger.info('Manual connection check requested')
    const result = await testConnection()

    if (!result.isHealthy) {
      setAutoReconnectState(prev => ({
        ...prev,
        reconnectReason: result.reason || 'error',
        lastError: result.error || null,
      }))

      opts.onReconnectNeeded(result.reason || 'error')
    }
  }, [opts, testConnection])

  // Reset retry count (called after successful reconnection)
  const resetRetries = useCallback(() => {
    logger.info('Resetting auto-reconnect retry count')
    setAutoReconnectState(prev => ({
      ...prev,
      retryCount: 0,
      lastError: null,
      reconnectReason: null,
      nextAttempt: null,
    }))

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    opts.onReconnectSuccess()
  }, [opts])

  // Perform health check with retry logic
  const performHealthCheck = useCallback(async () => {
    if (!autoReconnectState.isMonitoring || autoReconnectState.retryCount >= opts.maxRetries) {
      return
    }

    const now = Date.now()
    const result = await testConnection()

    if (result.isHealthy) {
      // Connection is healthy, reset retry count if needed
      if (autoReconnectState.retryCount > 0) {
        logger.info('Connection restored, resetting retry count')
        resetRetries()
      }
      return
    }

    // Connection is unhealthy
    const newRetryCount = autoReconnectState.retryCount + 1
    const delay = calculateRetryDelay(newRetryCount)
    const nextAttempt = now + delay

    logger.warn(`Connection unhealthy (attempt ${newRetryCount}/${opts.maxRetries})`, {
      reason: result.reason,
      error: result.error,
      nextAttempt: new Date(nextAttempt).toISOString(),
    })

    setAutoReconnectState(prev => ({
      ...prev,
      retryCount: newRetryCount,
      lastAttempt: now,
      nextAttempt,
      lastError: result.error || null,
      reconnectReason: result.reason || 'error',
    }))

    if (newRetryCount === 1) {
      // First failure, notify immediately
      opts.onReconnectNeeded(result.reason || 'error')
    }

    if (newRetryCount >= opts.maxRetries) {
      logger.error('Max reconnection attempts reached, stopping monitoring')
      opts.onReconnectFailed(result.error || 'Max retries exceeded')
      stopMonitoring()
      return
    }

    // Schedule next check
    timeoutRef.current = setTimeout(performHealthCheck, delay)
  }, [
    autoReconnectState.isMonitoring,
    autoReconnectState.retryCount,
    testConnection,
    resetRetries,
    calculateRetryDelay,
    opts,
    stopMonitoring,
  ])

  // Monitor connection state changes
  useEffect(() => {
    const wasConnected = lastConnectionState.current
    const isConnected = stravaState.isConnected

    if (wasConnected && !isConnected) {
      // Connection lost
      logger.warn('Strava connection lost, starting health checks')
      if (opts.enabled && !autoReconnectState.isMonitoring) {
        startMonitoring()
        performHealthCheck()
      }
    } else if (!wasConnected && isConnected) {
      // Connection restored
      logger.info('Strava connection restored')
      if (autoReconnectState.isMonitoring) {
        resetRetries()
      }
    }

    lastConnectionState.current = isConnected
  }, [
    stravaState.isConnected,
    opts.enabled,
    autoReconnectState.isMonitoring,
    startMonitoring,
    performHealthCheck,
    resetRetries,
  ])

  // Start monitoring when enabled
  useEffect(() => {
    if (opts.enabled && !stravaState.isConnected && !autoReconnectState.isMonitoring) {
      startMonitoring()
      performHealthCheck()
    } else if (!opts.enabled && autoReconnectState.isMonitoring) {
      stopMonitoring()
    }
  }, [
    opts.enabled,
    stravaState.isConnected,
    autoReconnectState.isMonitoring,
    startMonitoring,
    stopMonitoring,
    performHealthCheck,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    isMonitoring: autoReconnectState.isMonitoring,
    retryCount: autoReconnectState.retryCount,
    maxRetries: opts.maxRetries,
    lastError: autoReconnectState.lastError,
    reconnectReason: autoReconnectState.reconnectReason,
    nextAttempt: autoReconnectState.nextAttempt,

    // Actions
    startMonitoring,
    stopMonitoring,
    checkNow,
    resetRetries,

    // Computed
    hasFailures: autoReconnectState.retryCount > 0,
    isMaxRetriesReached: autoReconnectState.retryCount >= opts.maxRetries,
    timeUntilNextAttempt: autoReconnectState.nextAttempt
      ? Math.max(0, autoReconnectState.nextAttempt - Date.now())
      : null,
  }
}
