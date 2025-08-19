'use client'

import { Button } from '@heroui/react'

import { memo } from 'react'

import Link from 'next/link'

interface MobileNavContentProps {
  session: {
    user: {
      id: string
      email: string
      name: string
      role: 'runner' | 'coach'
    }
  } | null
  status: string
  userNavItems: { href: string; label: string }[]
  handleSignOut: () => Promise<void>
  handleMenuClose: () => void
}

function MobileNavContent({
  session,
  status,
  userNavItems,
  handleSignOut,
  handleMenuClose,
}: MobileNavContentProps) {
  return (
    <>
      {status === 'loading' ? (
        // Show nothing while loading to prevent flash
        <></>
      ) : session ? (
        <>
          {userNavItems.map(item => (
            <div
              key={item.href}
              className="w-full py-2 px-3 text-foreground hover:text-primary transition-colors font-medium text-base"
            >
              <Link href={item.href} onClick={handleMenuClose}>
                {item.label}
              </Link>
            </div>
          ))}
          <div className="w-full py-2 px-3 text-foreground hover:text-primary transition-colors font-medium text-base">
            <Link href="/profile" onClick={handleMenuClose}>
              Profile
            </Link>
          </div>
          <div className="w-full py-2 px-3">
            <Button
              onClick={() => {
                handleSignOut()
                handleMenuClose()
              }}
              className="w-full text-left"
              variant="light"
            >
              Sign Out
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="w-full py-2 px-3">
            <Button
              as={Link}
              href="/auth/signin"
              variant="light"
              className="w-full text-left"
              onClick={handleMenuClose}
            >
              Sign In
            </Button>
          </div>
          <div className="w-full py-2 px-3">
            <Button
              as={Link}
              href="/auth/signup"
              color="primary"
              className="w-full"
              onClick={handleMenuClose}
            >
              Sign Up
            </Button>
          </div>
        </>
      )}
    </>
  )
}

export default memo(MobileNavContent)
