'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

export default function SessionProvider({ 
  children,
  session
}: {
  children: React.ReactNode
  session: Session | null
}) {
  return (
    <NextAuthSessionProvider 
      session={session}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when window gains focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      {children}
    </NextAuthSessionProvider>
  )
}