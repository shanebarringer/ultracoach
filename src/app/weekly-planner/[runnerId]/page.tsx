'use client'

import { Avatar, Button, Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react'
import { useAtomValue } from 'jotai'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { Suspense, useEffect, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import WeeklyPlannerCalendar from '@/components/workouts/WeeklyPlannerCalendar'
import { useSession } from '@/hooks/useBetterSession'
import { connectedRunnersAtom } from '@/lib/atoms/index'
import type { User } from '@/lib/supabase'

// Use pre-defined loadable atom from relationships module

export default function WeeklyPlannerRunnerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const runnerId = params.runnerId as string
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Get current week's Monday
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    return monday
  })

  // Selected runner is derived in a Suspense-wrapped child so fallbacks are effective

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Allow both coaches and runners
    if (session.user.role !== 'coach' && session.user.role !== 'runner') {
      router.push('/dashboard')
      return
    }

    // If runner, ensure they can only view their own training
    if (session.user.role === 'runner' && session.user.id !== runnerId) {
      router.push(`/weekly-planner/${session.user.id}`)
      return
    }
  }, [status, session, router, runnerId])

  // Runner-not-found handling occurs inside the Suspense child

  //

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    setCurrentWeek(monday)
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" label="Loading training schedule..." />
        </div>
      </Layout>
    )
  }

  if (!session || (session.user.role !== 'coach' && session.user.role !== 'runner')) {
    return null
  }

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" color="primary" label="Loading training schedule..." />
          </div>
        }
      >
        <RunnerWeeklyContent
          sessionRole={session?.user?.role as 'coach' | 'runner'}
          sessionUser={{
            id: session?.user?.id || '',
            name: session?.user?.name || null,
            email: session?.user?.email || '',
          }}
          runnerId={runnerId}
          currentWeek={currentWeek}
          onNavigateWeek={navigateWeek}
          onToday={goToCurrentWeek}
          onBack={() => router.push('/weekly-planner')}
        />
      </Suspense>
    </Layout>
  )
}

function RunnerWeeklyContent({
  sessionRole,
  sessionUser,
  runnerId,
  currentWeek,
  onNavigateWeek,
  onToday,
  onBack,
}: {
  sessionRole: 'coach' | 'runner'
  sessionUser: { id: string; email: string; name: string | null }
  runnerId: string
  currentWeek: Date
  onNavigateWeek: (dir: 'prev' | 'next') => void
  onToday: () => void
  onBack: () => void
}) {
  const connectedRunners = useAtomValue(connectedRunnersAtom)
  const runners = Array.isArray(connectedRunners) ? connectedRunners : []
  const selectedRunner: User | null = (() => {
    if (sessionRole === 'runner' && sessionUser.id === runnerId) {
      return {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.name,
        userType: 'runner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as User
    }
    return runnerId && runners.length > 0
      ? runners.find((r: User) => r.id === runnerId) || null
      : null
  })()

  const formatWeekRange = (monday: Date) => {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  if (!selectedRunner) {
    return (
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <Card className="border-warning-200 bg-warning-50">
          <CardBody className="text-center py-12">
            <div className="text-warning-600 mb-4">Runner not found</div>
            <Button color="primary" onClick={onBack}>
              Back to Weekly Planner
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4 lg:py-8">
      <Card className="mb-4 lg:mb-6 bg-content1 border-l-4 border-l-primary">
        <CardHeader className="pb-3 lg:pb-4 px-4 lg:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full mb-3 lg:mb-4 gap-3 lg:gap-0">
            <div className="flex items-center gap-3">
              <CalendarDaysIcon className="w-6 lg:w-8 h-6 lg:h-8 text-primary" />
              <div>
                <h1 className="text-lg lg:text-2xl font-bold text-foreground">
                  🏔️ {sessionRole === 'runner' ? 'My Training' : 'Weekly Planner'}
                </h1>
                <p className="text-foreground/70 text-xs lg:text-sm">
                  {sessionRole === 'runner'
                    ? 'Your weekly overview'
                    : `Planning for ${selectedRunner.full_name || selectedRunner.email}`}
                </p>
              </div>
            </div>
            {sessionRole === 'coach' && (
              <Button
                variant="flat"
                size="sm"
                onClick={onBack}
                className="text-secondary hover:bg-secondary/20 self-start lg:self-auto"
              >
                Change Runner
              </Button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full gap-3 lg:gap-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={selectedRunner.full_name || 'User'}
                size="sm"
                className="bg-primary text-white"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">
                  {selectedRunner.full_name || 'User'}
                </p>
                <div className="flex items-center gap-1 lg:gap-2 mt-1">
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

            <div className="flex items-center justify-between lg:justify-end gap-3">
              <div className="text-left lg:text-right">
                <p className="font-semibold text-foreground text-sm">
                  {formatWeekRange(currentWeek)}
                </p>
                <p className="text-foreground/50 text-xs">Training Week</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateWeek('prev')}
                  className="text-foreground/70 hover:text-foreground"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="flat"
                  size="sm"
                  onClick={onToday}
                  className="text-warning px-2 lg:px-3 text-xs lg:text-sm"
                >
                  Today
                </Button>
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateWeek('next')}
                  className="text-foreground/70 hover:text-foreground"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="w-full">
        <WeeklyPlannerCalendar
          runner={selectedRunner}
          weekStart={currentWeek}
          readOnly={sessionRole === 'runner'}
          onWeekUpdate={() => {}}
        />
      </div>
    </div>
  )
}
