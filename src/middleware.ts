import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Handle OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Allow public routes
  const publicRoutes = [
    '/auth/signin',
    '/auth/signup',
    '/api/auth',
    '/',
    '/about',
    '/contact',
    '/help',
    '/pricing',
    '/privacy',
    '/terms',
    '/coaches',
  ]

  const isPublicRoute = publicRoutes.some(
    route => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route)
  )

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Allow static files
  if (request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.includes('.')) {
    return NextResponse.next()
  }

  // For API routes (except auth), let the API routes handle their own authentication
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/workouts',
    '/calendar',
    '/training-plans',
    '/profile',
    '/chat',
    '/relationships',
    '/races',
    '/weekly-planner',
    '/settings',
  ]

  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute) {
    const sessionCookie = request.cookies.get('better-auth.session_token')

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    return NextResponse.next()
  }

  // Default: allow other routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Better Auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
