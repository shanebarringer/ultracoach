import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getServerSession } from '@/utils/auth-server'

import RacesPageClient from './RacesPageClient'

/**
 * Races Page (Server Component)
 *
 * Forces dynamic rendering and handles authentication at the server level.
 * Following the Server/Client Component hybrid pattern for authenticated routes.
 */
export default async function RacesPage() {
  // Force dynamic rendering - CRITICAL for authenticated routes
  await headers()

  // Server-side authentication check
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Both coaches and runners can access races page
  // Client component will handle its own data fetching
  return <RacesPageClient />
}
