'use client'

import { useState } from 'react'

// Banner auto-hides after this date (48 hrs from deploy)
const HIDE_AFTER = new Date('2026-04-24T23:59:00Z')

export default function RebrandBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || new Date() > HIDE_AFTER) return null

  return (
    <div style={{
      width: '100%',
      background: '#C4614A',
    }}>
      {/* Inner row — capped at app width so desktop doesn't look blown out */}
      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '10px 40px 10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: 'white',
          textAlign: 'center',
          lineHeight: 1.4,
        }}>
          🧶 EasyStitch is now <strong>CraftWabi</strong> — same tool, new name. Bookmarks and old links still work.
        </p>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.75)',
            fontSize: 18,
            cursor: 'pointer',
            lineHeight: 1,
            padding: '4px 8px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
