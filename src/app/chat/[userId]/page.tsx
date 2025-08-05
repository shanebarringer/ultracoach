'use client'

import {
  Button,
  Card,
  CardHeader,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Spinner,
  useDisclosure,
} from '@heroui/react'
import { ArrowLeftIcon, MenuIcon, MessageCircleIcon, MountainSnowIcon } from 'lucide-react'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

import ChatWindow from '@/components/chat/ChatWindow'
import ConversationList from '@/components/chat/ConversationList'
import Layout from '@/components/layout/Layout'
import { useSession } from '@/hooks/useBetterSession'
import type { User } from '@/lib/supabase'

export default function ChatUserPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [recipient, setRecipient] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const fetchRecipient = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/users/${userId}`)

      if (!response.ok) {
        console.error('Error fetching recipient:', response.statusText)
        router.push('/chat')
        return
      }

      const data = await response.json()
      setRecipient(data.user)
    } catch (error) {
      console.error('Error fetching recipient:', error)
      router.push('/chat')
    } finally {
      setLoading(false)
    }
  }, [userId, router]) // Include router dependency as required by ESLint

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchRecipient()
  }, [status, session, userId, fetchRecipient, router]) // Include all dependencies as required by ESLint

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" label="Loading expedition communications..." />
        </div>
      </Layout>
    )
  }

  if (!session || !recipient) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Conversations Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="md" className="md:hidden">
          <ModalContent>
            <ModalHeader className="flex items-center gap-2">
              <MessageCircleIcon className="w-5 h-5 text-primary" />
              <span>Base Camp Communications</span>
            </ModalHeader>
            <ModalBody className="p-0">
              <ConversationList selectedUserId={userId} />
            </ModalBody>
          </ModalContent>
        </Modal>

        <Card className="h-[calc(100vh-200px)] flex flex-col overflow-hidden">
          <div className="flex flex-1 min-h-0">
            {/* Desktop Sidebar */}
            <div className="hidden md:block w-1/3 lg:w-1/4 border-r border-divider flex flex-col">
              <CardHeader className="bg-linear-to-r from-primary/10 to-secondary/10 border-b border-divider">
                <div className="flex items-center gap-2">
                  <MessageCircleIcon className="w-5 h-5 text-primary" />
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">
                      🏔️ Base Camp Communications
                    </h1>
                    <p className="text-sm text-foreground-600 mt-1">
                      {session.user.role === 'coach'
                        ? 'Guide your expedition team'
                        : 'Connect with your mountain guide'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <div className="flex-1 overflow-hidden">
                <ConversationList selectedUserId={userId} />
              </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Mobile Header with Sidebar Toggle */}
              <div className="md:hidden flex items-center px-4 py-3 border-b border-divider bg-linear-to-r from-primary/10 to-secondary/10">
                <Button isIconOnly variant="light" onPress={onOpen} className="mr-3">
                  <MenuIcon className="w-5 h-5" />
                </Button>
                <Button
                  isIconOnly
                  variant="light"
                  onPress={() => router.push('/chat')}
                  className="mr-3"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <MountainSnowIcon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Expedition Communications
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <ChatWindow recipientId={userId} recipient={recipient} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
