'use client'

import { Chip } from '@heroui/react'
import { useAtom } from 'jotai'
import { Loader2, Wifi, WifiOff } from 'lucide-react'

import { useEffect } from 'react'

import { uiStateAtom } from '@/lib/atoms'

export default function ConnectionStatus() {
  const [uiState, setUiState] = useAtom(uiStateAtom)
  const { connectionStatus } = uiState

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setUiState(prev => ({ ...prev, connectionStatus: 'connected' }))
    }

    const handleOffline = () => {
      setUiState(prev => ({ ...prev, connectionStatus: 'disconnected' }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial state
    if (!navigator.onLine) {
      setUiState(prev => ({ ...prev, connectionStatus: 'disconnected' }))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setUiState])

  // Don't show anything when connected
  if (connectionStatus === 'connected') return null

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'reconnecting':
        return {
          color: 'warning' as const,
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Reconnecting...',
          description: 'Real-time updates may be delayed',
        }
      case 'disconnected':
        return {
          color: 'danger' as const,
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Disconnected',
          description: 'Using offline mode. Messages will sync when reconnected.',
        }
      default:
        return {
          color: 'success' as const,
          icon: <Wifi className="h-3 w-3" />,
          text: 'Connected',
          description: 'Real-time updates active',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <Chip
        color={config.color}
        variant="flat"
        size="sm"
        startContent={config.icon}
        className="shadow-lg"
      >
        {config.text}
      </Chip>
      {config.description && (
        <div className="text-xs text-foreground-500 text-center mt-1 max-w-xs">
          {config.description}
        </div>
      )}
    </div>
  )
}
