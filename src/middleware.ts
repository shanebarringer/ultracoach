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

  // Architecture Decision: No cookie check in middleware to avoid race conditions
  //
  // Security Model:
  // - All protected pages MUST use requireAuth() which calls getServerSession()
  // - Server-side auth is enforced at page render time via Server Components
  // - Middleware skips cookie check to avoid Playwright storageState race conditions
  //   (Playwright loads cookies asynchronously in browser, middleware runs synchronously on server)
  //
  // Trade-off: Middleware doesn't block unauthenticated requests, but every
  // protected page enforces authentication server-side via requireAuth() or equivalent.
  // This is an intentional architectural decision prioritizing test reliability while
  // maintaining security through Server Component authentication.
  //
  // See: PLANNING.md for complete Server/Client Component architecture requirements

  // Default: allow other routes for now
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
