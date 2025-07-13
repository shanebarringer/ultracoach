import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { supabaseAdmin } from './supabase'
import bcrypt from 'bcrypt'
import { Logger } from 'tslog'

const logger = new Logger({ name: 'auth' })

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }
          // Check if user exists in Supabase
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single()
          if (error) {
            return null
          }
          if (!user) {
            return null
          }
          // Check password hash
          const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash || '')
          if (!isValidPassword) {
            return null
          }
          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role
          }
        } catch (err) {
          logger.error('Auth error', { error: err instanceof Error ? err.message : err })
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist user data in JWT
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as 'runner' | 'coach'
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  },
  session: {
    strategy: 'jwt',
    maxAge: 14 * 24 * 60 * 60, // 14 days (industry standard)
    updateAge: 5 * 60, // 5 minutes - frequent refresh for fresh user data
  },
  jwt: {
    maxAge: 14 * 24 * 60 * 60, // 14 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production'
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'runner' | 'coach'
    }
  }

  interface User {
    role: 'runner' | 'coach'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'runner' | 'coach'
  }
}