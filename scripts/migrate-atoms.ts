#!/usr/bin/env node
/**
 * Script to migrate from monolithic atoms.ts to modular atom structure
 * This script will:
 * 1. Back up the original atoms.ts file
 * 2. Update all imports to use the new modular structure
 * 3. Remove the old atoms.ts file
 */
import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const copyFile = promisify(fs.copyFile)

const ATOMS_FILE = path.join(process.cwd(), 'src/lib/atoms.ts')
const ATOMS_BACKUP = path.join(process.cwd(), 'src/lib/atoms.ts.backup')
const ATOMS_INDEX = path.join(process.cwd(), 'src/lib/atoms/index.ts')

async function main() {
  console.log('🚀 Starting atoms migration...')

  // Step 1: Create backup
  if (fs.existsSync(ATOMS_FILE)) {
    console.log('📦 Creating backup of atoms.ts...')
    await copyFile(ATOMS_FILE, ATOMS_BACKUP)
    console.log('✅ Backup created at atoms.ts.backup')
  }

  // Step 2: Check if new structure exists
  if (!fs.existsSync(ATOMS_INDEX)) {
    console.error('❌ New atoms structure not found. Please create src/lib/atoms/index.ts first')
    process.exit(1)
  }

  // Step 3: Find all files importing from @/lib/atoms
  console.log('🔍 Finding files that import from @/lib/atoms...')
  const { stdout } = await execAsync(
    `grep -r "from '@/lib/atoms'" src --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u`
  )

  const files = stdout.trim().split('\n').filter(Boolean)
  console.log(`📄 Found ${files.length} files to update`)

  // Step 4: Update imports in each file
  for (const file of files) {
    if (file.includes('atoms/')) continue // Skip files in the new atoms directory

    console.log(`  Updating ${file}...`)
    const content = await readFile(file, 'utf-8')

    // Replace import from '@/lib/atoms' with '@/lib/atoms/index'
    const updatedContent = content.replace(
      /from\s+['"]@\/lib\/atoms['"]/g,
      "from '@/lib/atoms/index'"
    )

    if (content !== updatedContent) {
      await writeFile(file, updatedContent)
      console.log(`  ✅ Updated ${file}`)
    }
  }

  // Step 5: Move atoms.ts to atoms.old.ts
  if (fs.existsSync(ATOMS_FILE)) {
    const OLD_ATOMS = path.join(process.cwd(), 'src/lib/atoms.old.ts')
    fs.renameSync(ATOMS_FILE, OLD_ATOMS)
    console.log('✅ Renamed atoms.ts to atoms.old.ts')
  }

  // Step 6: Run TypeScript check
  console.log('🔧 Running TypeScript check...')
  try {
    await execAsync('pnpm typecheck')
    console.log('✅ TypeScript check passed!')
  } catch (error) {
    console.error('❌ TypeScript check failed. Please fix errors manually.')
    console.log('💡 To restore, run: mv src/lib/atoms.ts.backup src/lib/atoms.ts')
  }

  console.log('🎉 Migration complete!')
}

main().catch(console.error)
