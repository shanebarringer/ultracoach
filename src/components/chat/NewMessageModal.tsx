'use client'

import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtom } from 'jotai'
import { z } from 'zod'

import { useCallback, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useRouter } from 'next/navigation'

import { useSession } from '@/hooks/useBetterSession'
import { newMessageModalAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'

const logger = createLogger('NewMessageModal')

// Zod schema for search form validation
const searchSchema = z.object({
  searchTerm: z.string().max(100, 'Search term must be less than 100 characters').optional(),
})

type SearchForm = z.infer<typeof searchSchema>

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewMessageModal({ isOpen, onClose }: NewMessageModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [newMessageState, setNewMessageState] = useAtom(newMessageModalAtom)

  // React Hook Form setup
  const { control, watch, reset } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      searchTerm: '',
    },
  })

  const searchTerm = watch('searchTerm') || ''

  const fetchAvailableUsers = useCallback(async () => {
    if (!session?.user) {
      logger.debug('No session user available, skipping fetch')
      return
    }

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

      logger.info('Fetching available users:', { userRole: session.user.role, endpoint })

      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        const users = data.runners || data.coaches || []

        logger.info('Successfully fetched available users:', {
          userCount: users.length,
          userRole: session.user.role,
        })

        setNewMessageState(prev => ({
          ...prev,
          availableUsers: users,
          loading: false,
        }))
      } else {
        logger.error('Failed to fetch available users:', {
          status: response.status,
          statusText: response.statusText,
        })
        setNewMessageState(prev => ({ ...prev, loading: false }))
      }
    } catch (error) {
      logger.error('Error fetching available users:', error)
      setNewMessageState(prev => ({ ...prev, loading: false }))
    }
  }, [session?.user, setNewMessageState])

  useEffect(() => {
    if (isOpen && session?.user) {
      fetchAvailableUsers()
    }
  }, [isOpen, session?.user, fetchAvailableUsers])

  useEffect(() => {
    if (isOpen) {
      reset({ searchTerm: '' })
    }
  }, [isOpen, reset])

  const handleStartConversation = (userId: string) => {
    logger.info('Starting conversation:', { userId, userRole: session?.user?.role })
    onClose()
    router.push(`/chat/${userId}`)
  }

  const filteredUsers = newMessageState.availableUsers.filter(
    user =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>New Message</ModalHeader>
        <ModalBody>
          <Controller
            name="searchTerm"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                type="text"
                placeholder="Search by name or email..."
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
              />
            )}
          />
          <div className="max-h-64 overflow-y-auto mt-4">
            {newMessageState.loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm
                    ? 'No users found'
                    : `No ${session?.user?.role === 'coach' ? 'runners' : 'coaches'} found`}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {session?.user?.role === 'coach'
                    ? 'Create training plans to connect with runners'
                    : 'Ask your coach to create a training plan for you'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(user => (
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
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
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
