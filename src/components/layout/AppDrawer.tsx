'use client'

import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/drawer'
import { useAtom } from 'jotai'

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
      },
      { href: '/relationships', label: 'Connections' },
      { href: '/calendar', label: 'Calendar' },
      { href: '/workouts', label: 'Workouts' },
      { href: '/chat', label: 'Messages' },
    ]

    if (session.user.role === 'coach') {
      return [
        baseItems[0], // Dashboard
        baseItems[1], // Relationships
        { href: '/runners', label: 'Runners' },
        { href: '/races', label: 'Races' },
        baseItems[2], // Calendar
        { href: '/weekly-planner', label: 'Planner' },
        { href: '/coach/weekly-overview', label: 'Overview' },
        { href: '/training-plans', label: 'Plans' },
        ...baseItems.slice(3), // Workouts, Messages
      ]
    }

    return [
      ...baseItems.slice(0, 3), // Dashboard, Relationships, Calendar
      { href: '/weekly-planner', label: 'My Training' }, // Read-only weekly planner for runners
      ...baseItems.slice(3), // Workouts, Messages
    ]
  }, [session])

  return (
    <Drawer isOpen={uiState.isDrawerOpen} placement="left" onClose={onClose}>
      <DrawerContent>
        <DrawerHeader>Navigation</DrawerHeader>
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
