import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getServerSession } from '@/utils/auth-server'

import HomePageClient from './HomePageClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Home Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Redirects authenticated users to their appropriate dashboard.
 */
export default async function Home() {
  // Force dynamic rendering by accessing headers
  await headers()

  // Server-side authentication check
  const session = await getServerSession()

  // If user is authenticated, redirect to appropriate dashboard
  if (session?.user) {
    redirect('/dashboard')
  }

  // Show landing page for unauthenticated users
  return <HomePageClient />
}
