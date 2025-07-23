'use client'

import { useEffect, useCallback } from 'react'
import { useAtom } from 'jotai'
import { useSession } from '@/hooks/useBetterSession'
import { useRouter } from 'next/navigation'
import { newMessageModalAtom } from '@/lib/atoms'

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
}

import { Modal, ModalContent, ModalHeader, ModalBody, Input, Button } from '@heroui/react'

export default function NewMessageModal({ isOpen, onClose }: NewMessageModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [newMessageState, setNewMessageState] = useAtom(newMessageModalAtom)

  const fetchAvailableUsers = useCallback(async () => {
    if (!session?.user) return

    setNewMessageState(prev => ({ ...prev, loading: true }))
    try {
      let endpoint = ''
      if (session.user.role === 'coach') {
        // Coaches can message their runners
        endpoint = '/api/runners'
      } else {
        // Runners can message their coaches
        endpoint = '/api/coaches'
      }

      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setNewMessageState(prev => ({ 
          ...prev, 
          availableUsers: data.runners || data.coaches || [],
          loading: false
        }))
      }
    } catch (error) {
      console.error('Error fetching available users:', error)
      setNewMessageState(prev => ({ ...prev, loading: false }))
    }
  }, [session?.user, setNewMessageState])

  useEffect(() => {
    if (isOpen && session?.user) {
      fetchAvailableUsers()
    }
  }, [isOpen, session?.user, fetchAvailableUsers])

  const handleStartConversation = (userId: string) => {
    onClose()
    router.push(`/chat/${userId}`)
  }

  const filteredUsers = newMessageState.availableUsers.filter(user =>
    user.full_name?.toLowerCase().includes(newMessageState.searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(newMessageState.searchTerm.toLowerCase())
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>New Message</ModalHeader>
        <ModalBody>
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={newMessageState.searchTerm}
            onChange={(e) => setNewMessageState(prev => ({ ...prev, searchTerm: e.target.value }))}
          />
          <div className="max-h-64 overflow-y-auto mt-4">
            {newMessageState.loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {newMessageState.searchTerm ? 'No users found' : `No ${session?.user?.role === 'coach' ? 'runners' : 'coaches'} found`}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {session?.user?.role === 'coach' 
                    ? 'Create training plans to connect with runners'
                    : 'Ask your coach to create a training plan for you'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant="light"
                    className="w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors text-left justify-start"
                    onClick={() => handleStartConversation(user.id)}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium mr-3">
                      {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{user.email || 'No email'}</p>
                      <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}