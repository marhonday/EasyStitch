import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'EasyStitch — Turn any photo into a crochet pattern',
  description: 'Upload a photo and get a stitch-by-stitch crochet graph pattern in seconds. Free, no account needed.',
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
          </PatternProviderWrapper>
        </div>
      </body>
    </html>
  )
}

// Separate component so we can import 'use client' context provider
import { PatternProvider } from '@/context/PatternContext'

function PatternProviderWrapper({ children }: { children: React.ReactNode }) {
  return <PatternProvider>{children}</PatternProvider>
}
