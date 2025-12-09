'use client'

import { Avatar, Button, Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { Suspense, useState } from 'react'

import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import WeeklyPlannerCalendar from '@/components/workouts/WeeklyPlannerCalendar'
import { useHydrateConnectedRunners } from '@/hooks/useHydrateConnectedRunners'
import type { User } from '@/lib/supabase'
import { getDisplayNameFromEmail } from '@/lib/utils/user-names'

interface WeeklyPlannerRunnerClientProps {
  user: {
    id: string
    email: string
    name: string | null
    userType: 'runner' | 'coach'
  }
  runnerId: string
}

export default function WeeklyPlannerRunnerClient({
  user,
  runnerId,
}: WeeklyPlannerRunnerClientProps) {
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Get current week's Monday
    const today = new Date()
    const monday = new Date(today)
    const day = today.getDay()
    // Sunday is 0, treat as 7 for calculation
    const daysToSubtract = day === 0 ? 6 : day - 1
    monday.setDate(today.getDate() - daysToSubtract)
    return monday
  })

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4 lg:py-8">
        <RunnerWeeklyPage
          sessionUser={user}
          runnerId={runnerId}
          currentWeek={currentWeek}
          setCurrentWeek={setCurrentWeek}
        />
      </div>
    </Layout>
  )
}

function RunnerWeeklyPage({
  sessionUser,
  runnerId,
  currentWeek,
  setCurrentWeek,
}: {
  sessionUser: {
    id: string
    email: string
    name: string | null
    userType: 'runner' | 'coach'
  }
  runnerId: string
  currentWeek: Date
  setCurrentWeek: (d: Date) => void
}) {
  const router = useRouter()
  // Hydrate connected runners atom synchronously before reading
  const runners = useHydrateConnectedRunners()

  const formatWeekRange = (monday: Date) => {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    const monday = new Date(today)
    const day = today.getDay()
    // Sunday is 0, treat as 7 for calculation
    const daysToSubtract = day === 0 ? 6 : day - 1
    monday.setDate(today.getDate() - daysToSubtract)
    setCurrentWeek(monday)
  }

  // Derive selectedRunner directly from URL and session
  const isRunnerSelf = sessionUser?.userType === 'runner' && sessionUser.id === runnerId

  const selectedRunner = (() => {
    if (isRunnerSelf) {
      // Runner viewing their own training - use session data
      // Note: created_at/updated_at are required by User type but not used by WeeklyPlannerCalendar
      // These are placeholder values since session doesn't include DB timestamps
      const trimmedName = sessionUser.name?.trim()
      const now = new Date().toISOString()
      const userFromSession: User = {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name:
          trimmedName && trimmedName !== ''
            ? trimmedName
            : getDisplayNameFromEmail(sessionUser.email),
        userType: 'runner',
        created_at: now, // Session doesn't include DB timestamps; use current time as fallback
        updated_at: now, // Session doesn't include DB timestamps; use current time as fallback
      }
      return userFromSession
    }
    // Coach viewing runner's training - find from connected runners
    return runnerId && Array.isArray(runners) && runners.length > 0
      ? (runners as User[]).find((r: User) => r.id === runnerId) || null
      : null
  })()

  if (!selectedRunner) {
    return (
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <Card className="border-warning-200 bg-warning-50">
          <CardBody className="text-center py-12">
            <div className="text-warning-600 mb-4">Runner not found</div>
            <Button color="primary" onPress={() => router.push('/weekly-planner')}>
              Back to Weekly Planner
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  // Compute display name once for consistency
  // Trim full_name before checking - whitespace-only names should fall back to email-derived name
  const trimmedFullName = selectedRunner.full_name?.trim()
  const displayName =
    trimmedFullName && trimmedFullName !== ''
      ? trimmedFullName
      : getDisplayNameFromEmail(selectedRunner.email)

  return (
    <>
      {/* Consolidated Header - Mobile Optimized with Fixed Alignment */}
      <Card className="mb-4 lg:mb-6 bg-content1 border-l-4 border-l-primary">
        <CardHeader className="pb-4 px-4 lg:px-6">
          <div className="flex flex-col w-full gap-4">
            {/* Row 1: Title and Change Runner Button */}
            <div className="flex items-start justify-between w-full gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <CalendarDaysIcon className="w-6 lg:w-8 h-6 lg:h-8 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg lg:text-2xl font-bold text-foreground">
                    🏔️ {sessionUser?.userType === 'runner' ? 'My Training' : 'Weekly Planner'}
                  </h1>
                  <p className="text-foreground/70 text-xs lg:text-sm truncate">
                    {sessionUser?.userType === 'runner'
                      ? 'Your weekly overview'
                      : `Planning for ${displayName}`}
                  </p>
                </div>
              </div>
              {sessionUser?.userType === 'coach' && (
                <Button
                  variant="flat"
                  color="secondary"
                  size="sm"
                  onPress={() => router.push('/weekly-planner')}
                  className="flex-shrink-0"
                >
                  Change Runner
                </Button>
              )}
            </div>

            {/* Row 2: Runner Info and Week Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
              {/* Runner Info */}
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={displayName}
                  size="sm"
                  className="bg-primary text-white flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate" title={displayName}>
                    {displayName}
                  </p>
                  {/* TODO: Replace hardcoded status chips with dynamic data.
                      Currently "Active" is accurate since connectedRunnersAtom only returns active relationships.
                      "Training" should be derived from whether the runner has an active training plan.
                      See: https://linear.app/ultracoach for tracking this enhancement. */}
                  <div className="flex items-center gap-2 mt-1">
                    <Chip
                      size="sm"
                      variant="flat"
                      color="success"
                      startContent={<TrendingUpIcon className="w-3 h-3" />}
                      className="text-xs"
                    >
                      Active
                    </Chip>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="secondary"
                      startContent={<FlagIcon className="w-3 h-3" />}
                      className="text-xs"
                    >
                      Training
                    </Chip>
                  </div>
                </div>
              </div>

              {/* Week Navigation - Always Horizontal */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-left sm:text-right min-w-0">
                  <p
                    className="font-semibold text-foreground text-sm truncate"
                    title={formatWeekRange(currentWeek)}
                    aria-live="polite"
                  >
                    {formatWeekRange(currentWeek)}
                  </p>
                  <p className="text-foreground/50 text-xs">Training Week</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    isIconOnly
                    variant="ghost"
                    size="sm"
                    onPress={() => navigateWeek('prev')}
                    className="text-foreground/70 hover:text-foreground"
                    aria-label="Previous week"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="flat"
                    color="warning"
                    size="sm"
                    onPress={goToCurrentWeek}
                    className="px-2 lg:px-3 text-xs lg:text-sm"
                  >
                    Today
                  </Button>
                  <Button
                    isIconOnly
                    variant="ghost"
                    size="sm"
                    onPress={() => navigateWeek('next')}
                    className="text-foreground/70 hover:text-foreground"
                    aria-label="Next week"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Weekly Calendar - Responsive with Suspense for workout hydration */}
      <div className="w-full">
        <Suspense
          fallback={
            <div className="flex justify-center items-center min-h-[400px]">
              <Spinner size="lg" color="primary" label="Loading weekly workouts..." />
            </div>
          }
        >
          <WeeklyPlannerCalendar
            runner={selectedRunner}
            weekStart={currentWeek}
            readOnly={sessionUser?.userType === 'runner'}
            onWeekUpdate={() => {
              // Week updated successfully - data will be automatically refreshed
            }}
          />
        </Suspense>
      </div>
    </>
  )
}
