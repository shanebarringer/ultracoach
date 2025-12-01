/**
 * Decline Invitation Page (Server Component)
 * Uses Server/Client hybrid pattern for proper dynamic rendering
 */
import DeclinePageClient from './DeclinePageClient'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitationDeclinePage({ params }: PageProps) {
  const { token } = await params

  return <DeclinePageClient token={token} />
}
