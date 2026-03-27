'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDiamondPainting } from '@/context/DiamondPaintingContext'
import { PatternData } from '@/types/pattern'
import { removeColorFromPattern } from '@/lib/removeColor'
import { useRowProgress } from '@/hooks/useRowProgress'
import RowInstructions from '@/components/preview/RowInstructions'
import ZoomableCanvas  from '@/components/preview/ZoomableCanvas'
import { matchToDmc, canvasSizeCm, canvasSizeInches, shoppingTotals } from '@/modules/diamond/dmcMatcher'
import { logEvent } from '@/lib/log'
import { isUnlocked } from '@/lib/unlock'

type Status = 'idle' | 'loading-png' | 'done-png' | 'error'

// ── Canvas renderer for diamond patterns ──────────────────────────────────────

function drawDiamondCanvas(
  canvas:    HTMLCanvasElement,
  grid:      { colorIndex: number }[][],
  palette:   { hex: string }[],
  drillType: 'round' | 'square',
  cellSize:  number,
) {
  const rows = grid.length
  const cols = rows > 0 ? grid[0].length : 0
  canvas.width  = cols * cellSize
  canvas.height = rows * cellSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#F0EAE0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const gap     = Math.max(1, Math.floor(cellSize * 0.08))
  const radius  = (cellSize - gap * 2) / 2
  const inset   = gap

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell   = grid[r][c]
      const color  = palette[cell.colorIndex]?.hex ?? '#cccccc'
      const x      = c * cellSize
      const y      = r * cellSize
      ctx.fillStyle = color

      if (drillType === 'round') {
        ctx.beginPath()
        ctx.arc(x + cellSize / 2, y + cellSize / 2, radius, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2)
      }
    }
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DiamondPaintingExportPage() {
  const router = useRouter()
  const { state, dispatch } = useDiamondPainting()
  const { patternData, settings } = state

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const cellSizeRef = useRef(8)

  const [status,      setStatus]      = useState<Status>('idle')
  const [error,       setError]       = useState<string | null>(null)
  const [patternName, setPatternName] = useState('My Diamond Painting')

  // Working copy — user can remove colours without re-generating
  const [workingPattern, setWorkingPattern] = useState<PatternData | null>(null)
  useEffect(() => { setWorkingPattern(patternData ?? null) }, [patternData])
  const removeColor = useCallback((idx: number) => {
    setWorkingPattern(prev => prev ? removeColorFromPattern(prev, idx) : prev)
  }, [])
  const activePattern = workingPattern ?? patternData

  // ── Row tracker ────────────────────────────────────────────────────────────
  const patternKey = useMemo(() => {
    if (!patternData) return ''
    const { width, height, colorCount, generatedAt } = patternData.meta
    return `diamondpainting_${width}x${height}_c${colorCount}_${generatedAt}`
  }, [patternData])

  const patternLabel = useMemo(() => {
    if (!patternData) return ''
    const { width, height } = patternData.meta
    return `${width}×${height} Diamond Painting`
  }, [patternData])

  const { completedRows, toggleRow: handleToggleRow, resetProgress: handleResetProgress } = useRowProgress(patternKey)
  const totalRows = patternData?.meta.height ?? 0

  const currentRowNumber = useMemo(() => {
    for (let i = 1; i <= totalRows; i++) {
      if (!completedRows.has(i)) return i
    }
    return totalRows + 1
  }, [completedRows, totalRows])

  const highlightGridRow = useMemo(() => {
    if (totalRows === 0 || currentRowNumber > totalRows) return undefined
    return totalRows - currentRowNumber
  }, [totalRows, currentRowNumber])

  // ── DMC matches ────────────────────────────────────────────────────────────
  const dmcMatches = useMemo(() => {
    if (!activePattern) return []
    return matchToDmc(activePattern.palette)
  }, [activePattern])

  const totals = useMemo(() => shoppingTotals(dmcMatches), [dmcMatches])

  // ── Canvas size ────────────────────────────────────────────────────────────
  const cm  = useMemo(() => activePattern ? canvasSizeCm(activePattern.meta.width, activePattern.meta.height) : { w: 0, h: 0 }, [activePattern])
  const ins = useMemo(() => activePattern ? canvasSizeInches(activePattern.meta.width, activePattern.meta.height) : { w: '0', h: '0' }, [activePattern])

  // ── Redirect if no pattern ─────────────────────────────────────────────────
  useEffect(() => {
    if (!patternData) router.replace('/diamondpainting')
  }, [patternData, router])

  // ── Draw canvas ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activePattern || !canvasRef.current) return
    const cs = Math.max(4, Math.min(12, Math.floor(360 / Math.max(activePattern.meta.width, activePattern.meta.height))))
    cellSizeRef.current = cs
    drawDiamondCanvas(canvasRef.current, activePattern.grid, activePattern.palette, settings.drillType, cs)

    // Row highlight overlay
    if (highlightGridRow !== undefined) {
      const canvas = canvasRef.current
      const ctx    = canvas.getContext('2d')
      if (ctx) {
        ctx.save()
        ctx.fillStyle = 'rgba(196,97,74,0.18)'
        ctx.fillRect(0, highlightGridRow * cs, canvas.width, cs)
        ctx.restore()
      }
    }
  }, [activePattern, settings.drillType, highlightGridRow])

  if (!patternData) return null

  const { meta, palette } = activePattern ?? patternData

  function handleDownloadPng() {
    if (!isUnlocked()) { router.push('/unlock?return=/diamondpainting/export'); return }
    if (!canvasRef.current) return
    logEvent('EXPORT_TRIGGERED', 'diamondpainting-png')
    setStatus('loading-png')
    try {
      canvasRef.current.toBlob(blob => {
        if (!blob) { setError('Could not save image.'); setStatus('error'); return }
        const url  = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href     = url
        link.download = `${patternName.replace(/\s+/g, '-').toLowerCase()}.png`
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
        <button onClick={() => router.push('/diamondpainting/settings')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}>
          ← Settings
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Your Chart</p>
        <button onClick={() => { dispatch({ type: 'RESET' }); router.push('/diamondpainting') }}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', fontWeight: 600, cursor: 'pointer' }}>
          New +
        </button>
      </div>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 160px', gap: 16 }}>

        {/* Stats */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', gap: 8 }}>
          {[
            [meta.width + '×' + meta.height,               'Diamonds'],
            [meta.colorCount + '',                          'Colours'],
            [meta.totalStitches.toLocaleString(),           'Total'],
          ].map(([val, label]) => (
            <div key={label} style={{ flex: 1, background: 'white', borderRadius: 12, padding: '10px 12px', textAlign: 'center', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#2C2218' }}>{val}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Canvas size + drill type */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'rgba(196,97,74,0.06)', border: '1px solid #EDE4D8', borderRadius: 14, padding: '12px 14px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>
              📐 <strong style={{ color: '#2C2218' }}>{cm.w}cm × {cm.h}cm</strong>
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 2 }}>
              {ins.w}&quot; × {ins.h}&quot; at 2.5mm/diamond
            </p>
          </div>
          <div style={{ background: 'white', border: '1px solid #EDE4D8', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{settings.drillType === 'round' ? '🔵' : '🔷'}</span>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, color: '#2C2218' }}>
                {settings.drillType === 'round' ? 'Round' : 'Square'}
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>Drills</p>
            </div>
          </div>
        </div>

        {/* Pattern canvas */}
        <ZoomableCanvas
          canvasRef={canvasRef}
          label={`Chart preview · ${settings.drillType === 'round' ? 'round' : 'square'} drills shown`}
          showRowHint={highlightGridRow !== undefined}
        />

        {/* Pattern name input */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <input
            value={patternName}
            onChange={e => setPatternName(e.target.value)}
            placeholder="Pattern name"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
          />
        </div>

        {/* ── Colour palette editor ───────────────────────────────────── */}
        {workingPattern && workingPattern.palette.length > 0 && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Colours
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                {workingPattern.palette.length} found · tap × to remove
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {workingPattern.palette.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FAF6EF', borderRadius: 999, padding: '5px 10px 5px 6px', border: '1px solid #EDE4D8' }}>
                  <span style={{ width: 16, height: 16, borderRadius: settings.drillType === 'round' ? '50%' : 4, background: entry.hex, border: '1.5px solid rgba(0,0,0,0.1)', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', fontWeight: 500 }}>
                    {(entry.stitchCount ?? 0).toLocaleString()}
                  </span>
                  {workingPattern.palette.length > 1 && (
                    <button onClick={() => removeColor(i)} style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(44,34,24,0.08)', border: 'none', fontFamily: 'monospace', fontSize: 10, color: '#9A8878', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 10 }}>
              Removing a colour merges those diamonds into the nearest remaining colour.
            </p>
          </div>
        )}

        {/* DMC Colour Legend */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            DMC Colour Legend
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dmcMatches.map((match, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Swatch */}
                <div style={{
                  width: 32, height: 32, flexShrink: 0,
                  background: palette[match.colorIndex].hex,
                  borderRadius: settings.drillType === 'round' ? '50%' : 6,
                  border: '1.5px solid rgba(0,0,0,0.1)',
                }} />
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218' }}>
                      DMC {match.dmc.code}
                    </span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                      {match.dmc.name}
                    </span>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', marginTop: 2 }}>
                    {match.stitchCount.toLocaleString()} diamonds · {match.bagsNeeded} bag{match.bagsNeeded !== 1 ? 's' : ''}
                  </p>
                </div>
                {/* Symbol */}
                <span style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: 6,
                  background: '#F5F0E8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'monospace', fontSize: 12, color: '#6B5744', fontWeight: 700,
                }}>
                  {palette[match.colorIndex].symbol}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Shopping summary */}
        <div style={{ width: '100%', maxWidth: 400, background: '#2C2218', borderRadius: 16, padding: '18px 20px' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Shopping Summary
          </p>
          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: 'white' }}>
                {totals.totalDiamonds.toLocaleString()}
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>total diamonds</p>
            </div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#C4614A' }}>
                {totals.totalBags}
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>total bags</p>
            </div>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            Already includes a 15% buffer per colour. Order 1 extra bag of any colour you plan to re-use or that has very thin lines.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
            Standard bags hold ~200 diamonds · prices vary by supplier
          </p>
        </div>

        {/* Kit sourcing notice */}
        <div style={{ width: '100%', maxWidth: 400, background: '#FFF8F0', borderRadius: 16, padding: '16px 18px', border: '1px solid #F0E4D0' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#C4614A', marginBottom: 6 }}>
            💎 About physical kits
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.7, marginBottom: 8 }}>
            This chart shows exactly what your finished diamond painting would look like. We&apos;re actively working on partnering with a supplier so you can order a full kit — printed canvas, diamonds, and tools — directly through EasyStitch.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.7, marginBottom: 8 }}>
            For now, most custom kit companies convert from your original photo themselves and don&apos;t accept external pattern files — so this chart is best used as a preview and reference while you source your own diamonds using the shopping list above.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', lineHeight: 1.6 }}>
            Individual diamond bags by DMC code are available from Amazon, Etsy sellers, and dedicated diamond painting suppliers — the codes and counts above are all you need.
          </p>
        </div>

        {/* Row tracker */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Row tracker
          </p>
          <RowInstructions
            pattern={patternData}
            completedRows={completedRows}
            onToggleRow={handleToggleRow}
            onResetProgress={handleResetProgress}
            currentRowNumber={currentRowNumber}
            patternLabel={patternLabel}
          />
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
              🔒 Unlock to save your chart and shopping list
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
            {busy ? (
              <>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'dp-spin 0.8s linear infinite', display: 'inline-block' }} />
                Saving…
              </>
            ) : isUnlocked() ? (
              '💾 Save Chart PNG →'
            ) : (
              '🔓 Unlock to Save — $2 →'
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes dp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
