// AtomFamily patterns for efficient dynamic atoms
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'

import type { Workout, TrainingPlan } from '@/lib/supabase'

// Workout atom family - creates individual atoms per workout ID
export const workoutAtomFamily = atomFamily(
  (_workoutId: string) => atom<Workout | null>(null)
)

// Training plan atom family
export const trainingPlanAtomFamily = atomFamily(
  (_planId: string) => atom<TrainingPlan | null>(null)
)

// Conversation message count family
export const conversationMessageCountFamily = atomFamily(
  (_conversationId: string) => atom(0)
)

// Form field atom family for granular form updates
export const formFieldAtomFamily = atomFamily(
  ({ formId: _formId, fieldName: _fieldName }: { formId: string; fieldName: string }) => atom('')
)

// Loading state family for async operations
export const loadingStateFamily = atomFamily(
  (_operationId: string) => atom(false)
)

// Error state family for async operations
export const errorStateFamily = atomFamily(
  (_operationId: string) => atom<string | null>(null)
)

// Messages by conversation family for async loading
export const messagesByConversationLoadableFamily = atomFamily((conversationId: string) => 
  atom(async () => {
    // Fetch messages for specific conversation
    const response = await fetch(`/api/messages/conversation/${conversationId}`)
    if (!response.ok) return []
    return response.json()
  })
)