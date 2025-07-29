import { auth } from '@/lib/better-auth'
import { toNextJsHandler } from 'better-auth/next-js'

// Use the proper Next.js handler as recommended by Better Auth docs
export const { GET, POST, PUT, DELETE, PATCH, OPTIONS } = toNextJsHandler(auth.handler)