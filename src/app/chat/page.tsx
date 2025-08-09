import { requireAuth } from '@/utils/auth-server'
import ChatPageClient from './ChatPageClient'

/**
 * Chat Page (Server Component)
 * 
 * Forces dynamic rendering and handles server-side authentication.
 * Renders personalized chat interface based on user role.
 */
export default async function ChatPage() {
  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()
  
  // Pass authenticated user data to Client Component
  return <ChatPageClient user={session.user} />
}
