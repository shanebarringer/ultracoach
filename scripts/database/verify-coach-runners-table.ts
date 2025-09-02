/**
 * Simple script to verify the coach_runners table was created successfully
 */
import { db } from '../src/lib/database'
import { coach_runners } from '../src/lib/schema'

async function verifyTable() {
  try {
    console.log('🔍 Checking coach_runners table...')

    // Try to select from the table (should return empty result if table exists)
    const result = await db.select().from(coach_runners).limit(1)

    console.log('✅ coach_runners table exists and is accessible!')
    console.log(`📊 Found ${result.length} records in coach_runners table`)

    if (result.length > 0) {
      console.log('📝 Sample record:', result[0])
    }
  } catch (error) {
    console.error('❌ Error accessing coach_runners table:', error)
    process.exit(1)
  }
}

verifyTable().then(() => {
  console.log('🎉 Verification complete!')
  process.exit(0)
})
