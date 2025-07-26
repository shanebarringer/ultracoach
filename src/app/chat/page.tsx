'use client'

import { Button, Card, CardHeader, Spinner } from '@heroui/react'
import { useAtom } from 'jotai'
import { MessageCircleIcon, MountainIcon, PlusIcon } from 'lucide-react'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import ConversationList from '@/components/chat/ConversationList'
import NewMessageModal from '@/components/chat/NewMessageModal'
import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { useSession } from '@/hooks/useBetterSession'
import { chatUiStateAtom } from '@/lib/atoms'

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [chatUiState, setChatUiState] = useAtom(chatUiStateAtom)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" label="Loading expedition communications..." />
        </div>
      </Layout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="flex h-[calc(100vh-200px)] overflow-hidden">
            {/* Conversations Sidebar */}
            <div className="w-full md:w-1/3 lg:w-1/4 border-r border-divider flex flex-col">
              <CardHeader className="bg-content2 border-b border-divider">
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <MessageCircleIcon className="w-5 h-5 text-primary" />
                    <h1 className="text-lg font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      Base Camp Communications
                    </h1>
                  </div>
                  <Button
                    isIconOnly
                    color="primary"
                    variant="solid"
                    size="sm"
                    onPress={() => setChatUiState(prev => ({ ...prev, showNewMessage: true }))}
                    className="hover:scale-105 transition-transform"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-foreground-600 mt-2">
                  {session.user.role === 'coach'
                    ? 'Guide your expedition team'
                    : 'Connect with your guide'}
                </p>
              </CardHeader>
              <div className="flex-1 overflow-hidden">
                <ConversationList />
              </div>
            </div>

            {/* Empty State */}
            <div className="hidden md:flex md:flex-1 items-center justify-center bg-content1">
              <div className="text-center max-w-sm">
                <div className="relative mb-6">
                  <MountainIcon className="mx-auto h-16 w-16 text-primary/60" />
                  <MessageCircleIcon className="absolute -top-2 -right-2 h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Choose Your Communication
                </h3>
                <p className="text-foreground-600 mb-4">
                  Select a conversation from the sidebar to begin your expedition dialogue.
                </p>
                <Button
                  color="primary"
                  variant="bordered"
                  startContent={<PlusIcon className="w-4 h-4" />}
                  onPress={() => setChatUiState(prev => ({ ...prev, showNewMessage: true }))}
                >
                  Start New Conversation
                </Button>
              </div>
            </div>
          </Card>

          <NewMessageModal
            isOpen={chatUiState.showNewMessage || false}
            onClose={() => setChatUiState(prev => ({ ...prev, showNewMessage: false }))}
          />
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
