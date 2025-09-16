'use client'

import {
  Calendar,
  CalendarDays,
  Dumbbell,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react'

import { useMemo } from 'react'

interface NavItem {
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  description?: string
}

interface Session {
  user: {
    userType: 'runner' | 'coach'
  }
}

/**
 * Custom hook that provides navigation items based on user role.
 * Eliminates DRY violation between Header and AppDrawer components.
 *
 * @param session - User session data
 * @returns Memoized navigation items array
 */
export function useNavigationItems(session: Session | null): NavItem[] {
  return useMemo(() => {
    if (!session) return []

    const baseItems: NavItem[] = [
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

    const [dashboardItem, connectionsItem, calendarItem, workoutsItem, messagesItem] = baseItems

    if (session.user.userType === 'coach') {
      return [
        dashboardItem,
        connectionsItem,
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
        calendarItem,
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
        workoutsItem,
        messagesItem,
        {
          href: '/settings',
          label: 'Settings',
          icon: Settings,
          description: 'Account & preferences',
        },
      ]
    }

    return [
      dashboardItem,
      connectionsItem,
      calendarItem,
      {
        href: '/weekly-planner',
        label: 'My Training',
        icon: CalendarDays,
        description: 'View your training plan',
      },
      workoutsItem,
      messagesItem,
      {
        href: '/settings',
        label: 'Settings',
        icon: Settings,
        description: 'Account & preferences',
      },
    ]
  }, [session])
}
