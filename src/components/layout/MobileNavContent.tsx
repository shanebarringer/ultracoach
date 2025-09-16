'use client'

import { Avatar, Button, Divider } from '@heroui/react'
import { LogOut, User } from 'lucide-react'

import { memo } from 'react'

import Link from 'next/link'

interface NavItem {
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  description?: string
}

interface MobileNavContentProps {
  session: {
    user: {
      id: string
      email: string
      name: string
      userType: 'runner' | 'coach'
    }
  } | null
  status: string
  userNavItems: NavItem[]
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
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-sm text-default-500">Loading...</div>
        </div>
      ) : session ? (
        <>
          {/* User Profile Section */}
          <div className="flex items-center gap-3 px-3 py-4 mb-2 bg-content2 rounded-lg">
            <Avatar
              name={session.user.name}
              size="sm"
              className="flex-shrink-0"
              classNames={{
                base: 'bg-primary',
                name: 'text-white font-medium',
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {session.user.name}
              </div>
              <div className="text-xs text-default-500 truncate capitalize">
                {session.user.userType}
              </div>
            </div>
          </div>

          <Divider className="mb-4" />

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1 mb-4">
            {userNavItems.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleMenuClose}
                  className="flex items-center gap-3 px-4 py-4 rounded-lg text-foreground hover:bg-content2 hover:text-primary transition-all duration-200 group active:scale-[0.98] touch-manipulation min-h-[48px]"
                >
                  {Icon && (
                    <Icon className="h-5 w-5 text-default-500 group-hover:text-primary transition-colors" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-default-400 mt-0.5">{item.description}</div>
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>

          <Divider className="mb-4" />

          {/* Profile and Sign Out */}
          <div className="flex flex-col gap-2">
            <Link
              href="/profile"
              onClick={handleMenuClose}
              className="flex items-center gap-3 px-4 py-4 rounded-lg text-foreground hover:bg-content2 hover:text-primary transition-all duration-200 group active:scale-[0.98] touch-manipulation min-h-[48px]"
            >
              <User className="h-5 w-5 text-default-500 group-hover:text-primary transition-colors" />
              <div className="flex-1">
                <div className="text-sm font-medium">Profile</div>
                <div className="text-xs text-default-400 mt-0.5">
                  Account settings & preferences
                </div>
              </div>
            </Link>

            <Button
              onClick={() => {
                handleSignOut()
                handleMenuClose()
              }}
              variant="light"
              startContent={<LogOut className="h-4 w-4" />}
              className="justify-start px-4 h-auto py-4 text-danger hover:text-danger-600 hover:bg-danger-50 active:scale-[0.98] touch-manipulation min-h-[48px]"
            >
              <div className="text-left">
                <div className="text-sm font-medium">Sign Out</div>
                <div className="text-xs opacity-70">Exit your account</div>
              </div>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="text-center py-4 mb-6">
            <div className="text-lg font-semibold text-foreground mb-2">Welcome to UltraCoach</div>
            <div className="text-sm text-default-500">Sign in to access your training</div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              as={Link}
              href="/auth/signin"
              variant="bordered"
              className="w-full h-auto py-4 active:scale-[0.98] touch-manipulation min-h-[48px]"
              onClick={handleMenuClose}
            >
              <div className="text-center">
                <div className="text-sm font-medium">Sign In</div>
                <div className="text-xs text-default-500">Access your account</div>
              </div>
            </Button>

            <Button
              as={Link}
              href="/auth/signup"
              color="primary"
              className="w-full h-auto py-4 active:scale-[0.98] touch-manipulation min-h-[48px]"
              onClick={handleMenuClose}
            >
              <div className="text-center">
                <div className="text-sm font-medium">Sign Up</div>
                <div className="text-xs text-primary-200">Start your journey</div>
              </div>
            </Button>
          </div>
        </>
      )}
    </>
  )
}

export default memo(MobileNavContent)
