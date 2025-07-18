import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Allow public routes
  const publicRoutes = ['/auth/signin', '/auth/signup', '/api/auth', '/']
  
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route)
  )
  
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Allow static files
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // For API routes (except auth), let the API routes handle their own authentication
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For dashboard routes, check for session cookie
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get('better-auth.session_token')
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
    
    return NextResponse.next()
  }

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
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
}