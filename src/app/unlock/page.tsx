'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'

// Sample data for the preview grid
const SAMPLE_PALETTE = [
  { hex: '#e8786e', symbol: '■', label: 'Terracotta' },
  { hex: '#89a882', symbol: '●', label: 'Sage green' },
  { hex: '#c9a96e', symbol: '▲', label: 'Warm sand' },
  { hex: '#faf3e7', symbol: '○', label: 'Cream' },
  { hex: '#5c7a55', symbol: '◆', label: 'Forest' },
]

const SAMPLE_ROWS = [
  { num: 6, sts: 8, runs: '3 ■, 2 ●, 3 ■' },
  { num: 5, sts: 8, runs: '2 ○, 4 ▲, 2 ○' },
  { num: 4, sts: 8, runs: '1 ■, 6 ●, 1 ■' },  // ← current (highlighted)
  { num: 3, sts: 8, runs: '4 ▲, 2 ■, 2 ▲', done: true },
  { num: 2, sts: 8, runs: '3 ○, 2 ◆, 3 ○', done: true },
  { num: 1, sts: 8, runs: '8 ■', done: true },
]

const SAMPLE_GRID: string[][] = [
  ['#e8786e','#89a882','#89a882','#c9a96e','#c9a96e','#89a882','#89a882','#e8786e'],
  ['#faf3e7','#faf3e7','#c9a96e','#c9a96e','#c9a96e','#c9a96e','#faf3e7','#faf3e7'],
  ['#e8786e','#89a882','#89a882','#89a882','#89a882','#89a882','#89a882','#e8786e'], // current
  ['#c9a96e','#c9a96e','#e8786e','#e8786e','#e8786e','#e8786e','#c9a96e','#c9a96e'],
  ['#faf3e7','#faf3e7','#faf3e7','#5c7a55','#5c7a55','#faf3e7','#faf3e7','#faf3e7'],
  ['#e8786e','#e8786e','#e8786e','#e8786e','#e8786e','#e8786e','#e8786e','#e8786e'],
]
const CURRENT_GRID_ROW = 2 // row index 2 = instruction row 4

export default function UnlockPage() {
  const router = useRouter()

  function handleUnlock() {
    // Placeholder — will wire to payment or FREE_MODE bypass
    router.push('/export')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 20px 140px' }}>

        {/* Hero */}
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔓</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            Your pattern is ready.
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.6 }}>
            Unlock the full pattern to download, print, and stitch — row by row.
          </p>
        </div>

        {/* Sample pattern preview card */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 20px rgba(44,34,24,0.10)', overflow: 'hidden', marginBottom: 16 }}>

          {/* Card header */}
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #F2EAD8' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Sample — Your Full Pattern Includes
            </p>
          </div>

          {/* Mini grid + row instructions side by side */}
          <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'start' }}>

            {/* Mini pixel grid */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, 1fr)`, gap: 2, width: 108 }}>
                {SAMPLE_GRID.map((row, ri) =>
                  row.map((hex, ci) => {
                    const isCurrent = ri === CURRENT_GRID_ROW
                    const isDone    = ri > CURRENT_GRID_ROW
                    return (
                      <div
                        key={`${ri}-${ci}`}
                        style={{
                          width: 11, height: 11,
                          borderRadius: 2,
                          background: hex,
                          opacity: isDone ? 0.45 : 1,
                        }}
                      />
                    )
                  })
                )}
              </div>
              {/* Highlight band overlay */}
              <div style={{
                position: 'absolute',
                top:  CURRENT_GRID_ROW * 13,
                left: 0,
                width: 108,
                height: 13,
                background: 'rgba(196,97,74,0.18)',
                borderRadius: 2,
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute',
                top:  CURRENT_GRID_ROW * 13,
                left: 0,
                width: 3,
                height: 13,
                background: 'rgba(196,97,74,0.7)',
                borderRadius: '2px 0 0 2px',
                pointerEvents: 'none',
              }} />
              {/* Row numbers */}
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                {SAMPLE_GRID.map((_, ri) => (
                  <span key={ri} style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 8, color: ri === CURRENT_GRID_ROW ? '#C4614A' : '#C8BFB0',
                    fontWeight: ri === CURRENT_GRID_ROW ? 700 : 400,
                    lineHeight: '13px',
                  }}>
                    R{SAMPLE_GRID.length - ri}
                  </span>
                ))}
              </div>
            </div>

            {/* Row instructions list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {SAMPLE_ROWS.map(row => {
                const isCurrent = row.num === 4
                const isDone    = !!row.done
                return (
                  <div
                    key={row.num}
                    style={{
                      padding:    '5px 8px',
                      borderRadius: 8,
                      borderLeft: `3px solid ${isCurrent ? '#C4614A' : isDone ? '#4A9050' : 'transparent'}`,
                      background: isCurrent ? 'rgba(196,97,74,0.07)' : isDone ? 'rgba(74,144,80,0.04)' : 'transparent',
                      display:    'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      background: isDone ? '#4A9050' : 'transparent',
                      border: isDone ? 'none' : `1.5px solid ${isCurrent ? '#C4614A' : '#E4D9C8'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: 'white', fontWeight: 700,
                    }}>
                      {isDone ? '✓' : ''}
                    </div>
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                      fontWeight: isCurrent ? 700 : 500,
                      color: isDone ? '#B8AAA0' : isCurrent ? '#C4614A' : '#2C2218',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                      R{row.num} ({row.sts} sts): {row.runs}
                    </span>
                    {isCurrent && (
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#C4614A', fontWeight: 600, marginLeft: 'auto' }}>← now</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Colour legend */}
          <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #F2EAD8' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Colour key
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SAMPLE_PALETTE.map(p => (
                <div key={p.hex} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: p.hex, border: '1px solid rgba(44,34,24,0.1)', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#6B5744' }}>{p.symbol} {p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* What's included */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 12px rgba(44,34,24,0.07)', padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            What's included
          </p>
          {[
            { emoji: '📄', title: 'Full printable PDF',        desc: 'Every row, colour key, and stitch count — ready to print' },
            { emoji: '🎨', title: 'Interactive pattern viewer', desc: 'Zoom, pan, and edit individual cells on any device' },
            { emoji: '✅', title: 'Row-by-row progress tracker', desc: 'Tap each row done — your place is always saved' },
            { emoji: '💾', title: 'Saved to My Patterns',       desc: 'Come back anytime — your pattern stays in your collection' },
            { emoji: '📧', title: 'Email support',              desc: 'Questions? Reach us at support@easystitch.org' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #F2EAD8' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: '#2C2218', marginBottom: 2 }}>{item.title}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* Sticky unlock CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        padding: '14px 20px max(20px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, #FAF6EF 80%, transparent)',
        zIndex: 50,
      }}>
        <button
          onClick={handleUnlock}
          style={{
            width: '100%', padding: '17px 24px',
            background: '#C4614A', color: 'white',
            border: 'none', borderRadius: 16,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(196,97,74,0.32)',
          }}
        >
          🔓 Unlock Full Pattern
        </button>
        <p style={{ textAlign: 'center', marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#B8AAA0' }}>
          One-time · instant download · keep forever
        </p>
        <p style={{ textAlign: 'center', marginTop: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
          🛡️ If your pattern doesn&apos;t turn out right, we&apos;ll fix it or refund you.
        </p>
      </div>
    </main>
  )
}
