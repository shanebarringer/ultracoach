import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }
    
    // Use the same hashing method that Better Auth uses
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    
    return NextResponse.json({
      password,
      hashedPassword,
      method: 'bcrypt',
      saltRounds
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to hash password',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}