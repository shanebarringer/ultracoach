'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Layout from '@/components/layout/Layout'
import ConversationList from '@/components/chat/ConversationList'
import ChatWindow from '@/components/chat/ChatWindow'
import type { User } from '@/lib/supabase'

export default function ChatUserPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [recipient, setRecipient] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)

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
  }, [userId, router])

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchRecipient()
  }, [session, status, router, userId, fetchRecipient])

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow overflow-hidden">
          {/* Mobile Sidebar Toggle */}
          <div className="md:hidden">
            {showSidebar && (
              <div className="fixed inset-0 z-50 flex">
                <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowSidebar(false)}></div>
                <div className="relative w-80 bg-white">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
                      <button
                        onClick={() => setShowSidebar(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <ConversationList selectedUserId={userId} />
                </div>
              </div>
            )}
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden md:block w-1/3 lg:w-1/4 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-600 mt-1">
                {session.user.role === 'coach' 
                  ? 'Chat with your runners'
                  : 'Chat with your coach'
                }
              </p>
            </div>
            <ConversationList selectedUserId={userId} />
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col relative">
            {/* Mobile Header with Sidebar Toggle */}
            <div className="md:hidden flex items-center px-4 py-2 border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowSidebar(true)}
                className="text-gray-600 hover:text-gray-900 mr-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-900">Back to conversations</span>
            </div>

            <ChatWindow recipientId={userId} recipient={recipient} />
          </div>
        </div>
      </div>
    </Layout>
  )
}