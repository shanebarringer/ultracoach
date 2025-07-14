'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Chip, 
  Spinner, 
  Avatar 
} from '@heroui/react'
import { 
  CalendarDaysIcon, 
  UsersIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ClockIcon,
  MapPinIcon,
  TrendingUpIcon,
  RouteIcon,
  FlagIcon
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import WeeklyPlannerCalendar from '@/components/workouts/WeeklyPlannerCalendar'
import type { User } from '@/lib/supabase'
import classNames from 'classnames'

export default function WeeklyPlannerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [runners, setRunners] = useState<User[]>([])
  const [selectedRunner, setSelectedRunner] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Get current week's Monday
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    return monday
  })

  const fetchRunners = useCallback(async () => {
    if (!session?.user?.id || session.user.role !== 'coach') return

    try {
      const response = await fetch('/api/runners')
      
      if (!response.ok) {
        console.error('Failed to fetch runners:', response.statusText)
        return
      }

      const data = await response.json()
      setRunners(data.runners || [])
    } catch (error) {
      console.error('Error fetching runners:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, session?.user?.role])

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'coach') {
      router.push('/dashboard')
      return
    }

    fetchRunners()
  }, [session, status, router, fetchRunners])

  const formatWeekRange = (monday: Date) => {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    return `${monday.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${sunday.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
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

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" label="Loading expedition planning..." />
        </div>
      </Layout>
    )
  }

  if (!session || session.user.role !== 'coach') {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CalendarDaysIcon className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  🏔️ Weekly Expedition Planner
                </h1>
                <p className="text-foreground/70 mt-1 text-lg">
                  Architect your team&apos;s weekly training summit - strategic workout planning for peak performance
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Runner Selection */}
        <Card className="mb-6 bg-gradient-to-br from-background to-secondary/5 border-t-4 border-t-secondary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <UsersIcon className="w-6 h-6 text-secondary" />
              <h2 className="text-xl font-semibold text-foreground">
                Select Your Training Partner
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" color="secondary" label="Loading your expedition team..." />
              </div>
            ) : runners.length === 0 ? (
              <div className="text-center py-8">
                <RouteIcon className="mx-auto w-12 h-12 text-default-400 mb-4" />
                <p className="text-foreground/70 text-lg">
                  No training partners found. Create training plans to connect with runners.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {runners.map((runner) => (
                  <Card
                    key={runner.id}
                    isPressable
                    onPress={() => setSelectedRunner(runner)}
                    className={classNames(
                      'transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer',
                      selectedRunner?.id === runner.id
                        ? 'ring-2 ring-primary bg-gradient-to-br from-primary/10 to-secondary/10 border-l-4 border-l-primary'
                        : 'hover:bg-gradient-to-br hover:from-secondary/5 hover:to-primary/5 border-l-4 border-l-transparent'
                    )}
                  >
                    <CardBody className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={runner.full_name}
                          size="md"
                          className="bg-gradient-to-br from-primary to-secondary text-white"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{runner.full_name}</h3>
                          <p className="text-sm text-foreground/70">{runner.email}</p>
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
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Week Navigation */}
        {selectedRunner && (
          <Card className="mb-6 bg-gradient-to-br from-warning/10 to-primary/10 border-t-4 border-t-warning">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-6 h-6 text-warning" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Training Week: {formatWeekRange(currentWeek)}
                    </h2>
                    <p className="text-foreground/70 text-sm">
                      Planning expedition for {selectedRunner.full_name}
                    </p>
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
        )}

        {/* Weekly Calendar */}
        {selectedRunner && (
          <WeeklyPlannerCalendar
            runner={selectedRunner}
            weekStart={currentWeek}
            onWeekUpdate={() => {
              // Refresh runner's data or show success message
              console.log('Week updated successfully!')
            }}
          />
        )}

        {!selectedRunner && !loading && runners.length > 0 && (
          <Card className="bg-gradient-to-br from-default/10 to-secondary/10 border-t-4 border-t-default">
            <CardBody className="text-center py-12">
              <CalendarDaysIcon className="mx-auto w-16 h-16 text-default-400 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Ready to Plan Your Next Expedition?
              </h3>
              <p className="text-foreground/70 text-lg mb-4">
                Select a training partner from above to architect their weekly summit plan.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-foreground/60">
                <MapPinIcon className="w-4 h-4" />
                <span>Strategic weekly planning for peak performance</span>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </Layout>
  )
}