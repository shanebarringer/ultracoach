import { Suspense } from 'react'

import { headers } from 'next/headers'

import { ChatWindowSkeleton } from '@/components/ui/LoadingSkeletons'
import { requireAuth } from '@/utils/auth-server'

import ChatPageClient from './ChatPageClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Chat Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Renders personalized chat interface based on user role.
 */
export default async function ChatPage() {
  // Force dynamic rendering prior to auth check
  await headers()

  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()

  // Pass authenticated user data to Client Component wrapped in Suspense
  return (
    <Suspense fallback={<ChatWindowSkeleton />}>
      <ChatPageClient user={session.user} />
    </Suspense>
  )
}
