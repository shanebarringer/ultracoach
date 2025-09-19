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
export function mockFetch(responses: Map<string, { ok: boolean; json: () => Promise<unknown> }>) {
  const fetchMock = vi.fn((url: string | Request | URL) => {
    const urlStr = typeof url === 'string' ? url : String(url)
    const response = responses.get(urlStr)

    if (!response) {
      return Promise.resolve(
        createMockFetchResponse({ error: 'Not found' }, { ok: false, status: 404 })
      )
    }

    // Return the response directly since it's already a mock fetch response
    return Promise.resolve(response)
  })

  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

/**
 * Mock session user type
 */
interface MockSessionUser {
  id: string
  email: string
  emailVerified: boolean
  name: string
  role: string
  userType: 'runner' | 'coach'
  createdAt: Date
  updatedAt: Date
}

/**
 * Mock session type
 */
interface MockSession {
  user: MockSessionUser
  session: {
    id: string
    expiresAt: Date
    token: string
  }
}

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides?: {
  user?: Partial<MockSessionUser>
  session?: Partial<{ id: string; expiresAt: Date; token: string }>
}): MockSession {
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
    },
    session: {
      id: 'session-id',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      token: 'test-token',
      ...overrides?.session,
    },
  }
}

/**
 * Mock workout type
 */
interface MockWorkout {
  id: string
  user_id: string
  training_plan_id: string | null
  date: string
  type: string
  planned_type: string
  name: string
  description: string
  distance: number
  duration: number
  intensity: number
  status: string
  created_at: string
  updated_at: string
}

/**
 * Create a mock workout for testing
 */
export function createMockWorkout(overrides?: Partial<MockWorkout>): MockWorkout {
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
  }
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
 * Mock authenticated session type for Better Auth
 */
interface MockAuthenticatedSession {
  data: {
    user: {
      id: string
      email: string
      userType: 'runner' | 'coach'
      role: string
    }
  }
}

/**
 * Create mock authenticated session for Better Auth
 */
export function createMockAuthenticatedSession(overrides?: {
  user?: Partial<{ id: string; email: string; userType: 'runner' | 'coach'; role: string }>
}): MockAuthenticatedSession {
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
 * Mock fetch response interface
 */
interface MockFetchResponse<T = unknown> {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<T>
  text: () => Promise<string>
}

/**
 * Create mock fetch response with proper typing
 */
export function createMockFetchResponse<T = unknown>(
  data: T,
  options: { ok?: boolean; status?: number; statusText?: string } = {}
): MockFetchResponse<T> {
  const { ok = true, status = 200, statusText = 'OK' } = options

  return {
    ok,
    status,
    statusText,
    json: async (): Promise<T> => data,
    text: async (): Promise<string> => JSON.stringify(data),
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
 * Mock get session function type
 */
type MockGetSession = { mockResolvedValue: (value: unknown) => void }

/**
 * Setup Better Auth mocks with authenticated session
 */
export function setupAuthenticatedMocks(
  mockGetSession: MockGetSession,
  userOverrides?: Partial<{ id: string; email: string; userType: 'runner' | 'coach'; role: string }>
): void {
  mockGetSession.mockResolvedValue(createMockAuthenticatedSession({ user: userOverrides }))
}

/**
 * Setup Better Auth mocks with unauthenticated session
 */
export function setupUnauthenticatedMocks(mockGetSession: MockGetSession): void {
  mockGetSession.mockResolvedValue(createMockUnauthenticatedSession())
}
