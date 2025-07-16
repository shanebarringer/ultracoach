import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/better-auth"

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

  // For API routes (except auth), validate session
  if (request.nextUrl.pathname.startsWith('/api/')) {
    try {
      const session = await auth.api.getSession({
        headers: request.headers
      })
      
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      return NextResponse.next()
    } catch (error) {
      console.error('Middleware session validation error:', error)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
  }

  // For dashboard routes, validate session and redirect if needed
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    try {
      const session = await auth.api.getSession({
        headers: request.headers
      })
      
      if (!session) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
      
      return NextResponse.next()
    } catch (error) {
      console.error('Middleware session validation error:', error)
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
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