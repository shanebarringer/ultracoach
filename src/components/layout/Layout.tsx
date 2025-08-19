'use client'

import FeedbackButton from '../feedback/FeedbackButton'
import AppDrawer from './AppDrawer'
import Footer from './Footer'
import Header from './Header'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <AppDrawer />
      <main className="flex-1">{children}</main>
      <Footer />
      <FeedbackButton variant="floating" />
    </div>
  )
}
