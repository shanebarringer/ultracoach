import { NextRequest, NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'

const logger = createLogger('auth-test')

export async function GET() {
  try {
    logger.info('Testing Better Auth import and initialization...')

    // Test 1: Try importing Better Auth
    let authImportResult
    try {
      const authModule = await import('@/lib/better-auth')
      authImportResult = {
        success: true,
        hasAuth: !!authModule.auth,
        authType: typeof authModule.auth,
      }
      logger.info('Better Auth import successful', authImportResult)
    } catch (importError) {
      authImportResult = {
        success: false,
        error: importError instanceof Error ? importError.message : 'Unknown import error',
      }
      logger.error('Better Auth import failed', authImportResult)
    }

    // Test 2: Try creating a handler
    let handlerResult
    try {
      const { toNextJsHandler } = await import('better-auth/next-js')
      const { auth } = await import('@/lib/better-auth')

      const handler = toNextJsHandler(auth.handler)
      handlerResult = {
        success: true,
        hasHandler: !!handler,
        hasGet: !!handler.GET,
        hasPost: !!handler.POST,
      }
      logger.info('Better Auth handler creation successful', handlerResult)
    } catch (handlerError) {
      handlerResult = {
        success: false,
        error: handlerError instanceof Error ? handlerError.message : 'Unknown handler error',
      }
      logger.error('Better Auth handler creation failed', handlerResult)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tests: {
        import: authImportResult,
        handler: handlerResult,
      },
    })
  } catch (error) {
    logger.error('Auth test endpoint failed', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Testing Better Auth signin handler...')

    const body = await request.json()
    logger.info('Received signin request', { email: body.email })

    // Try to use Better Auth handler directly
    const { toNextJsHandler } = await import('better-auth/next-js')
    const { auth } = await import('@/lib/better-auth')

    const handler = toNextJsHandler(auth.handler)

    if (!handler.POST) {
      throw new Error('Better Auth POST handler not available')
    }

    // Create a mock request for the signin endpoint
    const url = new URL('/api/auth/sign-in/email', request.url)
    const mockRequest = new NextRequest(url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    })

    logger.info('Calling Better Auth handler...')
    const response = await handler.POST(mockRequest)

    const responseText = await response.text()
    logger.info('Better Auth handler response', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    })

    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } catch (error) {
    logger.error('Auth test POST failed', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
