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
    // Create a unique channel name
    const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`
    
    let channel = supabase.channel(channelName)

    // Set up the subscription
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
        }
      )
    }

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to ${table} realtime updates`)
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