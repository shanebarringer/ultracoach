'use client'

import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/drawer'
import { useAtom } from 'jotai'
import { Mountain } from 'lucide-react'

import { useCallback } from 'react'

import { useBetterSession, useSession } from '@/hooks/useBetterSession'
import { useNavigationItems } from '@/hooks/useNavigationItems'
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

  // Use centralized navigation hook to eliminate DRY violation
  const userNavItems = useNavigationItems(session)

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
