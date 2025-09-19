/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test Helpers for Jotai Atoms Testing
 *
 * Provides utilities for testing Jotai atoms in isolation
 * with proper mocking and store management.
 */
import { createStore } from 'jotai'
import type { WritableAtom } from 'jotai'
import { vi } from 'vitest'

/**
 * Creates a test store with initial atom values
 */
export function createTestStore(initialValues?: Map<WritableAtom<unknown, any, any>, unknown>) {
  const store = createStore()

  if (initialValues) {
    initialValues.forEach((value, atom) => {
      store.set(atom, value)
    })
  }

  return store
}

/**
 * Helper to get atom value from store
 */
export function getAtomValue<T>(
  store: ReturnType<typeof createStore>,
  atom: WritableAtom<T, any, any> | any
): T {
  return store.get(atom)
}

/**
 * Helper to set atom value in store
 */
export function setAtomValue<T>(
  store: ReturnType<typeof createStore>,
  atom: WritableAtom<T, any, any>,
  value: T
): void {
  store.set(atom, value)
}

/**
 * Wait for async atom to resolve
 */
export async function waitForAtom<T>(
  store: ReturnType<typeof createStore>,
  atom: WritableAtom<Promise<T>, any, any>
): Promise<T> {
  return store.get(atom)
}

/**
 * Mock fetch for API calls
 */
export function mockFetch(responses: Map<string, { ok: boolean; json: () => Promise<any> }>) {
  const fetchMock = vi.fn((url: string | Request | URL) => {
    const urlStr = typeof url === 'string' ? url : String(url)
    const response = responses.get(urlStr)

    if (!response) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      })
    }

    return Promise.resolve(response)
  })

  global.fetch = fetchMock as any
  return fetchMock
}

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides?: Partial<any>) {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      emailVerified: false,
      name: 'Test User',
      role: 'user',
      userType: 'runner' as 'runner' | 'coach',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides?.user,
    } as any, // Type assertion for test flexibility
    session: {
      id: 'session-id',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      token: 'test-token',
      ...overrides?.session,
    },
  }
}

/**
 * Create a mock workout for testing
 */
export function createMockWorkout(overrides?: Partial<any>) {
  return {
    id: 'workout-1',
    user_id: 'test-user-id',
    training_plan_id: null,
    date: new Date().toISOString(),
    type: 'long_run',
    planned_type: 'long_run',
    name: 'Test Long Run',
    description: 'Test workout description',
    distance: 20,
    duration: 180,
    intensity: 5,
    status: 'planned',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as any
}

/**
 * Create a mock training plan for testing
 */
export function createMockTrainingPlan(overrides?: Partial<any>) {
  return {
    id: 'plan-1',
    coach_id: 'coach-id',
    runner_id: 'runner-id',
    name: 'Test Training Plan',
    description: 'Test plan description',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    status: 'active',
    race_id: 'race-1',
    goal_type: 'completion',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock message for testing
 */
export function createMockMessage(overrides?: Partial<any>) {
  return {
    id: 'message-1',
    conversation_id: 'conv-1',
    sender_id: 'sender-id',
    recipient_id: 'recipient-id',
    content: 'Test message content',
    created_at: new Date().toISOString(),
    read: false,
    ...overrides,
  }
}

/**
 * Create a mock conversation for testing
 */
export function createMockConversation(overrides?: Partial<any>) {
  return {
    id: 'conv-1',
    participant1_id: 'user-1',
    participant2_id: 'user-2',
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock relationship for testing
 */
export function createMockRelationship(overrides?: Partial<any>) {
  return {
    id: 'rel-1',
    coach_id: 'coach-id',
    runner_id: 'runner-id',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock race for testing
 */
export function createMockRace(overrides?: Partial<any>) {
  return {
    id: 'race-1',
    name: 'Test Ultra Marathon',
    date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days
    distance: 50,
    distance_unit: 'miles',
    location: 'Test Location',
    terrain: 'trail',
    elevation_gain: 8000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Setup common mocks for testing
 */
export function setupCommonMocks() {
  // Mock logger
  vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    }),
  }))

  // Mock date functions for consistent testing
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-01-01'))

  return {
    cleanup: () => {
      vi.clearAllMocks()
      vi.useRealTimers()
    },
  }
}

/**
 * Helper to test async atom loading states
 */
export async function testAsyncAtomStates<T>(
  store: ReturnType<typeof createStore>,
  atom: WritableAtom<Promise<T>, any, any>,
  _expectedValue: T
) {
  // Initial state should be pending
  let resolved = false
  let value: T | undefined
  let error: Error | undefined

  store
    .get(atom)
    .then(v => {
      resolved = true
      value = v
    })
    .catch(e => {
      resolved = true
      error = e
    })

  // Wait for resolution
  await vi.waitFor(() => resolved)

  return { value, error }
}

/**
 * Helper to test atom subscriptions
 */
export function subscribeToAtom<T>(
  store: ReturnType<typeof createStore>,
  atom: WritableAtom<T, any, any>
): { values: T[]; unsubscribe: () => void } {
  const values: T[] = []

  const unsubscribe = store.sub(atom, () => {
    values.push(store.get(atom))
  })

  // Get initial value
  values.push(store.get(atom))

  return { values, unsubscribe }
}

/**
 * Create mock authenticated session for Better Auth
 */
export function createMockAuthenticatedSession(overrides?: Partial<any>) {
  return {
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        userType: 'runner',
        role: 'user',
        ...overrides?.user,
      },
    },
  }
}

/**
 * Create mock unauthenticated session for Better Auth
 */
export function createMockUnauthenticatedSession() {
  return {
    data: null,
  }
}

/**
 * Create mock fetch response
 */
export function createMockFetchResponse(
  data: any,
  options: { ok?: boolean; status?: number; statusText?: string } = {}
) {
  const { ok = true, status = 200, statusText = 'OK' } = options

  return {
    ok,
    status,
    statusText,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }
}

/**
 * Create mock fetch error response
 */
export function createMockFetchError(status: number, statusText: string, errorText?: string) {
  return {
    ok: false,
    status,
    statusText,
    text: async () => errorText || statusText,
  }
}

/**
 * Setup Better Auth mocks with authenticated session
 */
export function setupAuthenticatedMocks(mockGetSession: any, userOverrides?: Partial<any>) {
  mockGetSession.mockResolvedValue(createMockAuthenticatedSession({ user: userOverrides }))
}

/**
 * Setup Better Auth mocks with unauthenticated session
 */
export function setupUnauthenticatedMocks(mockGetSession: any) {
  mockGetSession.mockResolvedValue(createMockUnauthenticatedSession())
}
