// Using built-in fetch (Node 18+ required)

const testUsers = [
  {
    email: 'testrunner@ultracoach.dev',
    password: 'password123',
    fullName: 'Test Runner',
    role: 'runner',
  },
  {
    email: 'testcoach@ultracoach.dev',
    password: 'password123',
    fullName: 'Test Coach',
    role: 'coach',
  },
]

async function createTestUsers() {
  console.log('🔧 Creating fresh test users for Playwright...')

  // Wait for server to be ready
  console.log('⏱️  Waiting for server to be ready...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  for (const user of testUsers) {
    try {
      console.log(`\n👤 Creating user: ${user.email}`)

      const response = await fetch('http://localhost:3001/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          name: user.fullName,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ User ${user.email} created successfully`)

        // If this is a coach, we need to update their role
        if (user.role === 'coach') {
          // First, sign in to get a session
          const signInResponse = await fetch('http://localhost:3001/api/auth/sign-in/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              password: user.password,
            }),
          })

          if (signInResponse.ok) {
            const signInData = await signInResponse.json()
            const sessionCookie = signInResponse.headers.get('set-cookie')

            // Update role
            const roleResponse = await fetch('http://localhost:3001/api/user/role', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: sessionCookie || '',
              },
              body: JSON.stringify({ role: 'coach' }),
            })

            if (roleResponse.ok) {
              console.log(`✅ User ${user.email} role updated to coach`)
            } else {
              console.log(
                `⚠️  Failed to update role for ${user.email}: ${await roleResponse.text()}`
              )
            }
          }
        }
      } else {
        const errorText = await response.text()
        console.log(`❌ Failed to create user ${user.email}: ${errorText}`)
      }
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error.message)
    }
  }

  console.log('\n🎉 Test user setup completed!')
  console.log('📋 Test credentials:')
  testUsers.forEach(user => {
    console.log(`   ${user.email} / password123 (${user.role})`)
  })
}

createTestUsers().catch(console.error)
