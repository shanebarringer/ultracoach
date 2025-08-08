'use client'

import { Avatar, Button, Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react'
import { useAtomValue } from 'jotai'
import { loadable } from 'jotai/utils'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FlagIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { useEffect, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import WeeklyPlannerCalendar from '@/components/workouts/WeeklyPlannerCalendar'
import { useSession } from '@/hooks/useBetterSession'
import { connectedRunnersAtom } from '@/lib/atoms'
import type { User } from '@/lib/supabase'

// Create loadable atom for better UX
const connectedRunnersLoadableAtom = loadable(connectedRunnersAtom)

export default function WeeklyPlannerRunnerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const runnerId = params.runnerId as string
  const runnersLoadable = useAtomValue(connectedRunnersLoadableAtom)
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Get current week's Monday
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    return monday
  })

  // Handle loading and error states from Jotai loadable
  const loading = runnersLoadable.state === 'loading'
  const runners = runnersLoadable.state === 'hasData' ? runnersLoadable.data : []
  const error = runnersLoadable.state === 'hasError' ? runnersLoadable.error : null

  // Derive selectedRunner directly from URL and session
  const selectedRunner = (() => {
    if (session?.user?.role === 'runner' && session.user.id === runnerId) {
      // Runner viewing their own training - use session data
      return {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.name,
        role: session.user.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as User
    }
    // Coach viewing runner's training - find from connected runners
    return runnerId && runners.length > 0
      ? runners.find((r: User) => r.id === runnerId) || null
      : null
  })()

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

  // Handle runner not found - redirect based on role
  useEffect(() => {
    if (session?.user?.role === 'coach' && runners.length > 0 && runnerId && !selectedRunner) {
      // Coach: Runner not found in connected runners, redirect to main weekly planner
      router.push('/weekly-planner')
    }
  }, [runners.length, runnerId, selectedRunner, router, session?.user?.role])

  const formatWeekRange = (monday: Date) => {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return `${monday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${sunday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  }

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

  if (status === 'loading' || (session?.user?.role === 'coach' && loading)) {
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

  // Handle error state
  if (error) {
    return (
      <Layout>
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <Card className="border-danger-200 bg-danger-50">
            <CardBody className="text-center py-12">
              <div className="text-danger-600 mb-4">Failed to load runners</div>
              <Button color="primary" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardBody>
          </Card>
        </div>
      </Layout>
    )
  }

  if (!selectedRunner) {
    return (
      <Layout>
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <Card className="border-warning-200 bg-warning-50">
            <CardBody className="text-center py-12">
              <div className="text-warning-600 mb-4">Runner not found</div>
              <Button color="primary" onClick={() => router.push('/weekly-planner')}>
                Back to Weekly Planner
              </Button>
            </CardBody>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8 bg-linear-to-br from-primary/10 via-secondary/5 to-primary/10 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <CalendarDaysIcon className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                    🏔️{' '}
                    {session?.user?.role === 'runner'
                      ? 'My Training Schedule'
                      : 'Weekly Expedition Planner'}
                  </h1>
                  <p className="text-foreground/70 mt-1 text-lg">
                    {session?.user?.role === 'runner'
                      ? 'Your weekly training overview'
                      : `Planning for ${selectedRunner.full_name || selectedRunner.email}`}
                  </p>
                </div>
              </div>
              {session?.user?.role === 'coach' && (
                <Button
                  variant="flat"
                  onClick={() => router.push('/weekly-planner')}
                  className="bg-secondary/20 text-secondary hover:bg-secondary/30"
                >
                  Change Runner
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Runner Info */}
        <Card className="mb-6 bg-linear-to-br from-background to-secondary/5 border-t-4 border-t-secondary">
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <Avatar
                name={selectedRunner.full_name || 'User'}
                size="lg"
                className="bg-linear-to-br from-primary to-secondary text-white"
              />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {selectedRunner.full_name || 'User'}
                </h2>
                <p className="text-foreground/70">{selectedRunner.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Chip
                    size="sm"
                    variant="flat"
                    color="success"
                    startContent={<TrendingUpIcon className="w-3 h-3" />}
                  >
                    Active
                  </Chip>
                  <Chip
                    size="sm"
                    variant="flat"
                    color="secondary"
                    startContent={<FlagIcon className="w-3 h-3" />}
                  >
                    Training
                  </Chip>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Week Navigation */}
        <Card className="mb-6 bg-linear-to-br from-warning/10 to-primary/10 border-t-4 border-t-warning">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-6 h-6 text-warning" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Training Week: {formatWeekRange(currentWeek)}
                  </h2>
                  <p className="text-foreground/70 text-sm">Strategic expedition planning</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  className="text-foreground/70 hover:text-foreground hover:bg-warning/20"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </Button>

                <Button
                  variant="flat"
                  size="sm"
                  onClick={goToCurrentWeek}
                  className="bg-warning/20 text-warning hover:bg-warning/30"
                >
                  Current Week
                </Button>

                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                  className="text-foreground/70 hover:text-foreground hover:bg-warning/20"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Weekly Calendar */}
        <WeeklyPlannerCalendar
          runner={selectedRunner}
          weekStart={currentWeek}
          readOnly={session?.user?.role === 'runner'}
          onWeekUpdate={() => {
            // Week updated successfully - data will be automatically refreshed
          }}
        />
      </div>
    </Layout>
  )
}
