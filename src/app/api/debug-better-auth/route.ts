import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('debug-better-auth')

export async function GET(request: NextRequest) {
  try {
    logger.info('Testing Better Auth initialization...')

    // Test 1: Check if auth object exists
    if (!auth) {
      return NextResponse.json({ error: 'Better Auth not initialized' }, { status: 500 })
    }

    logger.info('✅ Better Auth object exists')

    // Test 2: Check if handler exists
    if (!auth.handler) {
      return NextResponse.json({ error: 'Better Auth handler not found' }, { status: 500 })
    }

    logger.info('✅ Better Auth handler exists')

    // Test 3: Try to get session (should not throw)
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      })
      logger.info('✅ Session API call successful:', { hasSession: !!session })
    } catch (sessionError) {
      logger.error('❌ Session API failed:', sessionError)
      return NextResponse.json(
        {
          error: 'Session API failed',
          details: sessionError instanceof Error ? sessionError.message : String(sessionError),
        },
        { status: 500 }
      )
    }

    // Test 4: Try to list available endpoints
    try {
      // Check if auth has internal methods we can inspect
      const authInfo = {
        hasApi: !!auth.api,
        hasHandler: !!auth.handler,
        // Add any other properties we can safely check
      }

      logger.info('✅ Better Auth structure check passed:', authInfo)

      return NextResponse.json({
        success: true,
        message: 'Better Auth is working correctly',
        info: authInfo,
      })
    } catch (inspectionError) {
      logger.error('❌ Better Auth inspection failed:', inspectionError)
      return NextResponse.json(
        {
          error: 'Better Auth inspection failed',
          details:
            inspectionError instanceof Error ? inspectionError.message : String(inspectionError),
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('❌ Better Auth debug failed:', error)

    // Try to extract useful error information
    const errorInfo = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
    }

    return NextResponse.json(
      {
        error: 'Better Auth debug failed',
        errorInfo,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info('Testing Better Auth signup with test data:', {
      email: body.email,
      hasPassword: !!body.password,
      hasName: !!body.name,
    })

    // Try to call signup API directly
    const result = await auth.api.signUpEmail({
      body: {
        email: body.email,
        password: body.password,
        name: body.name,
        userType: body.userType || 'runner',
      },
    })

    logger.info('✅ Signup successful:', { hasUser: !!result.user })

    return NextResponse.json({
      success: true,
      message: 'Signup test successful',
      userId: result.user?.id,
    })
  } catch (error) {
    logger.error('❌ Signup test failed:', error)

    const errorInfo = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
    }

    return NextResponse.json(
      {
        error: 'Signup test failed',
        errorInfo,
      },
      { status: 500 }
    )
  }
}
