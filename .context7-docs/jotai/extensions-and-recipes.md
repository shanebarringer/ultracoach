# Jotai Extensions & Recipes for UltraCoach

## 🔥 Key Extensions for Our Use Case

### 1. **jotai-effect** - Side Effects Management
Perfect for our real-time features and API sync:

```typescript
import { atomEffect } from 'jotai-effect'

// Auto-sync with server when workouts change
const workoutSyncEffect = atomEffect((get, set) => {
  const workouts = get(workoutsAtom)
  const session = get(sessionAtom)
  
  if (session?.user?.id) {
    // Sync to server
    fetch('/api/workouts/sync', {
      method: 'POST',
      body: JSON.stringify(workouts)
    })
  }
  
  // Cleanup function
  return () => {
    // Clear any intervals, websockets, etc.
  }
})
```

### 2. **jotai-location** - URL State Management
Great for deep linking calendar dates, workout filters:

```typescript
import { atomWithHash } from 'jotai-location'

// URL: #date=2024-03-15&filter=planned
const calendarDateAtom = atomWithHash('date', '2024-01-01')
const workoutFilterAtom = atomWithHash('filter', 'all')

// Auto-syncs with browser URL
```

### 3. **loadable()** Utility - Better Async UX
No more Suspense boundaries needed:

```typescript
import { loadable } from 'jotai/utils'

const workoutsLoadableAtom = loadable(refreshableWorkoutsAtom)

const WorkoutsComponent = () => {
  const [workoutsState] = useAtom(workoutsLoadableAtom)
  
  switch (workoutsState.state) {
    case 'loading': return <Spinner />
    case 'hasError': return <ErrorBoundary error={workoutsState.error} />
    case 'hasData': return <WorkoutsList data={workoutsState.data} />
  }
}
```

### 4. **splitAtom** - Performance for Large Lists
Essential for chat messages, workout lists:

```typescript
import { splitAtom } from 'jotai/utils'

const messagesAtomsAtom = splitAtom(messagesAtom)

// Each message gets its own atom - only re-renders what changed
const MessagesList = () => {
  const [messageAtoms] = useAtom(messagesAtomsAtom)
  return (
    <div>
      {messageAtoms.map((messageAtom) => (
        <Message key={`${messageAtom}`} messageAtom={messageAtom} />
      ))}
    </div>
  )
}
```

### 5. **atomFamily** - Dynamic Atom Creation
Perfect for our chat system:

```typescript
import { atomFamily } from 'jotai/utils'

const conversationFamily = atomFamily((conversationId: string) =>
  atomWithRefresh(async () => {
    const response = await fetch(`/api/conversations/${conversationId}/messages`)
    return response.json()
  })
)

// Usage: automatic caching per conversation
const chat1Atom = conversationFamily('user-123')
const chat2Atom = conversationFamily('user-456')
```

## 🎯 Advanced Patterns for UltraCoach

### 1. **Real-time Sync with Effects**
```typescript
// Auto-sync typing status
const typingStatusEffect = atomEffect((get, set) => {
  const currentConversation = get(currentConversationIdAtom)
  const isTyping = get(isTypingAtom)
  
  if (currentConversation && isTyping) {
    const interval = setInterval(() => {
      fetch('/api/typing', {
        method: 'POST',
        body: JSON.stringify({ conversationId: currentConversation, isTyping })
      })
    }, 3000)
    
    return () => clearInterval(interval)
  }
})
```

### 2. **URL State for Deep Linking**
```typescript
// Deep linkable calendar state
const selectedDateAtom = atomWithHash('date', new Date().toISOString().split('T')[0])
const workoutFilterAtom = atomWithHash('filter', 'all')
const selectedWorkoutAtom = atomWithHash('workout', null)

// URL: /calendar#date=2024-03-15&filter=planned&workout=123
```

### 3. **Component Granularity for Performance**
```typescript
// Instead of:
const WorkoutCard = ({ workout }) => {
  const [name] = useAtom(workout.nameAtom)
  const [status] = useAtom(workout.statusAtom)
  const [notes] = useAtom(workout.notesAtom)
  // All re-render when any field changes
}

// Do this:
const WorkoutName = ({ nameAtom }) => {
  const [name] = useAtom(nameAtom)
  return <h3>{name}</h3>
}

const WorkoutStatus = ({ statusAtom }) => {
  const [status] = useAtom(statusAtom) 
  return <Badge>{status}</Badge>
}

const WorkoutCard = ({ workout }) => {
  return (
    <Card>
      <WorkoutName nameAtom={workout.nameAtom} />
      <WorkoutStatus statusAtom={workout.statusAtom} />
      {/* Only relevant components re-render */}
    </Card>
  )
}
```

### 4. **Action Atoms for Cleaner APIs**
```typescript
// Write-only atoms for actions
const sendMessageAtom = atom(null, async (get, set, { recipientId, content }) => {
  const session = get(sessionAtom)
  const optimisticMessage = createOptimisticMessage(session.user, content)
  
  // Add optimistic message
  set(messagesAtom, prev => [...prev, optimisticMessage])
  
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, content })
    })
    
    const realMessage = await response.json()
    
    // Replace optimistic with real message
    set(messagesAtom, prev => 
      prev.map(msg => msg.id === optimisticMessage.id ? realMessage : msg)
    )
  } catch (error) {
    // Remove optimistic message on error
    set(messagesAtom, prev => 
      prev.filter(msg => msg.id !== optimisticMessage.id)
    )
    throw error
  }
})

// Clean usage in components
const [, sendMessage] = useAtom(sendMessageAtom)
```

### 5. **Custom Hook Patterns**
```typescript
// useSelectAtom for computed values
export function useSelectAtom(anAtom, selector) {
  const selectorAtom = selectAtom(anAtom, selector)
  return useAtomValue(selectorAtom)
}

// Usage
const completedWorkoutsCount = useSelectAtom(
  workoutsAtom, 
  useCallback(workouts => workouts.filter(w => w.status === 'completed').length, [])
)

// useReducerAtom for complex state transitions
export function useReducerAtom(anAtom, reducer) {
  const [state, setState] = useAtom(anAtom)
  const dispatch = useCallback(
    (action) => setState(prev => reducer(prev, action)),
    [setState, reducer]
  )
  return [state, dispatch]
}
```

## 🚀 Implementation Priority for UltraCoach

### **Immediate (Phase 1)**:
1. **loadable()** - Better loading states without Suspense
2. **splitAtom** - Performance for message/workout lists  
3. **atomFamily** - Dynamic conversation atoms

### **Short-term (Phase 2)**:
4. **atomEffect** - Real-time sync effects
5. **Component granularity** - Performance optimization
6. **Action atoms** - Cleaner API patterns

### **Medium-term (Phase 3)**:
7. **jotai-location** - Deep linking for calendar/workouts
8. **Custom hooks** - Better DX and reusability
9. **Advanced debugging** - DevTools integration

This will transform our state management from good to exceptional! 🔥