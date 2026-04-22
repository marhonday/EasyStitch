import type { Metadata } from 'next'
import './globals.css'
import FaithFooter from '@/components/layout/FaithFooter'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title:       'EasyStitch — Free Photo to Crochet Pattern Generator & Row Tracker',
  description: 'Turn any photo into a crochet, cross-stitch, or knitting pattern for free — C2C, graphgan, tapestry, filet, and more. Free online row counter and progress tracker. No account, no download.',
  manifest:    '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#FAF6EF" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=Press+Start+2P&family=VT323&family=Silkscreen:wght@400;700&family=Audiowide&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/*
          Responsive wrapper:
          - Mobile (<640px): full width, no padding
          - Tablet (640-1024px): centered, max 640px  
          - Desktop (>1024px): centered card with subtle shadow, max 480px
            (keeps mobile UI intact but looks intentional on large screens)
        */}
        <div className="app-shell">
          <PatternProviderWrapper>
            {children}
            <FaithFooter />
          </PatternProviderWrapper>
        </div>
        <Analytics />
      </body>
    </html>
  )
}

// Separate component so we can import 'use client' context provider
import { PatternProvider } from '@/context/PatternContext'

function PatternProviderWrapper({ children }: { children: React.ReactNode }) {
  return <PatternProvider>{children}</PatternProvider>
}
