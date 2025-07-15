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
        } else {
          setSession(session)
          setUser(session?.user || null)
        }
      } catch (error) {
        console.error('Better Auth error:', error)
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