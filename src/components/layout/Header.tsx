'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { WIZARD_STEPS } from '@/lib/constants'

interface HeaderProps {
  title?: string
}

export default function Header({ title }: HeaderProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const currentIndex = WIZARD_STEPS.findIndex(s => s.path === pathname)
  const canGoBack    = currentIndex > 0
  const prevPath     = canGoBack ? WIZARD_STEPS[currentIndex - 1].path : '/'

  const isProjectPage = pathname.startsWith('/project')

  return (
    <>
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

        {/* Menu button */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            background: 'none', border: 'none',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 20, color: 'rgba(44,34,24,0.40)',
            cursor: 'pointer', padding: '4px 0',
            minWidth: 60, textAlign: 'right',
            lineHeight: 1,
          }}
          aria-label="Open menu"
        >
          ☰
        </button>
      </header>

      {/* Slide-down menu overlay */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(44,34,24,0.18)' }}
          />
          {/* Menu panel */}
          <div style={{
            position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 430, zIndex: 101,
            background: 'white', borderRadius: '0 0 24px 24px',
            boxShadow: '0 8px 32px rgba(44,34,24,0.15)',
            padding: 'max(16px, env(safe-area-inset-top)) 20px 20px',
          }}>
            {/* Close row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#2C2218' }}>
                EasyStitch 🧶
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#9A8878', cursor: 'pointer', lineHeight: 1 }}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            {/* Menu items */}
            {[
              { emoji: '📋', label: 'My Projects',     path: '/project' },
              { emoji: '🖼️', label: 'Gallery',          path: '/gallery' },
              { emoji: '❓', label: 'FAQ',              path: '/faq'     },
              { emoji: 'ℹ️', label: 'About',            path: '/about'   },
              { emoji: '☕', label: 'Support / Donate', path: '/donate'  },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => { setMenuOpen(false); router.push(item.path) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 4px', background: 'none', border: 'none',
                  borderBottom: '1px solid #F2EAD8', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 15,
                  color: '#2C2218', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{item.emoji}</span>
                {item.label}
              </button>
            ))}

            <button
              onClick={() => { setMenuOpen(false); router.push('/upload') }}
              style={{
                width: '100%', marginTop: 14, padding: '14px',
                background: '#C4614A', color: 'white', border: 'none',
                borderRadius: 14, fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(196,97,74,0.25)',
              }}
            >
              + New Pattern
            </button>
          </div>
        </>
      )}
    </>
  )
}
