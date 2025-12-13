import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { certifications } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('CertificationsAPI')

/**
 * Certifications API - DELETE handler
 *
 * Deletes a certification owned by the authenticated user.
 * Verifies ownership before deletion to prevent unauthorized access.
 */

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Certification ID is required' }, { status: 400 })
    }

    // Verify ownership and delete in a single query
    try {
      const deletedCertifications = await db
        .delete(certifications)
        .where(and(eq(certifications.id, id), eq(certifications.user_id, session.user.id)))
        .returning()

      if (deletedCertifications.length === 0) {
        // Either the certification doesn't exist or the user doesn't own it
        logger.warn('Certification not found or not owned by user', {
          certificationId: id,
          userId: session.user.id,
        })
        return NextResponse.json(
          { error: 'Certification not found or not authorized to delete' },
          { status: 404 }
        )
      }

      logger.info('Certification deleted successfully', {
        userId: session.user.id,
        certificationId: id,
        name: deletedCertifications[0].name,
      })

      return NextResponse.json({ message: 'Certification deleted successfully' }, { status: 200 })
    } catch (error) {
      logger.error('Failed to delete certification:', error)

      // Enhanced error handling with type differentiation
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as { code: string; message?: string }

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
          error: 'Failed to delete certification',
          type: 'DATABASE_ERROR',
          message: 'An unexpected database error occurred',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/profile/certifications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
