'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * QuickNav — floating left-edge drawer for the two most common quick actions.
 *
 * Tab is always visible on the left side. Tap/click to expand a compact menu.
 * Two items only (by design — distinct from the full hamburger menu):
 *   🛍  Browse Patterns  → /shop
 *   📤  Start Tracking   → /track/upload  (start a NEW project, not "My Patterns")
 *
 * Hidden on the home page (/) since the main 3-path cards already cover these.
 */
export default function QuickNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  // Hide on home page, desktop, and all focused task/flow pages
  const HIDDEN_ON = ['/', '/upload', '/preview', '/export', '/knitting', '/filet',
    '/crossstitch', '/diamondpainting', '/pbn', '/unlock', '/unlock/success']
  if (HIDDEN_ON.includes(pathname) || pathname.startsWith('/upload')) return null

  const ITEMS = [
    { emoji: '🛍️', label: 'Browse Patterns',  sub: 'Ready-made designs', path: '/shop'         },
    { emoji: '📤', label: 'Start Tracking',    sub: 'Upload a new pattern', path: '/track/upload' },
  ]

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  return (
    <>
      {/* Hidden on desktop — hamburger menu covers all the same links */}
      <style>{`@media(min-width:640px){.quicknav-root{display:none!important}}`}</style>

      <div className="quicknav-root" style={{ display: 'contents' }}>

      {/* Backdrop — closes menu when tapping outside */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 198,
            background: 'rgba(44,34,24,0.15)',
          }}
        />
      )}

      {/* Drawer panel — slides in from the left */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: 0,
          transform: open
            ? 'translate(0, -50%)'
            : 'translate(-100%, -50%)',
          zIndex: 199,
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          background: 'white',
          borderRadius: '0 18px 18px 0',
          boxShadow: '4px 0 24px rgba(44,34,24,0.12)',
          padding: '14px 14px 14px 16px',
          minWidth: 210,
          border: '1.5px solid #EDE4D8',
          borderLeft: 'none',
        }}
      >
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700,
          color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: 10,
        }}>
          Quick access
        </p>

        {ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => go(item.path)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 8px',
              background: 'none', border: 'none',
              borderBottom: '1px solid #F2EAD8',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0, width: 28, textAlign: 'center' }}>
              {item.emoji}
            </span>
            <div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                fontSize: 13, color: '#2C2218', marginBottom: 1,
              }}>
                {item.label}
              </p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11, color: '#9A8878',
              }}>
                {item.sub}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Pull tab — always visible on the left edge */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close quick menu' : 'Open quick menu'}
        style={{
          position: 'fixed',
          top: '50%',
          left: open ? 210 : 0,
          transform: 'translateY(-50%)',
          zIndex: 200,
          transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
          background: '#C4614A',
          border: 'none',
          borderRadius: '0 10px 10px 0',
          padding: '14px 7px',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          boxShadow: '2px 0 12px rgba(196,97,74,0.25)',
        }}
      >
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 9, fontWeight: 700,
          color: 'white',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>
          {open ? '← Close' : 'Quick'}
        </span>
        <span style={{ fontSize: 14, lineHeight: 1 }}>{open ? '✕' : '⚡'}</span>
      </button>

      </div>
    </>
  )
}
