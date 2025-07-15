import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JotaiProvider } from '@/providers/JotaiProvider'
import { HeroUIProvider } from '@/providers/HeroUIProvider'
import { ThemeWrapper } from '@/components/providers/ThemeWrapper'
import { BetterAuthProvider } from '@/providers/BetterAuthProvider'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UltraCoach - Ultramarathon Training Platform",
  description: "Connect with coaches and manage your ultramarathon training",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <JotaiProvider>
          <BetterAuthProvider>
            <HeroUIProvider>
              <ThemeWrapper>
                {children}
              </ThemeWrapper>
            </HeroUIProvider>
          </BetterAuthProvider>
        </JotaiProvider>
      </body>
    </html>
  );
}
