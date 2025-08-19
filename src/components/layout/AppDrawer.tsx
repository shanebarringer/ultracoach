'use client'

import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/drawer'
import { useAtom } from 'jotai'
import {
  Calendar,
  CalendarDays,
  Dumbbell,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Mountain,
  TrendingUp,
  Users,
} from 'lucide-react'

import { useCallback, useMemo } from 'react'

import { useBetterSession, useSession } from '@/hooks/useBetterSession'
import { uiStateAtom } from '@/lib/atoms'

import MobileNavContent from './MobileNavContent'

export default function AppDrawer() {
  const [uiState, setUiState] = useAtom(uiStateAtom)
  const { data: session, status } = useSession()
  const { signOut } = useBetterSession()

  const onClose = useCallback(() => {
    setUiState(prev => ({ ...prev, isDrawerOpen: false }))
  }, [setUiState])

  const handleSignOut = useCallback(async () => {
    await signOut()
    window.location.href = '/'
  }, [signOut])

  const userNavItems = useMemo(() => {
    if (!session) return []

    const baseItems = [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        description: 'Overview and metrics',
      },
      {
        href: '/relationships',
        label: 'Connections',
        icon: Users,
        description: 'Manage relationships',
      },
      {
        href: '/calendar',
        label: 'Calendar',
        icon: Calendar,
        description: 'View scheduled workouts',
      },
      {
        href: '/workouts',
        label: 'Workouts',
        icon: Dumbbell,
        description: 'Track your training',
      },
      {
        href: '/chat',
        label: 'Messages',
        icon: MessageCircle,
        description: 'Chat with your team',
      },
    ]

    if (session.user.role === 'coach') {
      return [
        baseItems[0], // Dashboard
        baseItems[1], // Relationships
        {
          href: '/runners',
          label: 'Runners',
          icon: Users,
          description: 'Manage your athletes',
        },
        {
          href: '/races',
          label: 'Races',
          icon: MapPin,
          description: 'Browse race events',
        },
        baseItems[2], // Calendar
        {
          href: '/weekly-planner',
          label: 'Planner',
          icon: CalendarDays,
          description: 'Plan training weeks',
        },
        {
          href: '/coach/weekly-overview',
          label: 'Overview',
          icon: TrendingUp,
          description: 'Athlete progress tracking',
        },
        {
          href: '/training-plans',
          label: 'Plans',
          icon: FileText,
          description: 'Create & manage plans',
        },
        ...baseItems.slice(3), // Workouts, Messages
      ]
    }

    return [
      ...baseItems.slice(0, 3), // Dashboard, Relationships, Calendar
      {
        href: '/weekly-planner',
        label: 'My Training',
        icon: CalendarDays,
        description: 'View your training plan',
      },
      ...baseItems.slice(3), // Workouts, Messages
    ]
  }, [session])

  return (
    <Drawer
      isOpen={uiState.isDrawerOpen}
      placement="left"
      onClose={onClose}
      classNames={{
        base: 'data-[placement=left]:border-r-1 data-[placement=left]:border-divider',
        backdrop: 'backdrop-blur-sm bg-background/20',
        body: 'px-2 py-4',
        header:
          'px-4 py-6 border-b-1 border-divider bg-gradient-to-r from-primary-50 to-secondary-50',
      }}
    >
      <DrawerContent>
        <DrawerHeader className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">UltraCoach</span>
          </div>
        </DrawerHeader>
        <DrawerBody>
          <MobileNavContent
            session={session}
            status={status}
            userNavItems={userNavItems}
            handleSignOut={handleSignOut}
            handleMenuClose={onClose} // Pass onClose as handleMenuClose
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
