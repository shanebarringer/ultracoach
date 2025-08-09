import { notFound, redirect } from 'next/navigation'

import { getUserById, requireAuth, verifyConversationPermission } from '@/utils/auth-server'

import ChatUserPageClient from './ChatUserPageClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ userId: string }>
}

/**
 * Chat User Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication and data fetching.
 * Verifies user permissions and fetches recipient data before rendering.
 */
export default async function ChatUserPage({ params }: Props) {
  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()

  // Await params in Next.js 15
  const { userId } = await params

  if (!userId) {
    redirect('/chat')
  }

  // Server-side recipient validation
  const recipient = await getUserById(userId)

  if (!recipient) {
    notFound()
  }

  // Verify user has permission to chat with this recipient
  const canChat = await verifyConversationPermission(userId)

  if (!canChat) {
    redirect('/chat')
  }

  // Pass all authenticated data to Client Component
  return <ChatUserPageClient user={session.user} recipient={recipient} userId={userId} />
}
