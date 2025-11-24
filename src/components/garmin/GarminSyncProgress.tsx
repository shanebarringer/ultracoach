'use client'

import { Card, CardBody, Chip, Progress } from '@heroui/react'
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react'

import { memo } from 'react'

export interface SyncProgressItem {
  id: string
  name: string
  status: 'pending' | 'syncing' | 'success' | 'error'
  error?: string
}

interface GarminSyncProgressProps {
  items: SyncProgressItem[]
  className?: string
}

/**
 * Real-time sync progress display component
 *
 * Shows individual workout sync status with visual indicators:
 * - Pending: Upload icon + gray
 * - Syncing: Spinner + blue
 * - Success: Check + green
 * - Error: Alert + red
 */
const GarminSyncProgress = memo(({ items, className = '' }: GarminSyncProgressProps) => {
  const totalItems = items.length
  const completedItems = items.filter(item => item.status === 'success').length
  const failedItems = items.filter(item => item.status === 'error').length
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  const getStatusIcon = (status: SyncProgressItem['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="h-4 w-4 text-default-400" />
      case 'syncing':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-danger" />
    }
  }

  const getStatusColor = (status: SyncProgressItem['status']) => {
    switch (status) {
      case 'pending':
        return 'default'
      case 'syncing':
        return 'primary'
      case 'success':
        return 'success'
      case 'error':
        return 'danger'
    }
  }

  if (items.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardBody className="space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold">Sync Progress</h4>
            <span className="text-xs text-foreground-600">
              {completedItems}/{totalItems} complete
              {failedItems > 0 && ` (${failedItems} failed)`}
            </span>
          </div>
          <Progress
            value={progress}
            color={failedItems > 0 ? 'danger' : 'success'}
            size="sm"
            className="w-full"
          />
        </div>

        {/* Individual Items */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-lg bg-content2 hover:bg-content3 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getStatusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.error && <p className="text-xs text-danger truncate">{item.error}</p>}
                </div>
              </div>
              <Chip size="sm" color={getStatusColor(item.status)} variant="flat">
                {item.status}
              </Chip>
            </div>
          ))}
        </div>

        {/* Summary */}
        {completedItems === totalItems && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 dark:bg-success-900/20">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm font-medium text-success">All workouts synced successfully!</p>
          </div>
        )}

        {failedItems > 0 && completedItems + failedItems === totalItems && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20">
            <AlertCircle className="h-5 w-5 text-danger" />
            <p className="text-sm font-medium text-danger">
              {failedItems} workout{failedItems > 1 ? 's' : ''} failed to sync
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
})

GarminSyncProgress.displayName = 'GarminSyncProgress'

export default GarminSyncProgress
