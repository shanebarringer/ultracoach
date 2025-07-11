'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import ConversationList from '@/components/chat/ConversationList'

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow overflow-hidden">
          {/* Conversations Sidebar */}
          <div className="w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-600 mt-1">
                {session.user.role === 'coach' 
                  ? 'Chat with your runners'
                  : 'Chat with your coach'
                }
              </p>
            </div>
            <ConversationList />
          </div>

          {/* Empty State */}
          <div className="hidden md:flex md:flex-1 items-center justify-center bg-gray-50">
            <div className="text-center max-w-sm">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a conversation</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a conversation from the list to start messaging.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}