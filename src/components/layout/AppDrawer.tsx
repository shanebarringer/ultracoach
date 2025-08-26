'use client'

import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/drawer'
import { Button } from '@heroui/react'
import { useAtom } from 'jotai'
import { Mountain, Pin, PinOff } from 'lucide-react'

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
    // Only close if not pinned
    if (!uiState.isDrawerPinned) {
      setUiState(prev => ({ ...prev, isDrawerOpen: false }))
    }
  }, [setUiState, uiState.isDrawerPinned])

  const handlePin = useCallback(() => {
    setUiState(prev => ({ ...prev, isDrawerPinned: !prev.isDrawerPinned }))
  }, [setUiState])

  const handleForceClose = useCallback(() => {
    setUiState(prev => ({ ...prev, isDrawerOpen: false, isDrawerPinned: false }))
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
      isDismissable={!uiState.isDrawerPinned}
      isKeyboardDismissDisabled={uiState.isDrawerPinned}
      size="sm"
      classNames={{
        base: 'data-[placement=left]:border-r-1 data-[placement=left]:border-divider data-[placement=left]:w-80 sm:data-[placement=left]:w-72',
        backdrop: uiState.isDrawerPinned ? 'hidden' : 'bg-background/20 backdrop-blur-sm', // Lighter, more subtle backdrop
        body: 'px-3 py-4',
        header: 'px-4 py-4 border-b-1 border-divider bg-content1/90 backdrop-blur-md',
      }}
    >
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">UltraCoach</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={handlePin}
              className="text-foreground/60 hover:text-foreground"
              title={uiState.isDrawerPinned ? 'Unpin drawer' : 'Pin drawer open'}
            >
              {uiState.isDrawerPinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>
            {uiState.isDrawerPinned && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={handleForceClose}
                className="text-foreground/60 hover:text-foreground ml-1"
                title="Close drawer"
              >
                ✕
              </Button>
            )}
          </div>
        </DrawerHeader>
        <DrawerBody>
          <MobileNavContent
            session={session}
            status={status}
            userNavItems={userNavItems}
            handleSignOut={handleSignOut}
            handleMenuClose={uiState.isDrawerPinned ? handleForceClose : onClose}
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
