'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import ZoomableCanvas from '@/components/preview/ZoomableCanvas'
import { getTracked, updateProgress, TrackedPattern } from '@/lib/patternTracker'
import DiscountClubCard from '@/components/ui/DiscountClubCard'
import { generateInstructions, RowInstruction } from '@/modules/instructions/generateInstructions'
import { PatternData, StitchStyle } from '@/types/pattern'

// ── Convert TrackedPattern → minimal PatternData for generateInstructions ─────

function toPatternData(p: TrackedPattern): PatternData {
  const traversalOrder = p.meta.stitchStyle === 'c2c' ? 'diagonal' as const : 'rowByRow' as const
  return {
    grid: p.colorMap.map(row =>
      row.map(idx => ({ colorIndex: idx, symbol: p.palette[idx]?.symbol ?? '■' }))
    ),
    palette: p.palette.map(e => ({
      hex: e.hex, r: 0, g: 0, b: 0, symbol: e.symbol, label: e.label,
    })),
    meta: {
      width:          p.meta.width,
      height:         p.meta.height,
      colorCount:     p.palette.length,
      stitchStyle:    p.meta.stitchStyle,
      traversalOrder,
      totalStitches:  p.meta.width * p.meta.height,
      generatedAt:    '',
    },
  }
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

function drawTrackerGrid(
  canvas: HTMLCanvasElement,
  pattern: TrackedPattern,
  currentStep: number,
  completedSet: Set<number>,
) {
  const { colorMap, palette, meta } = pattern
  const cellSize = Math.max(4, Math.min(20, Math.floor(320 / meta.width)))
  const stride   = cellSize + 1

  canvas.width  = meta.width  * stride
  canvas.height = meta.height * stride

  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let row = 0; row < meta.height; row++) {
    for (let col = 0; col < meta.width; col++) {
      const idx = colorMap[row]?.[col] ?? 0
      ctx.fillStyle = palette[idx]?.hex ?? '#cccccc'
      ctx.fillRect(col * stride, row * stride, cellSize, cellSize)
    }
  }

  // Fade completed rows
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)'
  for (const step of completedSet) {
    if (step < meta.height) ctx.fillRect(0, step * stride, canvas.width, cellSize)
  }

  // Highlight current row (for non-c2c, maps 1:1 to grid rows)
  const highlightRow = Math.min(currentStep, meta.height - 1)
  if (highlightRow >= 0) {
    ctx.fillStyle = 'rgba(196, 97, 74, 0.22)'
    ctx.fillRect(0, highlightRow * stride, canvas.width, cellSize)
    ctx.fillStyle = '#C4614A'
    ctx.fillRect(0, highlightRow * stride, 4, cellSize)
  }
}

// ── Style-specific badges ─────────────────────────────────────────────────────

function DirectionBadge({ instr, style }: { instr: RowInstruction; style: StitchStyle }) {
  if (style === 'c2c') {
    const phase = instr.phase
    if (!phase) return null
    const map = {
      growing:    { label: '↗ Growing',    bg: 'rgba(74,144,80,0.10)',   text: '#4A9050' },
      peak:       { label: '→ Peak',       bg: 'rgba(196,97,74,0.10)',   text: '#C4614A' },
      decreasing: { label: '↘ Decreasing', bg: 'rgba(180,83,9,0.10)',    text: '#b45309' },
    }
    const m = map[phase]
    return (
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, background: m.bg, color: m.text, borderRadius: 999, padding: '2px 8px' }}>
        {m.label}
      </span>
    )
  }
  if (instr.side) {
    const isRS = instr.side === 'RS'
    return (
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, background: isRS ? 'rgba(196,97,74,0.10)' : 'rgba(44,34,24,0.07)', color: isRS ? '#C4614A' : '#6B5744', borderRadius: 999, padding: '2px 8px' }}>
        {isRS ? '→ RS' : '← WS'} {instr.direction === 'rtl' ? '(right→left)' : '(left→right)'}
      </span>
    )
  }
  return null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrackerPage() {
  const params = useParams()
  const router = useRouter()
  const id     = typeof params.id === 'string' ? params.id : ''

  const [pattern,       setPattern]       = useState<TrackedPattern | null>(null)
  const [completedRows, setCompletedRows] = useState<Set<number>>(new Set())
  const [currentStep,   setCurrentStep]   = useState(0)
  const [showList,      setShowList]      = useState(false)

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const p = getTracked(id)
    if (!p) { router.replace('/track'); return }
    setPattern(p)
    setCompletedRows(new Set(p.progress.completedRows))
    setCurrentStep(p.progress.currentRow)
  }, [id, router])

  // Build style-aware instructions once
  const instructions = useMemo<RowInstruction[]>(() => {
    if (!pattern) return []
    return generateInstructions(toPatternData(pattern))
  }, [pattern])

  const totalSteps = instructions.length || (pattern?.meta.height ?? 0)

  // For the canvas: map instruction index to grid row
  // C2C diagonals don't map 1:1 to grid rows, so we highlight the
  // nearest grid row as an approximation
  const canvasHighlightRow = useMemo(() => {
    if (!pattern) return 0
    if (pattern.meta.stitchStyle !== 'c2c') return currentStep
    // C2C: map diagonal index to approximate grid row
    return Math.round((currentStep / totalSteps) * (pattern.meta.height - 1))
  }, [pattern, currentStep, totalSteps])

  useEffect(() => {
    if (!pattern || !canvasRef.current) return
    drawTrackerGrid(canvasRef.current, pattern, canvasHighlightRow, completedRows)
  }, [pattern, canvasHighlightRow, completedRows])

  useEffect(() => {
    if (!pattern || !containerRef.current) return
    const cellSize = Math.max(4, Math.min(20, Math.floor(320 / pattern.meta.width)))
    const stride   = cellSize + 1
    const el = containerRef.current
    el.scrollTop = Math.max(0, canvasHighlightRow * stride - el.clientHeight / 2)
  }, [pattern, canvasHighlightRow])

  const persistProgress = useCallback((completed: Set<number>, cur: number) => {
    if (!pattern) return
    updateProgress(pattern.id, Array.from(completed).sort((a, b) => a - b), cur)
  }, [pattern])

  function markDoneAndNext() {
    if (!pattern) return
    const next = new Set(completedRows)
    next.add(currentStep)
    let nextStep = currentStep + 1
    while (nextStep < totalSteps && next.has(nextStep)) nextStep++
    if (nextStep >= totalSteps) nextStep = currentStep
    setCompletedRows(next)
    setCurrentStep(nextStep)
    persistProgress(next, nextStep)
  }

  function prevStep() {
    if (!pattern || currentStep === 0) return
    const prevS = Math.max(0, currentStep - 1)
    setCurrentStep(prevS)
    persistProgress(completedRows, prevS)
  }

  function jumpToStep(step: number) {
    setCurrentStep(step)
    setShowList(false)
    persistProgress(completedRows, step)
  }

  function toggleStepDone(step: number) {
    const next = new Set(completedRows)
    if (next.has(step)) next.delete(step)
    else next.add(step)
    setCompletedRows(next)
    persistProgress(next, currentStep)
  }

  if (!pattern) {
    return (
      <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </main>
    )
  }

  const doneCount  = completedRows.size
  const pct        = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0
  const isComplete = doneCount >= totalSteps
  const stepIsDone = completedRows.has(currentStep)
  const instr      = instructions[currentStep]
  const isC2C      = pattern.meta.stitchStyle === 'c2c'
  const stepLabel  = instr?.label ?? `Row ${currentStep + 1}`

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 180px' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2C2218', marginBottom: 2 }}>
                {pattern.name}
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
                {pattern.meta.width}×{pattern.meta.height} · {pattern.meta.stitchStyle}
                {isC2C && ` · ${totalSteps} diagonals`}
              </p>
            </div>
            {isComplete && (
              <div style={{ background: 'rgba(74,144,80,0.10)', border: '1.5px solid rgba(74,144,80,0.3)', borderRadius: 999, padding: '4px 12px' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#4A9050' }}>✓ Complete!</span>
              </div>
            )}
          </div>

          <div style={{ height: 6, background: '#EDE4D8', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: isComplete ? '#4A9050' : '#C4614A', borderRadius: 999, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>
              <strong>{doneCount}</strong> of {totalSteps} {isC2C ? 'diagonals' : 'rows'} done
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: isComplete ? '#4A9050' : '#C4614A' }}>
              {pct}%
            </p>
          </div>
        </div>

        {/* ── Grid / List toggle ───────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 12, display: 'flex' }}>
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setShowList(v === 'list')} style={{
              flex: 1, padding: '8px',
              background: (showList ? 'list' : 'grid') === v ? '#C4614A' : 'white',
              color:      (showList ? 'list' : 'grid') === v ? 'white' : '#6B5744',
              border: '1.5px solid #EDE4D8',
              borderRadius: v === 'grid' ? '10px 0 0 10px' : '0 10px 10px 0',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {v === 'grid' ? '⊞ Grid' : '☰ ' + (isC2C ? 'Diagonals' : 'Rows')}
            </button>
          ))}
        </div>

        {/* ── Grid view ───────────────────────────────────────────────────── */}
        {!showList && (
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div ref={containerRef} style={{ maxHeight: '50vh', overflow: 'auto' }}>
              <ZoomableCanvas canvasRef={canvasRef} showRowHint={true} />
            </div>

            {/* Current step info */}
            {instr && (
              <div style={{ width: '100%', background: 'white', borderRadius: 16, border: '1.5px solid #EDE4D8', padding: '12px 14px', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: stepIsDone ? '#4A9050' : '#C4614A' }}>
                      {stepIsDone ? '✓' : '→'} {stepLabel}
                    </p>
                    <DirectionBadge instr={instr} style={pattern.meta.stitchStyle} />
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
                    {instr.totalStitches} {isC2C ? 'blocks' : 'sts'} · {instr.colorChanges} colour change{instr.colorChanges !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Run-length colour guide */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: instr.carriedColors?.length ? 8 : 0 }}>
                  {instr.runs.map((run, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FAF6EF', borderRadius: 999, padding: '4px 10px' }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: run.hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744' }}>
                        {run.symbol} × {run.count}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tapestry: carried colours */}
                {instr.carriedColors && instr.carriedColors.length > 0 && (
                  <div style={{ background: 'rgba(196,97,74,0.06)', borderRadius: 8, padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#C4614A' }}>CARRY:</span>
                    {instr.carriedColors.map((hex, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: hex, border: '1px solid rgba(0,0,0,0.1)' }} />
                      </div>
                    ))}
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>carry behind throughout row</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Row/Diagonal list view ───────────────────────────────────────── */}
        {showList && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 18, border: '1.5px solid #EDE4D8', overflow: 'hidden' }}>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {instructions.map((instr, step) => {
                const isDone    = completedRows.has(step)
                const isCurrent = step === currentStep
                return (
                  <div
                    key={step}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      borderBottom: '1px solid #F2EAD8',
                      background: isCurrent ? 'rgba(196,97,74,0.06)' : 'transparent',
                      borderLeft: `3px solid ${isCurrent ? '#C4614A' : isDone ? '#4A9050' : 'transparent'}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => jumpToStep(step)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); toggleStepDone(step) }}
                      style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        background: isDone ? '#4A9050' : 'transparent',
                        border: `2px solid ${isDone ? '#4A9050' : isCurrent ? '#C4614A' : '#D4C9B8'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0,
                      }}
                    >
                      {isDone && <span style={{ fontSize: 11, color: 'white', fontWeight: 700 }}>✓</span>}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isDone ? '#B8AAA0' : '#2C2218', textDecoration: isDone ? 'line-through' : 'none' }}>
                          {instr.label}
                        </p>
                        {isCurrent && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#C4614A', fontWeight: 700 }}>← now</span>}
                        {instr.phase && (
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#9A8878' }}>
                            {instr.phase === 'growing' ? '↗' : instr.phase === 'decreasing' ? '↘' : '→'}
                          </span>
                        )}
                        {instr.side && (
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#B8AAA0' }}>{instr.side}</span>
                        )}
                      </div>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>
                        {instr.totalStitches} {isC2C ? 'blocks' : 'sts'}
                        {instr.carriedColors?.length ? ` · carry ${instr.carriedColors.length}` : ''}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {instr.runs.slice(0, 5).map((r, i) => (
                        <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: r.hex, border: '1px solid rgba(0,0,0,0.08)' }} />
                      ))}
                      {instr.runs.length > 5 && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#C8BFB0' }}>+{instr.runs.length - 5}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Colour key */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, border: '1.5px solid #EDE4D8', padding: '12px 14px', marginTop: 12 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Colour key
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pattern.palette.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: c.hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744' }}>
                  {c.symbol}{c.label ? ` · ${c.label}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Discount Club — shown on completion ─────────────────────────── */}
        {isComplete && (
          <div style={{ width: '100%', maxWidth: 400, marginTop: 16 }}>
            <DiscountClubCard
              saveLink={typeof window !== 'undefined' ? window.location.href : ''}
              linkLabel="progress"
            />
          </div>
        )}

      </div>

      {/* ── Sticky action bar ─────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        padding: '12px 20px max(20px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, #FAF6EF 72%, transparent)',
        zIndex: 50,
      }}>
        {isComplete ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: '#4A9050', marginBottom: 8 }}>
              🎉 All {isC2C ? 'diagonals' : 'rows'} complete!
            </p>
            <button onClick={() => router.push('/track')} style={{ padding: '13px 32px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              ← Back to my patterns
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                style={{
                  padding: '13px',
                  background: 'white', color: currentStep === 0 ? '#C8BFB0' : '#6B5744',
                  border: `1.5px solid ${currentStep === 0 ? '#EDE4D8' : '#D4C9B8'}`,
                  borderRadius: 12,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                  cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Prev
              </button>
              <button
                onClick={stepIsDone ? () => jumpToStep(currentStep + 1) : markDoneAndNext}
                style={{
                  padding: '13px',
                  background: '#C4614A', color: 'white',
                  border: 'none', borderRadius: 12,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(196,97,74,0.28)',
                }}
              >
                {stepIsDone ? `Next ${isC2C ? 'diagonal' : 'row'} →` : `✓ Done — next ${isC2C ? 'diagonal' : 'row'} →`}
              </button>
            </div>
            <button onClick={() => router.push('/track')} style={{ width: '100%', marginTop: 6, background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#B8AAA0', cursor: 'pointer' }}>
              ← All patterns
            </button>
          </>
        )}
      </div>
    </main>
  )
}
