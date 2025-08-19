'use client'

import {
  Calendar,
  CalendarDays,
  Dumbbell,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageCircle,
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
    role: 'runner' | 'coach'
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
}
