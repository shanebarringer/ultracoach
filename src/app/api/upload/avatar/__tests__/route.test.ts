import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NextRequest } from 'next/server'

import { POST } from '../route'

// Mock dependencies
vi.mock('@/utils/auth-server')

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

  it.skip('should enforce rate limiting', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    const { RedisRateLimiter } = await import('@/lib/redis-rate-limiter')

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    } as unknown as Awaited<ReturnType<typeof getServerSession>>)

    // Mock rate limiter constructor to return a rate limiter that denies requests
    vi.mocked(RedisRateLimiter).mockImplementation(
      () =>
        ({
          check: vi.fn().mockResolvedValue({
            allowed: false,
            retryAfter: 3600,
            remaining: 0,
            limit: 10,
          }),
        }) as unknown as InstanceType<typeof RedisRateLimiter>
    )

    const formData = new FormData()
    const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
      method: 'POST',
      body: formData,
    })

    try {
      const response = await POST(request)
      const data = await response.json()

      if (response.status !== 429) {
        console.log('Response status:', response.status)
        console.log('Response data:', data)
      }

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many upload attempts')
      expect(data.retryAfter).toBe(3600)
    } catch (error) {
      console.error('Test execution error:', error)
      throw error
    }
  })

  it.skip('should reject files larger than 5MB', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    const { RedisRateLimiter } = await import('@/lib/redis-rate-limiter')

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    } as unknown as Awaited<ReturnType<typeof getServerSession>>)

    // Mock rate limiter to allow the request (so we can test file size validation)
    vi.mocked(RedisRateLimiter).mockImplementation(
      () =>
        ({
          check: vi.fn().mockResolvedValue({
            allowed: true,
            retryAfter: 0,
            remaining: 9,
            limit: 10,
          }),
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
