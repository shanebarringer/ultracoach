'use client'

import { useEffect, useRef } from 'react'

import type { RealtimeChannel } from '@supabase/supabase-js'

import { createLogger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

const logger = createLogger('useSupabaseRealtime')

interface UseSupabaseRealtimeProps {
  table: string
  filter?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onInsert?: (payload: Record<string, any>) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate?: (payload: Record<string, any>) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDelete?: (payload: Record<string, any>) => void
}

export function useSupabaseRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseSupabaseRealtimeProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    // Check if real-time is available
    if (!supabase.realtime) {
      logger.warn('Supabase real-time not available')
      return
    }

    try {
      // Create a stable channel name
      const channelName = `realtime-${table}-${filter || 'all'}`

      let channel = supabase.channel(channelName)

      // Set up the subscription with error handling
      if (filter) {
        channel = channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter,
          },
          payload => {
            try {
              switch (payload.eventType) {
                case 'INSERT':
                  onInsert?.(payload)
                  break
                case 'UPDATE':
                  onUpdate?.(payload)
                  break
                case 'DELETE':
                  onDelete?.(payload)
                  break
              }
            } catch (error) {
              logger.error(`Error handling ${payload.eventType} for ${table}:`, error)
            }
          }
        )
      } else {
        channel = channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
          },
          payload => {
            try {
              switch (payload.eventType) {
                case 'INSERT':
                  onInsert?.(payload)
                  break
                case 'UPDATE':
                  onUpdate?.(payload)
                  break
                case 'DELETE':
                  onDelete?.(payload)
                  break
              }
            } catch (error) {
              logger.error(`Error handling ${payload.eventType} for ${table}:`, error)
            }
          }
        )
      }

      // Subscribe to the channel with enhanced error handling and retry logic
      channel.subscribe((status, err) => {
        logger.debug(`Realtime ${table} subscription status:`, status)
        if (status === 'SUBSCRIBED') {
          logger.info(`Successfully subscribed to ${table} realtime updates`)
        } else if (status === 'CHANNEL_ERROR') {
          logger.error(`Error subscribing to ${table} realtime updates:`, err)

          // Handle schema mismatch errors gracefully
          if (
            err &&
            err.message &&
            err.message.includes('mismatch between server and client bindings')
          ) {
            logger.warn(`Schema mismatch detected for ${table}, falling back to polling`, {
              error: err,
            })
          } else {
            logger.warn(
              `Real-time connection error for ${table}, components will use polling fallback`,
              { error: err }
            )
          }
        } else if (status === 'TIMED_OUT') {
          logger.warn(`Subscription to ${table} timed out - polling fallback will handle updates`)
        } else if (status === 'CLOSED') {
          logger.warn(`Subscription to ${table} was closed - polling fallback will handle updates`)
        }
      })

      channelRef.current = channel
    } catch (error) {
      // Catch any realtime setup errors and continue gracefully
      logger.warn(`Realtime setup failed for ${table}, falling back to polling`, { error })

      // If error message contains schema mismatch, provide specific guidance
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.includes('mismatch between server and client bindings')
      ) {
        logger.warn(
          `Schema mismatch detected - this usually happens after database changes. The app will continue to work with polling updates.`,
          { error }
        )
      }
    }

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, filter, onInsert, onUpdate, onDelete])

  return channelRef.current
}
