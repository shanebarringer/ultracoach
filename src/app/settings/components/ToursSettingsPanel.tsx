'use client'

import { Button, Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react'
import { useAtomValue, useSetAtom } from 'jotai'
import { CheckCircleIcon, CompassIcon, MapPinIcon, RefreshCwIcon, RouteIcon } from 'lucide-react'

import { type ReactNode, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import { isTourImplemented, tourMetadata } from '@/components/tours/tours/metadata'
import { resetTourAtom, shouldStartTourAtom, tourStateAtom } from '@/lib/atoms/tours'
import type { TourId } from '@/lib/atoms/tours'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('ToursSettingsPanel')

/** Tour key type for coach/runner differentiation */
type TourKey = 'coach' | 'runner'

interface TourInfo {
  id: TourKey
  name: string
  description: string
  icon: ReactNode
  stepCount: number
  dashboardUrl: string
}

// Build tours array from centralized metadata
const tours: TourInfo[] = [
  {
    id: 'coach',
    name: tourMetadata['coach-onboarding'].name,
    description: tourMetadata['coach-onboarding'].description,
    icon: <RouteIcon className="w-5 h-5 text-primary" />,
    stepCount: tourMetadata['coach-onboarding'].stepCount,
    dashboardUrl: tourMetadata['coach-onboarding'].dashboardUrl,
  },
  {
    id: 'runner',
    name: tourMetadata['runner-onboarding'].name,
    description: tourMetadata['runner-onboarding'].description,
    icon: <MapPinIcon className="w-5 h-5 text-secondary" />,
    stepCount: tourMetadata['runner-onboarding'].stepCount,
    dashboardUrl: tourMetadata['runner-onboarding'].dashboardUrl,
  },
]

export default function ToursSettingsPanel() {
  const router = useRouter()
  const tourState = useAtomValue(tourStateAtom)
  const setShouldStartTour = useSetAtom(shouldStartTourAtom)
  const resetTour = useSetAtom(resetTourAtom)
  const [resetting, setResetting] = useState<TourKey | null>(null)

  const handleStartTour = (tour: TourInfo) => {
    // Guard against unimplemented tours using centralized metadata
    const tourId = `${tour.id}-onboarding` as TourId
    if (!isTourImplemented(tourId)) {
      logger.warn('Tour not yet implemented', { tourId })
      toast.info('Coming Soon', `The ${tour.name} is not yet available.`)
      return
    }

    logger.info('Starting tour from settings', { tourId })
    setShouldStartTour(true)
    router.push(tour.dashboardUrl)
  }

  const handleResetTour = async (tourId: TourKey) => {
    setResetting(tourId)
    const fullTourId = `${tourId}-onboarding` as TourId

    try {
      logger.info('Resetting tour', { tourId })

      // Optimistic update - reset UI immediately for better UX
      resetTour(fullTourId)

      // Call API to persist the reset
      const response = await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ tourId: fullTourId, action: 'reset' }),
      })

      if (response.ok) {
        toast.success('Tour reset successfully', 'You can now restart the guided tour.')
      } else {
        throw new Error('Failed to reset tour')
      }
    } catch (error) {
      logger.error('Failed to reset tour', { tourId, error })
      toast.error('Reset failed', 'Could not reset the tour. Please try again.')
      // Note: Full rollback would require refetching tour state from the server
    } finally {
      setResetting(null)
    }
  }

  const isTourCompleted = (tourId: TourKey) => {
    return tourId === 'coach' ? tourState.coachTourCompleted : tourState.runnerTourCompleted
  }

  // Memoize completed tours count to avoid duplicate filter computation
  const completedToursCount = useMemo(
    () => tours.filter(t => isTourCompleted(t.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isTourCompleted depends on tourState
    [tourState.coachTourCompleted, tourState.runnerTourCompleted]
  )

  return (
    <div className="space-y-6">
      {/* Guided Tours Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CompassIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Guided Tours</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <p className="text-foreground-600">
            Take a guided tour of UltraCoach to learn about key features and get started quickly.
            You can restart tours at any time to refresh your knowledge.
          </p>

          <div className="p-4 bg-alpine-50 dark:bg-alpine-900/20 rounded-lg border border-alpine-200 dark:border-alpine-800">
            <div className="flex items-start gap-3">
              <CompassIcon className="w-5 h-5 text-alpine-600 dark:text-alpine-400 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Quick Tip</p>
                <p className="text-sm text-foreground-600">
                  You can also start a tour anytime using the keyboard shortcut{' '}
                  <kbd className="px-2 py-0.5 bg-content3 rounded text-xs font-mono">T</kbd>{' '}
                  <kbd className="px-2 py-0.5 bg-content3 rounded text-xs font-mono">G</kbd> or by
                  pressing{' '}
                  <kbd className="px-2 py-0.5 bg-content3 rounded text-xs font-mono">Cmd+K</kbd> and
                  searching for &quot;Guided Tour&quot;.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Available Tours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RouteIcon className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Available Tours</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          {tours.map(tour => {
            const completed = isTourCompleted(tour.id)

            return (
              <div
                key={tour.id}
                className="flex items-start justify-between p-4 border rounded-lg border-divider hover:border-primary/30 transition-colors"
              >
                <div className="flex gap-4">
                  <div className="p-2 bg-content2 rounded-lg">{tour.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{tour.name}</h4>
                      {!isTourImplemented(`${tour.id}-onboarding` as TourId) && (
                        <Chip color="warning" variant="flat" size="sm">
                          Coming Soon
                        </Chip>
                      )}
                      {completed && (
                        <Chip
                          startContent={<CheckCircleIcon className="w-3 h-3" />}
                          color="success"
                          variant="flat"
                          size="sm"
                        >
                          Completed
                        </Chip>
                      )}
                    </div>
                    <p className="text-sm text-foreground-600 mt-1">{tour.description}</p>
                    <p className="text-xs text-foreground-500 mt-2">
                      {tour.stepCount} steps • ~{Math.round(tour.stepCount * 0.5)} min
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {completed && (
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<RefreshCwIcon className="w-3 h-3" />}
                      isLoading={resetting === tour.id}
                      onPress={() => handleResetTour(tour.id)}
                    >
                      Reset
                    </Button>
                  )}
                  <Button
                    size="sm"
                    color="primary"
                    variant={completed ? 'flat' : 'solid'}
                    startContent={<CompassIcon className="w-3 h-3" />}
                    onPress={() => handleStartTour(tour)}
                  >
                    {completed ? 'Restart' : 'Start Tour'}
                  </Button>
                </div>
              </div>
            )
          })}
        </CardBody>
      </Card>

      {/* Tour Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-success" />
            <h3 className="text-lg font-semibold">Tour Progress</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-content2 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{completedToursCount}</p>
              <p className="text-sm text-foreground-600">Tours Completed</p>
            </div>
            <div className="p-4 bg-content2 rounded-lg text-center">
              <p className="text-3xl font-bold text-secondary">
                {tours.length - completedToursCount}
              </p>
              <p className="text-sm text-foreground-600">Tours Remaining</p>
            </div>
          </div>

          {tourState.lastTourStartedAt && (
            <p className="text-xs text-foreground-500 mt-4 text-center">
              Last tour started:{' '}
              {new Date(tourState.lastTourStartedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
