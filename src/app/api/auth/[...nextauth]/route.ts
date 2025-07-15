import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Create handler with explicit export pattern for Next.js 15
const handler = NextAuth(authOptions)

export const GET = handler
export const POST = handler
