import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { createLogger } from '@/lib/logger'

const logger = createLogger('Middleware')

/**
 * Generate Content Security Policy with nonce-based script/style protection
 * This is the security-first approach recommended by Next.js for production applications
 */
function generateCSPHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'

  const cspDirectives = [
    "default-src 'self'",
    // script-src: Use nonce + strict-dynamic for optimal security
    // - 'nonce-{value}': Allow scripts with matching nonce
    // - 'strict-dynamic': Allow scripts loaded by nonce-approved scripts
    // - 'unsafe-inline': Fallback for Next.js router navigation (ignored by modern browsers with nonce)
    // - 'unsafe-eval': Only in development for HMR (Hot Module Replacement)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    // style-src: Allow inline styles for React inline style attributes
    // - 'unsafe-inline': Required for React inline styles (style={{...}})
    // - Google Fonts: Allow external stylesheet from fonts.googleapis.com
    // Note: 'unsafe-inline' is pragmatic for React apps as styles come from build process
    // React automatically escapes all user content, preventing style injection attacks
    // Main XSS protection comes from nonce-based script-src (above)
    `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'`,
    "img-src 'self' data: https://api.strava.com https://*.supabase.co blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    // connect-src: PostHog uses multiple subdomains (us.i.posthog.com, us-assets.i.posthog.com)
    // We need both https://*.posthog.com AND https://*.i.posthog.com to cover all PostHog domains
    "connect-src 'self' https://api.strava.com https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.i.posthog.com",
    "object-src 'none'",
    // frame-src: Allow Vercel Live collaboration iframe on preview deployments
    "frame-src 'self' https://vercel.live",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ]

  return cspDirectives.join('; ')
}

export async function middleware(request: NextRequest) {
  // Generate unique nonce for this request (cryptographically secure)
  // Using btoa() instead of Buffer for Edge runtime compatibility
  const nonce = btoa(crypto.randomUUID())

  // Build Content Security Policy with nonce
  const cspHeader = generateCSPHeader(nonce)

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

  const isPublicRoute = publicRoutes.some(route => {
    // Special case: only exact match for root path to prevent matching all routes
    if (route === '/') {
      return request.nextUrl.pathname === '/'
    }

    // For other routes: exact match OR prefix with trailing slash to prevent collisions
    // Example: '/about' matches '/about' and '/about/...' but NOT '/aboutus'
    return request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
  })

  // Create request headers with nonce for Next.js to use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  if (isPublicRoute) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set('Content-Security-Policy', cspHeader)
    return response
  }

  // Allow static files
  if (request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.includes('.')) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set('Content-Security-Policy', cspHeader)
    return response
  }

  // For API routes (except auth), let the API routes handle their own authentication
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set('Content-Security-Policy', cspHeader)
    return response
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
    // Check for session cookie - handle both secure (production) and non-secure (dev) names
    // When useSecureCookies is true in Better Auth config, cookies are prefixed with __Secure-
    const sessionCookie =
      request.cookies.get('__Secure-better-auth.session_token') || // Production (secure cookies)
      request.cookies.get('better-auth.session_token') // Development

    // Debug logging for CI to diagnose session issues
    if (process.env.CI) {
      const allCookies = request.cookies.getAll()
      const cookieHeaderValue = request.headers.get('cookie')
      logger.debug('CI session debug', {
        path: request.nextUrl.pathname,
        hasSessionCookie: !!sessionCookie,
        cookieValue:
          sessionCookie?.value && sessionCookie.value.length > 20
            ? sessionCookie.value.substring(0, 20) + '...'
            : sessionCookie?.value,
        totalCookies: allCookies.length,
        cookieNames: allCookies.map(c => c.name),
        headers: {
          cookie:
            cookieHeaderValue && cookieHeaderValue.length > 100
              ? cookieHeaderValue.substring(0, 100) + '...'
              : cookieHeaderValue,
          userAgent: request.headers.get('user-agent'),
        },
      })
    }

    if (!sessionCookie) {
      logger.warn('No session cookie found, redirecting to signin', {
        path: request.nextUrl.pathname,
        hasAnyCookies: request.cookies.getAll().length > 0,
      })
      const response = NextResponse.redirect(new URL('/auth/signin', request.url))
      response.headers.set('Content-Security-Policy', cspHeader)
      return response
    }

    // Validate session token format (basic sanity check)
    if (!sessionCookie.value || sessionCookie.value.length < 12) {
      logger.warn('Invalid session token format', {
        path: request.nextUrl.pathname,
        tokenLength: sessionCookie.value?.length || 0,
      })
      const response = NextResponse.redirect(new URL('/auth/signin', request.url))
      response.headers.set('Content-Security-Policy', cspHeader)
      return response
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set('Content-Security-Policy', cspHeader)
    return response
  }

  // Default: allow other routes
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', cspHeader)
  return response
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
