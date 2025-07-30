import { toNextJsHandler } from 'better-auth/next-js'

import { auth } from '@/lib/better-auth'

// Use the proper Next.js handler as recommended by Better Auth docs
// toNextJsHandler only returns GET and POST methods
export const { GET, POST } = toNextJsHandler(auth.handler)
