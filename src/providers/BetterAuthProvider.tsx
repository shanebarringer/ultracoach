'use client'

import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { sessionAtom, userAtom, authLoadingAtom } from '@/lib/atoms'
import { authClient } from '@/lib/better-auth-client'

export function BetterAuthProvider({ children }: { children: React.ReactNode }) {
  const [, setSession] = useAtom(sessionAtom)
  const [, setUser] = useAtom(userAtom)
  const [, setAuthLoading] = useAtom(authLoadingAtom)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: session, error } = await authClient.getSession()
        
        if (error) {
          console.error('Better Auth session error:', error)
          setSession(null)
          setUser(null)
        } else if (session) {
          console.log('Better Auth session restored:', session.user?.email)
          setSession(session)
          setUser(session?.user || null)
        } else {
          // No session found, which is normal for unauthenticated users
          setSession(null)
          setUser(null)
        }
      } catch (error) {
        console.error('Better Auth critical error:', error)
        setSession(null)
        setUser(null)
      } finally {
        setAuthLoading(false)
      }
    }

    getSession()
  }, [setSession, setUser, setAuthLoading])

  return <>{children}</>
}