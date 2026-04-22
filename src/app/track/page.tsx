'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { getAllTracked, deleteTracked, TrackedPattern } from '@/lib/patternTracker'

function progressPct(p: TrackedPattern): number {
  return p.meta.height === 0 ? 0 : Math.round((p.progress.completedRows.length / p.meta.height) * 100)
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function TrackListPage() {
  const router = useRouter()
  const [patterns, setPatterns] = useState<TrackedPattern[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { setPatterns(getAllTracked()) }, [])

  function handleDelete(id: string) {
    if (confirmDelete === id) {
      deleteTracked(id)
      setPatterns(getAllTracked())
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 100px' }}>

        {/* Header row */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218' }}>
              My Patterns
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878' }}>
              {patterns.length === 0 ? 'No patterns tracked yet' : `${patterns.length} pattern${patterns.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/track/upload')}
            style={{
              padding: '10px 16px',
              background: '#C4614A', color: 'white',
              border: 'none', borderRadius: 12,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(196,97,74,0.28)',
            }}
          >
            + Track new
          </button>
        </div>

        {/* Empty state */}
        {patterns.length === 0 && (
          <div style={{
            width: '100%', maxWidth: 400,
            background: 'white', borderRadius: 20,
            border: '1.5px dashed #E4D9C8',
            padding: '40px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧶</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
              No patterns yet
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', lineHeight: 1.6, marginBottom: 20 }}>
              Upload an existing pattern chart to start tracking your progress row by row — or save a generated pattern from the export page.
            </p>
            <button
              onClick={() => router.push('/track/upload')}
              style={{
                padding: '13px 24px',
                background: '#C4614A', color: 'white',
                border: 'none', borderRadius: 12,
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Upload a pattern to track →
            </button>
          </div>
        )}

        {/* Pattern list */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {patterns.map(p => {
            const pct = progressPct(p)
            const rowsDone = p.progress.completedRows.length
            const isConfirming = confirmDelete === p.id
            return (
              <div
                key={p.id}
                style={{
                  background: 'white', borderRadius: 18,
                  border: '1.5px solid #EDE4D8',
                  boxShadow: '0 2px 12px rgba(44,34,24,0.06)',
                  overflow: 'hidden',
                }}
              >
                {/* Progress bar */}
                <div style={{ height: 4, background: '#F2EAD8' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#4A9050' : '#C4614A', transition: 'width 0.3s' }} />
                </div>

                <div
                  style={{ padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => router.push(`/track/${p.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#2C2218', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
                        {p.meta.width}×{p.meta.height} · {p.meta.stitchStyle} · {p.meta.source === 'generated' ? 'EasyStitch' : 'uploaded'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{
                        fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700,
                        color: pct === 100 ? '#4A9050' : '#C4614A',
                      }}>
                        {pct}%
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#B8AAA0' }}>
                        {rowsDone}/{p.meta.height} rows
                      </p>
                    </div>
                  </div>

                  {/* Colour palette preview */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 10, alignItems: 'center' }}>
                    {p.palette.slice(0, 10).map((c, i) => (
                      <div key={i} style={{ width: 14, height: 14, borderRadius: 4, background: c.hex, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                    ))}
                    {p.palette.length > 10 && (
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#B8AAA0' }}>
                        +{p.palette.length - 10}
                      </span>
                    )}
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C8BFB0', marginLeft: 'auto' }}>
                      {relativeDate(p.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ borderTop: '1px solid #F2EAD8', display: 'flex' }}>
                  <button
                    onClick={() => router.push(`/track/${p.id}`)}
                    style={{
                      flex: 1, padding: '10px', background: 'none', border: 'none',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                      color: '#C4614A', cursor: 'pointer',
                    }}
                  >
                    {pct === 100 ? '✓ View pattern' : 'Continue →'}
                  </button>
                  <div style={{ width: 1, background: '#F2EAD8' }} />
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{
                      padding: '10px 16px', background: isConfirming ? 'rgba(196,97,74,0.08)' : 'none',
                      border: 'none',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                      color: isConfirming ? '#C4614A' : '#C8BFB0',
                      cursor: 'pointer',
                    }}
                  >
                    {isConfirming ? 'Confirm delete' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Back to home */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        padding: '10px 20px max(16px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, #FAF6EF 80%, transparent)',
        zIndex: 50, textAlign: 'center',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#B8AAA0', cursor: 'pointer', textDecoration: 'underline' }}
        >
          ← Back to home
        </button>
      </div>
    </main>
  )
}
