'use client'

import { useRouter, usePathname } from 'next/navigation'
import { WIZARD_STEPS } from '@/lib/constants'

interface HeaderProps {
  title?: string
}

export default function Header({ title }: HeaderProps) {
  const router   = useRouter()
  const pathname = usePathname()

  const currentIndex = WIZARD_STEPS.findIndex(s => s.path === pathname)
  const canGoBack    = currentIndex > 0
  const prevPath     = canGoBack ? WIZARD_STEPS[currentIndex - 1].path : '/'

  // On project pages, show a different back nav
  const isProjectPage = pathname.startsWith('/project')

  return (
    <header style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        'max(12px, env(safe-area-inset-top)) 18px 10px',
      background:     'transparent',
    }}>
      {/* Back button */}
      <button
        onClick={() => isProjectPage ? router.push('/project') : router.push(prevPath)}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        4,
          background: 'none',
          border:     'none',
          padding:    '4px 0',
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   14,
          color:      'rgba(44,34,24,0.45)',
          cursor:     'pointer',
          visibility: (canGoBack || isProjectPage) ? 'visible' : 'hidden',
          minWidth:   60,
        }}
        aria-label="Go back"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      {/* Logo */}
      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'rgba(44,34,24,0.75)', fontWeight: 600 }}>
        {title ?? 'EasyStitch'}
      </span>

      {/* My Projects link */}
      <button
        onClick={() => router.push('/project')}
        style={{
          background: 'none', border: 'none',
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   12, color: 'rgba(44,34,24,0.40)',
          cursor:     'pointer', padding: '4px 0',
          minWidth:   60, textAlign: 'right',
        }}
      >
        My Projects
      </button>
    </header>
  )
}
