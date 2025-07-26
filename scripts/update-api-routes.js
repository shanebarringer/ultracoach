const fs = require('fs')
const path = require('path')

// List of files to update
const filesToUpdate = [
  'src/app/api/workouts/bulk/route.ts',
  'src/app/api/users/[id]/route.ts',
  'src/app/api/workouts/route.ts',
  'src/app/api/workouts/[id]/route.ts',
  'src/app/api/messages/route.ts',
  'src/app/api/conversations/route.ts',
  'src/app/api/training-plans/[id]/archive/route.ts',
]

function updateApiRoutes() {
  console.log('🔄 Updating API routes to use better_auth_users...\n')

  let totalUpdates = 0

  filesToUpdate.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath)

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`)
      return
    }

    try {
      let content = fs.readFileSync(fullPath, 'utf8')
      const originalContent = content

      // Replace .from('users') with .from('better_auth_users')
      content = content.replace(/\.from\('users'\)/g, ".from('better_auth_users')")

      // Count changes
      const changes = (originalContent.match(/\.from\('users'\)/g) || []).length

      if (changes > 0) {
        fs.writeFileSync(fullPath, content)
        console.log(`✅ Updated ${filePath}: ${changes} changes`)
        totalUpdates += changes
      } else {
        console.log(`ℹ️  No changes needed: ${filePath}`)
      }
    } catch (error) {
      console.error(`❌ Error updating ${filePath}:`, error.message)
    }
  })

  console.log(
    `\n📊 Total updates: ${totalUpdates} references changed from 'users' to 'better_auth_users'`
  )
}

if (require.main === module) {
  updateApiRoutes()
}

module.exports = { updateApiRoutes }
