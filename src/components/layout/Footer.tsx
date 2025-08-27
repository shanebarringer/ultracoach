import { Mountain } from 'lucide-react'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-divider bg-content1/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Mountain className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-bold text-foreground">UltraCoach</h3>
              <p className="text-sm text-foreground/70">Summit your potential</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link
              href="/about"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="/help"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              Help
            </Link>
            <Link
              href="/privacy"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              Terms
            </Link>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-sm text-foreground/60">© 2025 UltraCoach</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
