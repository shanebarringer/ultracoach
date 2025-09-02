// Chat and messaging types
import type { ConversationWithUser, MessageWithUser } from '@/lib/supabase'

export type Conversation = ConversationWithUser

export interface OptimisticMessage extends MessageWithUser {
  optimistic?: boolean
  tempId?: string
  error?: boolean
}