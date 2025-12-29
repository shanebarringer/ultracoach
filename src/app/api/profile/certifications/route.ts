import { z } from 'zod'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { certifications } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('CertificationsAPI')

/**
 * Certifications API - POST handler
 *
 * Creates a new certification for the authenticated user.
 * Validates input using Zod schema and inserts into the certifications table.
 */

const certificationCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  issuing_organization: z.string().min(1, 'Issuing organization is required').max(200),
  credential_id: z.string().max(100).optional(),
  issue_date: z.string().optional(),
  expiration_date: z.string().optional(),
  verification_url: z.string().url('Invalid URL format').optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Validate input data
    let validatedData
    try {
      validatedData = certificationCreateSchema.parse(body)
    } catch (error) {
      logger.warn('Certification validation failed:', error)
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: error instanceof z.ZodError ? error.issues : 'Validation failed',
        },
        { status: 400 }
      )
    }

    const {
      name,
      issuing_organization,
      credential_id,
      issue_date,
      expiration_date,
      verification_url,
    } = validatedData

    // Prepare insert data
    const insertData = {
      user_id: session.user.id,
      name,
      issuing_organization,
      credential_id: credential_id || null,
      issue_date: issue_date ? new Date(issue_date) : null,
      expiration_date: expiration_date ? new Date(expiration_date) : null,
      verification_url: verification_url || null,
      status: 'active' as const,
      is_featured: false,
    }

    try {
      const [newCertification] = await db.insert(certifications).values(insertData).returning()

      logger.info('Certification created successfully', {
        userId: session.user.id,
        certificationId: newCertification.id,
        name,
      })

      return NextResponse.json(newCertification, { status: 201 })
    } catch (error) {
      logger.error('Failed to create certification:', error)

      // Enhanced error handling with type differentiation
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as { code: string; message?: string }

        // PostgreSQL constraint violation
        if (dbError.code === '23505' || dbError.code === 'P2002') {
          return NextResponse.json(
            {
              error: 'Duplicate entry',
              type: 'CONSTRAINT_VIOLATION',
              message: 'A certification with this data already exists',
            },
            { status: 409 }
          )
        }

        // Foreign key violation
        if (dbError.code === '23503' || dbError.code === 'P2003') {
          return NextResponse.json(
            {
              error: 'Invalid reference',
              type: 'FOREIGN_KEY_VIOLATION',
              message: 'Referenced user does not exist',
            },
            { status: 400 }
          )
        }

        // Connection errors
        if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT') {
          return NextResponse.json(
            {
              error: 'Database unavailable',
              type: 'CONNECTION_ERROR',
              message: 'Unable to connect to database',
            },
            { status: 503 }
          )
        }
      }

      // Generic database error
      return NextResponse.json(
        {
          error: 'Failed to create certification',
          type: 'DATABASE_ERROR',
          message: 'An unexpected database error occurred',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Unexpected error in POST /api/profile/certifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
