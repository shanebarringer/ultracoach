import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { supabaseAdmin } from './supabase'
import bcrypt from 'bcrypt'

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
          console.log('🔐 Starting authentication for:', credentials?.email)
          
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Missing credentials')
            return null
          }

          // Check if user exists in Supabase
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single()

          if (error) {
            console.log('❌ Database error:', error)
            return null
          }

          if (!user) {
            console.log('❌ User not found')
            return null
          }

          console.log('✅ User found:', { id: user.id, email: user.email })

          // Check password hash
          const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash || '')
          console.log('🔑 Password validation:', { 
            isValidPassword, 
            hasHash: !!user.password_hash,
            hashPreview: user.password_hash?.substring(0, 10) + '...'
          })

          if (!isValidPassword) {
            console.log('❌ Invalid password')
            return null
          }

          console.log('✅ Authentication successful')
          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role
          }
        } catch (error) {
          console.error('💥 Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET
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