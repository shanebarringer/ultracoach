import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('auth-api')

async function handleAuthRequest(req: NextRequest, method: string) {
  try {
    logger.info(`Auth API ${method} request:`, {
      url: req.url,
      pathname: req.nextUrl.pathname,
      method: req.method,
      headers: {
        host: req.headers.get('host'),
        'user-agent': req.headers.get('user-agent')?.substring(0, 50),
        'content-type': req.headers.get('content-type'),
      }
    })

    const response = await auth.handler(req)
    
    logger.info(`Auth API ${method} response:`, {
      status: response.status,
      statusText: response.statusText,
    })
    
    return response
  } catch (error) {
    logger.error(`Auth API ${method} error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: req.url,
      method: req.method,
    })
    
    return NextResponse.json({
      error: 'Authentication service error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handleAuthRequest(req, 'GET')
}

export async function POST(req: NextRequest) {
  return handleAuthRequest(req, 'POST')
}

export async function PUT(req: NextRequest) {
  return handleAuthRequest(req, 'PUT')
}

export async function DELETE(req: NextRequest) {
  return handleAuthRequest(req, 'DELETE')
}

export async function PATCH(req: NextRequest) {
  return handleAuthRequest(req, 'PATCH')
}

export async function OPTIONS(req: NextRequest) {
  return handleAuthRequest(req, 'OPTIONS')
}
