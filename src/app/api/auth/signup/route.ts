import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcrypt'
import { Logger } from 'tslog'

const logger = new Logger({ name: 'auth-signup-api' })

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role } = await request.json()
    // Validate input
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    if (!['runner', 'coach'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)
    // Create user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          email,
          password_hash: hashedPassword,
          full_name: fullName,
          role,
        },
      ])
      .select()
      .single()
    if (error) {
      logger.error('Failed to create user')
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    )
  } catch {
    logger.error('API error in POST /auth/signup')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}