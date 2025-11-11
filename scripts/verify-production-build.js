#!/usr/bin/env node
/**
 * Production build verification script
 *
 * Verifies that debug labels are stripped from production builds
 * and provides bundle size analysis
 *
 * Usage: node scripts/verify-production-build.js
 */

const fs = require('fs')
const path = require('path')

const BUILD_DIR = path.join(__dirname, '..', '.next')
const SEARCH_PATTERNS = [
  /\.debugLabel\s*=/,
  /debugLabel:\s*['"`]/,
  /'auth\/session'/,
  /'workouts\/list'/,
  /'notifications\/list'/,
]

console.log('🔍 Verifying production build...\n')

/**
 * Recursively search for patterns in build files
 */
function searchDirectory(dir, patterns) {
  const findings = []

  if (!fs.existsSync(dir)) {
    console.error(`❌ Build directory not found: ${dir}`)
    console.error('   Run "pnpm build" first to generate production build')
    return findings
  }

  function searchFiles(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        searchFiles(fullPath)
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
        const content = fs.readFileSync(fullPath, 'utf-8')

        for (const pattern of patterns) {
          if (pattern.test(content)) {
            findings.push({
              file: path.relative(BUILD_DIR, fullPath),
              pattern: pattern.toString(),
            })
          }
        }
      }
    }
  }

  searchFiles(dir)
  return findings
}

// Search for debug label patterns
const findings = searchDirectory(BUILD_DIR, SEARCH_PATTERNS)

if (findings.length === 0) {
  console.log('✅ Success! No debug labels found in production build')
  console.log('   Debug labels are properly stripped from production bundles\n')
} else {
  console.log('⚠️  Warning: Debug labels found in production build:\n')
  findings.forEach(({ file, pattern }) => {
    console.log(`   File: ${file}`)
    console.log(`   Pattern: ${pattern}\n`)
  })
  console.log('   This may indicate that withDebugLabel() is not being used correctly\n')
}

// Bundle size analysis
console.log('📊 Bundle Size Analysis:\n')

const statsPath = path.join(BUILD_DIR, 'analyze', 'client.html')
if (fs.existsSync(statsPath)) {
  console.log('   Bundle analysis available at: .next/analyze/client.html')
  console.log('   Run: open .next/analyze/client.html (macOS)')
  console.log('   Or: xdg-open .next/analyze/client.html (Linux)\n')
} else {
  console.log('   Run "pnpm build" with ANALYZE=true to generate bundle analysis')
  console.log('   Example: ANALYZE=true pnpm build\n')
}

// Summary
console.log('📝 Summary:\n')
console.log(`   Build Directory: ${BUILD_DIR}`)
console.log(`   Patterns Searched: ${SEARCH_PATTERNS.length}`)
console.log(`   Findings: ${findings.length}`)
console.log(`   Status: ${findings.length === 0 ? '✅ PASS' : '⚠️  WARNING'}\n`)

process.exit(findings.length === 0 ? 0 : 1)
