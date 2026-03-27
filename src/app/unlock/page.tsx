'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
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
  { num: 4, sts: 8, runs: '1 ■, 6 ●, 1 ■' },
  { num: 3, sts: 8, runs: '4 ▲, 2 ■, 2 ▲', done: true },
  { num: 2, sts: 8, runs: '3 ○, 2 ◆, 3 ○', done: true },
  { num: 1, sts: 8, runs: '8 ■',            done: true },
]

const SAMPLE_GRID: string[][] = [
  ['#e8786e','#89a882','#89a882','#c9a96e','#c9a96e','#89a882','#89a882','#e8786e'],
  ['#faf3e7','#faf3e7','#c9a96e','#c9a96e','#c9a96e','#c9a96e','#faf3e7','#faf3e7'],
  ['#e8786e','#89a882','#89a882','#89a882','#89a882','#89a882','#89a882','#e8786e'],
  ['#c9a96e','#c9a96e','#e8786e','#e8786e','#e8786e','#e8786e','#c9a96e','#c9a96e'],
  ['#faf3e7','#faf3e7','#faf3e7','#5c7a55','#5c7a55','#faf3e7','#faf3e7','#faf3e7'],
  ['#e8786e','#e8786e','#e8786e','#e8786e','#e8786e','#e8786e','#e8786e','#e8786e'],
]
const CURRENT_GRID_ROW = 2

function UnlockInner() {
  const router    = useRouter()
  const params    = useSearchParams()
  const returnUrl = params.get('return') ?? '/export'
  const tier      = params.get('type') === 'graphic' ? 'graphic' : 'photo'
  const price     = tier === 'graphic' ? '$3' : '$5'
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function handleUnlock() {
    setBusy(true)
    setErr(null)
    try {
      const res  = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ returnUrl, tier }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setErr(data.error ?? 'Could not start checkout. Please try again.')
        setBusy(false)
      }
    } catch {
      setErr('Network error. Please try again.')
      setBusy(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 20px 180px' }}>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', marginBottom: 20 }}>
          {/* Launch badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(196,97,74,0.10)', border: '1px solid rgba(196,97,74,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 14 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4614A', display: 'inline-block' }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#C4614A', letterSpacing: '0.04em' }}>
              LAUNCH PRICING — LIMITED TIME
            </span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 10, lineHeight: 1.3 }}>
            Your pattern is ready.
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.65 }}>
            EasyStitch has built a stitch-by-stitch pattern from your image — unique to you, ready to follow row by row.
          </p>
        </div>

        {/* ── Value card ────────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.08)', padding: '16px', marginBottom: 16 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            What you&apos;re getting
          </p>
          {[
            {
              emoji: '🐾',
              title: 'A pattern built from your image',
              desc:  'Not a template — every colour, shape, and stitch block is generated from your specific photo. Pets, portraits, logos, and custom art are all supported.',
            },
            {
              emoji: '📄',
              title: 'Full printable PDF',
              desc:  'Every row with colour runs, a full colour key, and stitch counts — formatted to print and take to your chair.',
            },
            {
              emoji: '📐',
              title: 'Chart + row-by-row instructions',
              desc:  'Visual grid chart alongside written instructions. Follow whichever format feels natural to you.',
            },
            {
              emoji: '💾',
              title: 'Download immediately',
              desc:  'PDF and PNG ready the moment payment clears. No account required.',
            },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #F2EAD8' }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{item.emoji}</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 2 }}>{item.title}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
          {/* Pricing note */}
          <div style={{ background: '#FAF6EF', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.55 }}>
              <strong style={{ color: '#2C2218' }}>Why $2?</strong> We&apos;re in early launch. Generating custom patterns from pets, portraits, and detailed images takes real processing — this work is worth significantly more. We&apos;re keeping the price low now so early users get access while we grow. <strong style={{ color: '#C4614A' }}>Pricing will increase as we add features and scale.</strong>
            </p>
          </div>
        </div>

        {/* ── Sample pattern preview ─────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 20px rgba(44,34,24,0.08)', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #F2EAD8' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Sample — Your Full Pattern Includes
            </p>
          </div>
          <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'start' }}>
            {/* Mini grid */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, width: 108 }}>
                {SAMPLE_GRID.map((row, ri) =>
                  row.map((hex, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      style={{ width: 11, height: 11, borderRadius: 2, background: hex, opacity: ri > CURRENT_GRID_ROW ? 0.45 : 1 }}
                    />
                  ))
                )}
              </div>
              <div style={{ position: 'absolute', top: CURRENT_GRID_ROW * 13, left: 0, width: 108, height: 13, background: 'rgba(196,97,74,0.18)', borderRadius: 2, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: CURRENT_GRID_ROW * 13, left: 0, width: 3, height: 13, background: 'rgba(196,97,74,0.7)', borderRadius: '2px 0 0 2px', pointerEvents: 'none' }} />
            </div>
            {/* Row list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {SAMPLE_ROWS.map(row => {
                const isCurrent = row.num === 4
                const isDone    = !!row.done
                return (
                  <div key={row.num} style={{ padding: '5px 8px', borderRadius: 8, borderLeft: `3px solid ${isCurrent ? '#C4614A' : isDone ? '#4A9050' : 'transparent'}`, background: isCurrent ? 'rgba(196,97,74,0.07)' : isDone ? 'rgba(74,144,80,0.04)' : 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, background: isDone ? '#4A9050' : 'transparent', border: isDone ? 'none' : `1.5px solid ${isCurrent ? '#C4614A' : '#E4D9C8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>
                      {isDone ? '✓' : ''}
                    </div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: isCurrent ? 700 : 500, color: isDone ? '#B8AAA0' : isCurrent ? '#C4614A' : '#2C2218', textDecoration: isDone ? 'line-through' : 'none' }}>
                      R{row.num} ({row.sts} sts): {row.runs}
                    </span>
                    {isCurrent && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#C4614A', fontWeight: 600, marginLeft: 'auto' }}>← now</span>}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #F2EAD8' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Colour key</p>
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

        {/* ── WYSIWYG disclaimer ────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: '#FFFBF5', border: '1.5px solid #EDE4D8', borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>👁</span>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 5 }}>
                What you see is what you get
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.6 }}>
                The pattern you previewed in the app is exactly what you&apos;ll download — EasyStitch generates your pattern directly from your image and settings. We strongly recommend reviewing your pattern preview before purchasing.
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', lineHeight: 1.6, marginTop: 6 }}>
                We can&apos;t modify, re-generate, or edit your pattern after purchase — the output is unique to your upload and there is no manual adjustment step. If you&apos;d like a different result, adjust your settings and generate again before buying.
              </p>
            </div>
          </div>
        </div>

        {/* Support note */}
        <p style={{ width: '100%', maxWidth: 400, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#B8AAA0', textAlign: 'center', lineHeight: 1.5 }}>
          Questions? Reach us at{' '}
          <a href="mailto:support@easystitch.app" style={{ color: '#9A8878', textDecoration: 'underline' }}>support@easystitch.app</a>
        </p>

      </section>

      {/* ── Sticky CTA ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        padding: '14px 20px max(20px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, #FAF6EF 75%, transparent)',
        zIndex: 50,
      }}>

        {/* Price display */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#2C2218' }}>$2</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#C4614A', lineHeight: 1 }}>LAUNCH PRICE</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', lineHeight: 1.3, marginTop: 2 }}>per pattern · price increasing soon</p>
          </div>
        </div>

        <button
          onClick={handleUnlock}
          disabled={busy}
          style={{
            width: '100%', padding: '17px 24px',
            background: busy ? '#E4D9C8' : '#C4614A',
            color: busy ? '#B8AAA0' : 'white',
            border: 'none', borderRadius: 16,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: busy ? 'none' : '0 4px 20px rgba(196,97,74,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          {busy ? (
            <>
              <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'es-spin 0.8s linear infinite', display: 'inline-block' }} />
              Redirecting to payment…
            </>
          ) : (
            '🔓 Unlock My Pattern — $2'
          )}
        </button>

        {err && (
          <p style={{ textAlign: 'center', marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{err}</p>
        )}

        <p style={{ textAlign: 'center', marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#B8AAA0', lineHeight: 1.5 }}>
          Secure payment via Stripe · instant download · no account needed
        </p>

        <style>{`@keyframes es-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    </main>
  )
}

export default function UnlockPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'es-spin 0.8s linear infinite' }} />
        <style>{`@keyframes es-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </main>
    }>
      <UnlockInner />
    </Suspense>
  )
}
