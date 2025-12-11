import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NextRequest } from 'next/server'

import { POST } from '../route'

// Mock dependencies
vi.mock('@/lib/db')
vi.mock('@/utils/auth-server')
vi.mock('@/lib/logger')
vi.mock('@/lib/supabase-admin')
vi.mock('@/lib/redis-rate-limiter')

describe('Avatar Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const formData = new FormData()
    const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should enforce rate limiting', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    const { RedisRateLimiter } = await import('@/lib/redis-rate-limiter')

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    } as unknown as Awaited<ReturnType<typeof getServerSession>>)

    // Mock rate limiter to deny request
    const mockCheck = vi.fn().mockResolvedValue({
      allowed: false,
      retryAfter: 3600, // 1 hour in seconds
      remaining: 0,
      limit: 10,
    })
    vi.mocked(RedisRateLimiter).mockImplementation(
      () =>
        ({
          check: mockCheck,
        }) as unknown as InstanceType<typeof RedisRateLimiter>
    )

    const formData = new FormData()
    const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toBe('Too many upload attempts')
    expect(data.retryAfter).toBe(3600)
  })

  it('should reject files larger than 5MB', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    const { RedisRateLimiter } = await import('@/lib/redis-rate-limiter')

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    } as unknown as Awaited<ReturnType<typeof getServerSession>>)

    vi.mocked(RedisRateLimiter).mockImplementation(
      () =>
        ({
          check: vi.fn().mockResolvedValue({ allowed: true }),
        }) as unknown as InstanceType<typeof RedisRateLimiter>
    )

    // Create file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    const formData = new FormData()
    formData.append('avatar', largeFile)

    const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/file size|5MB/i)
  })
})
