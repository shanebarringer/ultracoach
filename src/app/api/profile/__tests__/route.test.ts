import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NextRequest } from 'next/server'

import { GET, PUT } from '../route'

// Mock dependencies
vi.mock('@/utils/auth-server')

describe('Profile API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should successfully fetch profile data for authenticated user', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    const { db } = await import('@/lib/db')

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        userType: 'coach',
      },
    } as unknown as Awaited<ReturnType<typeof getServerSession>>)

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          user_id: 'test-user-id',
          bio: 'Test bio',
          location: 'Boulder, CO',
        },
      ]),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile).toBeDefined()
    expect(data.profile.bio).toBe('Test bio')
  })
})

describe('Profile API - PUT', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ bio: 'Test bio' }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 for invalid JSON', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    } as unknown as Awaited<ReturnType<typeof getServerSession>>)

    const request = new NextRequest('http://localhost:3000/api/profile', {
      method: 'PUT',
      body: 'invalid json',
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON')
  })

  it('should validate bio max length', async () => {
    const { getServerSession } = await import('@/utils/auth-server')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    } as unknown as Awaited<ReturnType<typeof getServerSession>>)

    const longBio = 'A'.repeat(1500) // Exceeds 1000 char limit
    const request = new NextRequest('http://localhost:3000/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ bio: longBio }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input data')
  })
})
