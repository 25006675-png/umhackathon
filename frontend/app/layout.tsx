import type { Metadata, Viewport } from 'next'
import { Spectral, Epilogue } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import Sidebar from '@/components/Sidebar'

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-spectral',
  display: 'swap',
})

const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-epilogue',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TernakAI — Poultry Early Warning',
  description: 'Poultry Disease Early Warning System',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spectral.variable} ${epilogue.variable} font-sans min-h-screen`}>
        <div className="flex min-h-screen">
          <Sidebar />

          <div className="flex-1 flex flex-col min-h-screen md:min-h-0 md:overflow-y-auto">
            {/* Mobile header */}
            <header
              className="md:hidden sticky top-0 z-20"
              style={{ backgroundColor: 'var(--sidebar)' }}
            >
              <div className="flex items-center px-4 py-3 gap-3">
                <span
                  className="font-display text-base font-semibold tracking-tight"
                  style={{ color: '#f8fafc' }}
                >
                  TernakAI
                </span>
                <span
                  className="ml-auto text-[0.6rem] font-medium tracking-widest uppercase"
                  style={{ color: '#475569' }}
                >
                  UMHack 2026
                </span>
              </div>
            </header>

            <main className="flex-1 pb-20 md:pb-0">{children}</main>

            <BottomNav />
          </div>
        </div>
      </body>
    </html>
  )
}
