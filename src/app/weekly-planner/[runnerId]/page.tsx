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

import { useEffect, useState } from 'react'
import { Suspense } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import WeeklyPlannerCalendar from '@/components/workouts/WeeklyPlannerCalendar'
import { useSession } from '@/hooks/useBetterSession'
import { connectedRunnersAtom } from '@/lib/atoms/index'
import type { User } from '@/lib/supabase'

export default function WeeklyPlannerRunnerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const runnerId = params.runnerId as string

  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    return monday
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'coach' && session.user.role !== 'runner') {
      router.push('/dashboard')
      return
    }
    if (session.user.role === 'runner' && session.user.id !== runnerId) {
      router.push(`/weekly-planner/${session.user.id}`)
    }
  }, [status, session, router, runnerId])

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

  if (session.user.userType === 'runner' && session.user.id === runnerId) {
    const selfRunner: User = {
      id: session.user.id,
      email: session.user.email,
      full_name: session.user.name,
      userType: 'runner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User
    return (
      <Layout>
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4 lg:py-8">
          <RunnerHeaderAndCalendar
            selectedRunner={selfRunner}
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
            isCoach={false}
          />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4 lg:py-8">
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          }
        >
          <CoachRunnerResolver
            runnerId={runnerId}
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
          />
        </Suspense>
      </div>
    </Layout>
  )
}

function CoachRunnerResolver({
  runnerId,
  currentWeek,
  setCurrentWeek,
}: {
  runnerId: string
  currentWeek: Date
  setCurrentWeek: (d: Date) => void
}) {
  const router = useRouter()
  const runners = useAtomValue(connectedRunnersAtom)
  const selectedRunner = runners.find(r => r.id === runnerId) || null
  if (!selectedRunner) {
    return (
      <Card className="border-warning-200 bg-warning-50">
        <CardBody className="text-center py-12">
          <div className="text-warning-600 mb-4">Runner not found</div>
          <Button color="primary" onClick={() => router.push('/weekly-planner')}>
            Back to Weekly Planner
          </Button>
        </CardBody>
      </Card>
    )
  }
  return (
    <RunnerHeaderAndCalendar
      selectedRunner={selectedRunner}
      currentWeek={currentWeek}
      setCurrentWeek={setCurrentWeek}
      isCoach
    />
  )
}

function RunnerHeaderAndCalendar({
  selectedRunner,
  currentWeek,
  setCurrentWeek,
  isCoach,
}: {
  selectedRunner: User
  currentWeek: Date
  setCurrentWeek: (d: Date) => void
  isCoach: boolean
}) {
  const router = useRouter()
  // Session not needed here; parent handled auth and role
  const [localWeek, setLocalWeek] = useState(currentWeek)

  useEffect(() => setCurrentWeek(localWeek), [localWeek, setCurrentWeek])

  const formatWeekRange = (monday: Date) => {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(localWeek)
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7))
    setLocalWeek(newWeek)
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    setLocalWeek(monday)
  }

  return (
    <>
      <Card className="mb-4 lg:mb-6 bg-content1 border-l-4 border-l-primary">
        <CardHeader className="pb-3 lg:pb-4 px-4 lg:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full mb-3 lg:mb-4 gap-3 lg:gap-0">
            <div className="flex items-center gap-3">
              <CalendarDaysIcon className="w-6 lg:w-8 h-6 lg:h-8 text-primary" />
              <div>
                <h1 className="text-lg lg:text-2xl font-bold text-foreground">
                  🏔️ {isCoach ? 'Weekly Planner' : 'My Training'}
                </h1>
                <p className="text-foreground/70 text-xs lg:text-sm">
                  {isCoach
                    ? `Planning for ${selectedRunner.full_name || selectedRunner.email}`
                    : 'Your weekly overview'}
                </p>
              </div>
            </div>
            {isCoach && (
              <Button
                variant="flat"
                size="sm"
                onClick={() => router.push('/weekly-planner')}
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
                  {formatWeekRange(localWeek)}
                </p>
                <p className="text-foreground/50 text-xs">Training Week</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  className="text-foreground/70 hover:text-foreground"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="flat"
                  size="sm"
                  onClick={goToCurrentWeek}
                  className="text-warning px-2 lg:px-3 text-xs lg:text-sm"
                >
                  Today
                </Button>
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek('next')}
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
          weekStart={localWeek}
          readOnly={!isCoach}
          onWeekUpdate={() => {}}
        />
      </div>
    </>
  )
}
