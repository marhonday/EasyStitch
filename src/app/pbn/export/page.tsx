'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePbnPattern } from '@/context/PbnPatternContext'
import { PatternData } from '@/types/pattern'
import { removeColorFromPattern } from '@/lib/removeColor'
import { logEvent } from '@/lib/log'
import { isUnlocked } from '@/lib/unlock'

type ViewMode = 'preview' | 'print'
type Status   = 'idle' | 'loading-png' | 'done-png' | 'error'

// ── Canvas renderer ───────────────────────────────────────────────────────────
function drawPbnCanvas(
  canvas: HTMLCanvasElement,
  pattern: PatternData,
  mode: ViewMode,
  cellSize: number,
) {
  const { grid, palette } = pattern
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const gap  = 1

  canvas.width  = cols * (cellSize + gap) + gap
  canvas.height = rows * (cellSize + gap) + gap

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Background / grid lines colour
  ctx.fillStyle = mode === 'print' ? '#cccccc' : '#e0d8cc'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const fontSize = Math.max(5, Math.floor(cellSize * 0.45))

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gap + c * (cellSize + gap)
      const y = gap + r * (cellSize + gap)
      const { colorIndex } = grid[r][c]
      const color = palette[colorIndex]

      if (mode === 'preview') {
        // Fill with actual colour
        ctx.fillStyle = color.hex
        ctx.fillRect(x, y, cellSize, cellSize)
        // Number overlay (only if cell is big enough)
        if (cellSize >= 10) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'
          ctx.font = `bold ${fontSize}px monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(colorIndex + 1), x + cellSize / 2, y + cellSize / 2)
        }
      } else {
        // Print mode: white cell + number
        ctx.fillStyle = 'white'
        ctx.fillRect(x, y, cellSize, cellSize)
        if (cellSize >= 8) {
          ctx.fillStyle = '#222222'
          ctx.font = `bold ${fontSize}px monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(colorIndex + 1), x + cellSize / 2, y + cellSize / 2)
        }
      }
    }
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PbnExportPage() {
  const router = useRouter()
  const { state, dispatch } = usePbnPattern()
  const { patternData } = state

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const cellSizeRef = useRef(8)

  const [viewMode,     setViewMode]     = useState<ViewMode>('preview')
  const [status,       setStatus]       = useState<Status>('idle')
  const [error,        setError]        = useState<string | null>(null)
  const [patternName,  setPatternName]  = useState('My Paint by Number')

  // ── Palette editor ─────────────────────────────────────────────────────────
  const [workingPattern, setWorkingPattern] = useState<PatternData | null>(null)
  useEffect(() => { setWorkingPattern(patternData ?? null) }, [patternData])
  const removeColor = useCallback((idx: number) => {
    setWorkingPattern(prev => prev ? removeColorFromPattern(prev, idx) : prev)
  }, [])
  const activePattern = workingPattern ?? patternData

  // ── Redirect guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!patternData) router.replace('/pbn')
  }, [patternData, router])

  // ── Draw canvas ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activePattern || !canvasRef.current) return
    const { width, height } = activePattern.meta
    const cs = Math.max(4, Math.min(14, Math.floor(320 / Math.max(width, height))))
    cellSizeRef.current = cs
    drawPbnCanvas(canvasRef.current, activePattern, viewMode, cs)
  }, [activePattern, viewMode])

  if (!patternData) return null

  const { meta, palette } = activePattern ?? patternData

  function handleDownloadPng() {
    if (!isUnlocked()) { router.push('/unlock?return=/pbn/export'); return }
    if (!canvasRef.current) return
    logEvent('EXPORT_TRIGGERED', 'pbn-png')
    setStatus('loading-png')
    try {
      canvasRef.current.toBlob(blob => {
        if (!blob) { setError('Could not save image.'); setStatus('error'); return }
        const url  = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href     = url
        link.download = `${patternName.replace(/\s+/g, '-').toLowerCase()}-${viewMode}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 2000)
        setStatus('done-png')
      })
    } catch {
      setError('Could not save image.')
      setStatus('error')
    }
  }

  const busy = status === 'loading-png'

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #EDE4D8' }}>
        <button
          onClick={() => router.push('/pbn/settings')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}
        >
          ← Settings
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Your Pattern</p>
        <button
          onClick={() => { dispatch({ type: 'RESET' }); router.push('/pbn') }}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', fontWeight: 600, cursor: 'pointer' }}
        >
          New +
        </button>
      </div>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 160px', gap: 16 }}>

        {/* Stats */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', gap: 8 }}>
          {[
            [meta.width + '×' + meta.height, 'Grid'],
            [meta.colorCount + '',           'Colours'],
            ['PBN',                          'Style'],
          ].map(([val, label]) => (
            <div key={label} style={{ flex: 1, background: 'white', borderRadius: 12, padding: '10px 12px', textAlign: 'center', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#2C2218' }}>{val}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* View mode toggle */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', background: 'white', borderRadius: 14, padding: 4, boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          {(['preview', 'print'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: viewMode === mode ? '#C4614A' : 'transparent',
                color: viewMode === mode ? 'white' : '#9A8878',
                border: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {mode === 'preview' ? '🎨 Colour Preview' : '🖨️ Print View'}
            </button>
          ))}
        </div>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', textAlign: 'center', maxWidth: 400 }}>
          {viewMode === 'preview'
            ? 'Colour preview shows what the finished painting will look like.'
            : 'Print view shows the numbered template — download and print this to paint from.'}
        </p>

        {/* Canvas */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, padding: 12, boxShadow: '0 2px 16px rgba(44,34,24,0.08)', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12, imageRendering: 'pixelated' }}
          />
        </div>

        {/* Palette editor */}
        {activePattern && activePattern.palette.length > 1 && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Edit colours</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 10 }}>Tap × to remove a colour — regions merge into the nearest shade</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activePattern.palette.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FAF6EF', borderRadius: 20, padding: '4px 8px 4px 6px', border: '1px solid #EDE4D8' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: c.hex, flexShrink: 0, border: '1px solid rgba(44,34,24,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(0,0,0,0.6)', fontWeight: 700, lineHeight: 1 }}>{i + 1}</span>
                  </div>
                  {c.stitchCount != null && (
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>{c.stitchCount.toLocaleString()}</span>
                  )}
                  {activePattern.palette.length > 1 && (
                    <button
                      onClick={() => removeColor(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontSize: 13, color: '#C8BFB0', lineHeight: 1 }}
                      title={`Remove colour ${i + 1}`}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Colour key */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Colour key</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {palette.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: c.hex, border: '1.5px solid rgba(0,0,0,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,0.6)' }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218', fontWeight: 600 }}>Colour {i + 1}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                    {c.hex.toUpperCase()}
                    {c.stitchCount != null ? ` · ${c.stitchCount.toLocaleString()} cells` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pattern name */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 6 }}>Pattern name (used in filename)</p>
          <input
            type="text"
            value={patternName}
            onChange={e => setPatternName(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
          />
        </div>

        {/* Printing tips */}
        <div style={{ width: '100%', maxWidth: 400, background: '#FFF8F0', borderRadius: 16, padding: '16px 18px', border: '1px solid #F0E4D0' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#C4614A', marginBottom: 8 }}>🖨️ Printing tips</p>
          {[
            'Switch to Print View and download — this gives you the clean numbered template.',
            'Print on regular paper (A4/Letter) or card stock for a stiffer surface.',
            'Use the colour key to match paint or pencil colours to each number.',
            'Zoom in on your phone to paint section by section without printing.',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 3 ? 6 : 0 }}>
              <span style={{ color: '#C4614A', fontSize: 13, flexShrink: 0 }}>·</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.6 }}>{tip}</p>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ width: '100%', maxWidth: 400, background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}

      </section>

      {/* Bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to bottom, transparent, #FAF6EF 35%)', padding: '16px 20px max(24px, env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!isUnlocked() && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', textAlign: 'center' }}>
              🔒 Unlock to download your pattern
            </p>
          )}
          <button
            onClick={handleDownloadPng}
            disabled={busy}
            style={{
              width: '100%', padding: '15px',
              background: busy ? '#E4D9C8' : '#C4614A',
              color: busy ? '#B8AAA0' : 'white',
              border: 'none', borderRadius: 14,
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: busy ? 'none' : '0 4px 20px rgba(196,97,74,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {status === 'loading-png' ? (
              <><span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'pbn-spin 0.8s linear infinite', display: 'inline-block' }} /> Saving…</>
            ) : status === 'done-png' ? `✅ ${viewMode === 'print' ? 'Template' : 'Preview'} Saved`
              : `⬇ Download ${viewMode === 'print' ? 'Print Template' : 'Colour Preview'}`}
          </button>
        </div>
      </div>

      <style>{`@keyframes pbn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
