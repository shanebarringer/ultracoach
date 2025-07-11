'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

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
  onDelete
}: UseSupabaseRealtimeProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    // Check if real-time is available
    if (!supabase.realtime) {
      console.warn('🚫 Supabase real-time not available')
      return
    }

    // Create a stable channel name  
    const channelName = `realtime-${table}-${filter || 'all'}`
    
    let channel = supabase.channel(channelName)

    // Set up the subscription with error handling
    try {
      if (filter) {
        channel = channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter
          },
          (payload) => {
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
              console.error(`Error handling ${payload.eventType} for ${table}:`, error)
            }
          }
        )
      } else {
        channel = channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table
          },
          (payload) => {
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
              console.error(`Error handling ${payload.eventType} for ${table}:`, error)
            }
          }
        )
      }
    } catch (error) {
      console.error(`Error setting up real-time subscription for ${table}:`, error)
      return
    }

    // Subscribe to the channel
    channel.subscribe((status, err) => {
      console.log(`📡 Realtime ${table} subscription status:`, status)
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Successfully subscribed to ${table} realtime updates`)
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to ${table} realtime updates:`, err)
        // Don't throw error, just log it
      } else if (status === 'TIMED_OUT') {
        console.warn(`⏰ Subscription to ${table} timed out, retrying...`)
      } else if (status === 'CLOSED') {
        console.warn(`🔒 Subscription to ${table} was closed`)
      }
    })

    channelRef.current = channel

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