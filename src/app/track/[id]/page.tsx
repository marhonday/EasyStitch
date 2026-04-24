'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import ZoomableCanvas from '@/components/preview/ZoomableCanvas'
import {
  getTracked, updateProgress, markEmailSaved, TrackedPattern,
} from '@/lib/patternTracker'
import DiscountClubCard from '@/components/ui/DiscountClubCard'
import { generateInstructions, RowInstruction } from '@/modules/instructions/generateInstructions'
import { PatternData, StitchStyle } from '@/types/pattern'

const FORMSPREE_ID = 'mykbzdae'

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

  if (pattern.meta.stitchStyle === 'c2c') {
    // Fade completed diagonals: every cell where row + col === step
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)'
    for (const step of completedSet) {
      for (let row = 0; row < meta.height; row++) {
        const col = step - row
        if (col >= 0 && col < meta.width) {
          ctx.fillRect(col * stride, row * stride, cellSize, cellSize)
        }
      }
    }

    // Highlight current diagonal
    const maxDiag = meta.width + meta.height - 2
    const d = Math.min(currentStep, maxDiag)
    ctx.fillStyle = 'rgba(196, 97, 74, 0.35)'
    for (let row = 0; row < meta.height; row++) {
      const col = d - row
      if (col >= 0 && col < meta.width) {
        ctx.fillRect(col * stride, row * stride, cellSize, cellSize)
      }
    }
    // Left-edge accent on the topmost cell of the diagonal
    const accentRow = Math.max(0, d - (meta.width - 1))
    const accentCol = d - accentRow
    if (accentCol >= 0 && accentCol < meta.width) {
      ctx.fillStyle = '#C4614A'
      ctx.fillRect(accentCol * stride, accentRow * stride, 3, cellSize)
    }
  } else {
    // Single Crochet: fade completed rows
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)'
    for (const step of completedSet) {
      if (step < meta.height) ctx.fillRect(0, step * stride, canvas.width, cellSize)
    }

    // Highlight current row
    const highlightRow = Math.min(currentStep, meta.height - 1)
    if (highlightRow >= 0) {
      ctx.fillStyle = 'rgba(196, 97, 74, 0.22)'
      ctx.fillRect(0, highlightRow * stride, canvas.width, cellSize)
      ctx.fillStyle = '#C4614A'
      ctx.fillRect(0, highlightRow * stride, 4, cellSize)
    }
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
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const id           = typeof params.id === 'string' ? params.id : ''

  // ── Core state ──────────────────────────────────────────────────────────────
  const [pattern,         setPattern]         = useState<TrackedPattern | null>(null)
  const [completedRows,   setCompletedRows]   = useState<Set<number>>(new Set())
  const [currentStep,     setCurrentStep]     = useState(0)
  const [lastCompleted,   setLastCompleted]   = useState<number | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  // ── Mobile UI state ─────────────────────────────────────────────────────────
  const [showRowList,   setShowRowList]   = useState(false)

  // ── Desktop state ────────────────────────────────────────────────────────────
  const [isDesktop,     setIsDesktop]     = useState(false)
  const [hoveredStep,   setHoveredStep]   = useState<number | null>(null)
  const [stripExpanded, setStripExpanded] = useState(false)

  // ── Email prompt state ───────────────────────────────────────────────────────
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [emailInput,      setEmailInput]      = useState('')
  const [emailStatus,     setEmailStatus]     = useState<'idle' | 'sending' | 'sent'>('idle')

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const containerRef    = useRef<HTMLDivElement>(null)   // mobile grid container
  const rightPanelRef   = useRef<HTMLDivElement>(null)   // desktop right panel
  const rowItemRefs     = useRef<(HTMLDivElement | null)[]>([])
  const prevCompleteRef = useRef(false)

  // ── Responsive breakpoint ────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Load pattern + URL row restore ──────────────────────────────────────────
  useEffect(() => {
    const p = getTracked(id)
    if (!p) { router.replace('/track'); return }

    // URL row restore: ?row=N
    const rowParam = searchParams.get('row')
    if (rowParam !== null) {
      const restoreRow = parseInt(rowParam, 10)
      if (!isNaN(restoreRow) && restoreRow >= 0) {
        updateProgress(id, p.progress.completedRows, restoreRow)
        p.progress.currentRow = restoreRow
      }
    }

    setPattern(p)
    setCompletedRows(new Set(p.progress.completedRows))
    setCurrentStep(p.progress.currentRow)
  }, [id, router, searchParams])

  // ── Build instructions ───────────────────────────────────────────────────────
  const instructions = useMemo<RowInstruction[]>(() => {
    if (!pattern) return []
    return generateInstructions(toPatternData(pattern))
  }, [pattern])

  const totalSteps = instructions.length || (pattern?.meta.height ?? 0)

  // ── Canvas highlight row ─────────────────────────────────────────────────────
  const canvasHighlightRow = useMemo(() => {
    if (!pattern) return 0
    if (pattern.meta.stitchStyle !== 'c2c') return currentStep
    return Math.round((currentStep / totalSteps) * (pattern.meta.height - 1))
  }, [pattern, currentStep, totalSteps])

  // Desktop: hovered row in right panel drives canvas highlight
  const displayHighlightRow = useMemo(() => {
    if (hoveredStep !== null && isDesktop) {
      if (pattern?.meta.stitchStyle === 'c2c') {
        return Math.round((hoveredStep / totalSteps) * ((pattern?.meta.height ?? 1) - 1))
      }
      return hoveredStep
    }
    return canvasHighlightRow
  }, [hoveredStep, isDesktop, canvasHighlightRow, pattern, totalSteps])

  // ── Draw canvas ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pattern || !canvasRef.current) return
    drawTrackerGrid(canvasRef.current, pattern, displayHighlightRow, completedRows)
  }, [pattern, displayHighlightRow, completedRows])

  // ── Mobile: auto-scroll canvas to current row ────────────────────────────────
  useEffect(() => {
    if (isDesktop || !pattern || !containerRef.current) return
    const cellSize = Math.max(4, Math.min(20, Math.floor(320 / pattern.meta.width)))
    const stride   = cellSize + 1
    const el = containerRef.current
    el.scrollTop = Math.max(0, canvasHighlightRow * stride - el.clientHeight / 2)
  }, [pattern, canvasHighlightRow, isDesktop])

  // ── Desktop: auto-scroll right panel to current row ──────────────────────────
  useEffect(() => {
    if (!isDesktop) return
    const el = rowItemRefs.current[currentStep]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentStep, isDesktop])

  // ── Desktop: IntersectionObserver — right panel scroll drives grid highlight ─
  useEffect(() => {
    if (!isDesktop || instructions.length === 0) return
    const observer = new IntersectionObserver(entries => {
      let mostVisible: { idx: number; ratio: number } | null = null
      entries.forEach(entry => {
        const idx = rowItemRefs.current.indexOf(entry.target as HTMLDivElement)
        if (idx >= 0 && entry.intersectionRatio > (mostVisible?.ratio ?? 0)) {
          mostVisible = { idx, ratio: entry.intersectionRatio }
        }
      })
      if (mostVisible) setHoveredStep((mostVisible as { idx: number }).idx)
    }, { threshold: [0, 0.5, 1], root: rightPanelRef.current })

    rowItemRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [isDesktop, instructions.length])

  // ── Persist progress ─────────────────────────────────────────────────────────
  const persistProgress = useCallback((completed: Set<number>, cur: number) => {
    if (!pattern) return
    updateProgress(pattern.id, Array.from(completed).sort((a, b) => a - b), cur)
  }, [pattern])

  // ── Celebration trigger ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!pattern) return
    const nowComplete = completedRows.size >= totalSteps && totalSteps > 0
    if (nowComplete && !prevCompleteRef.current) {
      setLastCompleted(currentStep)
      setShowCelebration(true)
    }
    prevCompleteRef.current = nowComplete
  }, [completedRows, totalSteps, pattern, currentStep])

  // ── Email prompt — show after first row completed ────────────────────────────
  useEffect(() => {
    if (!pattern || pattern.emailSaved) return
    if (completedRows.size === 1) {
      const t = setTimeout(() => setShowEmailPrompt(true), 1000)
      return () => clearTimeout(t)
    }
  }, [completedRows.size, pattern])

  // ── Core actions ─────────────────────────────────────────────────────────────
  function markDoneAndNext() {
    if (!pattern) return
    const next = new Set(completedRows)
    next.add(currentStep)
    setLastCompleted(currentStep)
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
    setShowRowList(false)
    persistProgress(completedRows, step)
  }

  function toggleStepDone(step: number) {
    const next = new Set(completedRows)
    if (next.has(step)) next.delete(step)
    else next.add(step)
    setCompletedRows(next)
    persistProgress(next, currentStep)
  }

  // ── Email submit ─────────────────────────────────────────────────────────────
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pattern || !emailInput.trim()) return
    setEmailStatus('sending')
    const base = typeof window !== 'undefined' ? window.location.href.split('?')[0] : ''
    const restoreLink = `${base}?row=${currentStep}`
    try {
      await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email:        emailInput.trim(),
          pattern_id:   pattern.id,
          pattern_name: pattern.name,
          current_row:  currentStep + 1,
          restore_link: restoreLink,
        }),
      })
      setEmailStatus('sent')
      markEmailSaved(pattern.id)
      setPattern(prev => prev ? { ...prev, emailSaved: true } : prev)
      setTimeout(() => setShowEmailPrompt(false), 1800)
    } catch {
      setEmailStatus('idle')
    }
  }

  function dismissEmailPrompt() {
    if (!pattern) return
    markEmailSaved(pattern.id)
    setPattern(prev => prev ? { ...prev, emailSaved: true } : prev)
    setShowEmailPrompt(false)
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (!pattern) {
    return (
      <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </main>
    )
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const doneCount  = completedRows.size
  const pct        = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0
  const isComplete = doneCount >= totalSteps
  const stepIsDone = completedRows.has(currentStep)
  const instr      = instructions[currentStep]
  const isC2C      = pattern.meta.stitchStyle === 'c2c'
  const stepLabel  = instr?.label ?? `Row ${currentStep + 1}`
  const noun       = isC2C ? 'diagonal' : 'row'

  // Inline compact description of a row for the desktop bottom strip
  function rowSummary(step: number) {
    const r = instructions[step]
    if (!r) return ''
    const runs = r.runs.slice(0, 4).map(run => `${run.count} ${run.symbol}`).join(', ')
    return `${r.label} (${r.totalStitches} sts): ${runs}${r.runs.length > 4 ? '…' : ''}`
  }

  // ── Progress header (shared mobile + desktop) ────────────────────────────────
  function ProgressHeader() {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2C2218', marginBottom: 2 }}>
              {pattern!.name}
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
              {pattern!.meta.width}×{pattern!.meta.height} · {pattern!.meta.stitchStyle}
              {isC2C && ` · ${totalSteps} diagonals`}
            </p>
          </div>
          {isComplete && (
            <div style={{ background: 'rgba(74,144,80,0.10)', border: '1.5px solid rgba(74,144,80,0.3)', borderRadius: 999, padding: '4px 12px', flexShrink: 0 }}>
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
    )
  }

  // ── Current row instruction card ─────────────────────────────────────────────
  function CurrentRowCard({ compact = false }: { compact?: boolean }) {
    if (!instr) return null
    return (
      <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #EDE4D8', padding: compact ? '10px 12px' : '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: stepIsDone ? '#4A9050' : '#C4614A' }}>
              {stepIsDone ? '✓' : '→'} {stepLabel}
            </p>
            <DirectionBadge instr={instr} style={pattern!.meta.stitchStyle} />
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
            {instr.totalStitches} {isC2C ? 'blocks' : 'sts'} · {instr.colorChanges} colour change{instr.colorChanges !== 1 ? 's' : ''}
          </p>
        </div>
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
        {instr.carriedColors && instr.carriedColors.length > 0 && (
          <div style={{ background: 'rgba(196,97,74,0.06)', borderRadius: 8, padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#C4614A' }}>CARRY:</span>
            {instr.carriedColors.map((hex, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: hex, border: '1px solid rgba(0,0,0,0.1)' }} />
            ))}
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>carry behind throughout row</span>
          </div>
        )}
      </div>
    )
  }

  // ── Colour key ───────────────────────────────────────────────────────────────
  function ColourKey() {
    return (
      <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #EDE4D8', padding: '12px 14px', marginTop: 12 }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Colour key
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {pattern!.palette.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: c.hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744' }}>
                {c.symbol}{c.label ? ` · ${c.label}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Action buttons ────────────────────────────────────────────────────────────
  function ActionButtons({ fullWidth = true }: { fullWidth?: boolean }) {
    if (isComplete) return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: '#4A9050', marginBottom: 8 }}>
          🎉 All {isC2C ? 'diagonals' : 'rows'} complete!
        </p>
        <button onClick={() => router.push('/track')} style={{ padding: '13px 32px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ← Back to my patterns
        </button>
      </div>
    )
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, width: fullWidth ? '100%' : undefined }}>
        <button onClick={prevStep} disabled={currentStep === 0} style={{ padding: '13px', background: 'white', color: currentStep === 0 ? '#C8BFB0' : '#6B5744', border: `1.5px solid ${currentStep === 0 ? '#EDE4D8' : '#D4C9B8'}`, borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: currentStep === 0 ? 'not-allowed' : 'pointer' }}>
          ← Prev
        </button>
        <button onClick={stepIsDone ? () => jumpToStep(currentStep + 1) : markDoneAndNext} style={{ padding: '13px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,97,74,0.28)' }}>
          {stepIsDone ? `Next ${noun} →` : `✓ Done — next ${noun} →`}
        </button>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT (≥ 768px)
  // ════════════════════════════════════════════════════════════════════════════

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#FAF6EF', overflow: 'hidden' }}>
        <Header />

        {/* Two-panel body */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '65% 35%', overflow: 'hidden' }}>

          {/* ── Left panel: grid ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1.5px solid #EDE4D8' }}>

            {/* Progress header */}
            <div style={{ padding: '16px 24px 10px', flexShrink: 0 }}>
              <ProgressHeader />
            </div>

            {/* Grid — fills remaining height */}
            <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px' }}>
              <ZoomableCanvas canvasRef={canvasRef} showRowHint={true} />
            </div>

            {/* Bottom strip */}
            <div style={{
              flexShrink: 0,
              background: 'white',
              borderTop: '1.5px solid #EDE4D8',
              borderRadius: '16px 16px 0 0',
              padding: '12px 20px',
              boxShadow: '0 -4px 20px rgba(44,34,24,0.06)',
            }}>
              {/* Collapsed: 1-line summary + buttons */}
              {!stripExpanded && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button
                    onClick={() => setStripExpanded(true)}
                    style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218', fontWeight: 600 }}>
                      {rowSummary(currentStep)}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 2 }}>
                      Tap to see 5 rows ahead ↑
                    </p>
                  </button>
                  <div style={{ flexShrink: 0, minWidth: 260 }}>
                    <ActionButtons fullWidth={false} />
                  </div>
                </div>
              )}

              {/* Expanded: next 5 rows + close */}
              {stripExpanded && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Upcoming rows
                    </p>
                    <button onClick={() => setStripExpanded(false)} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', cursor: 'pointer' }}>
                      Collapse ↓
                    </button>
                  </div>
                  {[0, 1, 2, 3, 4].map(offset => {
                    const step = currentStep + offset
                    if (step >= totalSteps) return null
                    const r = instructions[step]
                    if (!r) return null
                    return (
                      <div
                        key={step}
                        onClick={() => { jumpToStep(step); setStripExpanded(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                          background: offset === 0 ? 'rgba(196,97,74,0.06)' : 'transparent',
                          borderLeft: `3px solid ${offset === 0 ? '#C4614A' : 'transparent'}`,
                        }}
                      >
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: offset === 0 ? '#C4614A' : '#6B5744', fontWeight: offset === 0 ? 700 : 400, flex: 1 }}>
                          {rowSummary(step)}
                        </p>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {r.runs.slice(0, 4).map((run, i) => (
                            <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: run.hex, border: '1px solid rgba(0,0,0,0.08)' }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop: 10 }}>
                    <ActionButtons />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel: scrollable instruction list ───────────────────── */}
          <div
            ref={rightPanelRef}
            style={{ overflowY: 'auto', padding: '16px 16px 80px' }}
          >
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              {isC2C ? 'Diagonals' : 'All rows'}
            </p>

            {instructions.map((r, step) => {
              const isDone    = completedRows.has(step)
              const isCurrent = step === currentStep
              return (
                <div
                  key={step}
                  ref={el => { rowItemRefs.current[step] = el }}
                  onClick={() => jumpToStep(step)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10, marginBottom: 4,
                    background: isCurrent ? 'rgba(196,97,74,0.06)' : 'transparent',
                    borderLeft: `3px solid ${isCurrent ? '#C4614A' : isDone ? '#4A9050' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={() => setHoveredStep(step)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isDone ? '#B8AAA0' : isCurrent ? '#C4614A' : '#2C2218', textDecoration: isDone ? 'line-through' : 'none' }}>
                      {r.label}
                      {isCurrent && <span style={{ marginLeft: 6, fontSize: 9, color: '#C4614A', fontWeight: 700 }}>← now</span>}
                    </p>
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {r.runs.slice(0, 5).map((run, i) => (
                        <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: run.hex, border: '1px solid rgba(0,0,0,0.08)' }} title={`${run.count}`} />
                      ))}
                      {r.runs.length > 5 && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#C8BFB0' }}>+{r.runs.length - 5}</span>}
                    </div>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>
                    {r.totalStitches} {isC2C ? 'blocks' : 'sts'}
                    {r.carriedColors?.length ? ` · carry ${r.carriedColors.length}` : ''}
                    {r.phase ? ` · ${r.phase === 'growing' ? '↗' : r.phase === 'decreasing' ? '↘' : '→'}` : ''}
                  </p>
                </div>
              )
            })}

            <ColourKey />

            {isComplete && (
              <div style={{ marginTop: 16 }}>
                <DiscountClubCard
                  saveLink={typeof window !== 'undefined' ? window.location.href : ''}
                  linkLabel="progress"
                  couponTier="25"
                />
              </div>
            )}
          </div>
        </div>

        {/* Celebration overlay */}
        {showCelebration && <CelebrationOverlay />}

        {/* Email prompt */}
        {showEmailPrompt && <EmailPrompt />}

        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT (< 768px)
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 180px' }}>

        {/* Progress header */}
        <div style={{ width: '100%', maxWidth: 440 }}>
          <ProgressHeader />
        </div>

        {/* Grid — natural height, no cap */}
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div ref={containerRef} style={{ overflowX: 'auto', overflowY: 'auto' }}>
            <ZoomableCanvas canvasRef={canvasRef} showRowHint={true} />
          </div>
        </div>

        {/* Current row card — always visible, pinned below grid */}
        <div style={{ width: '100%', maxWidth: 440, marginTop: 12 }}>
          <CurrentRowCard />
        </div>

        {/* Collapsible row list */}
        <div style={{ width: '100%', maxWidth: 440, marginTop: 10 }}>
          <button
            onClick={() => setShowRowList(v => !v)}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'white', border: '1.5px solid #EDE4D8', borderRadius: 12,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              color: '#6B5744', cursor: 'pointer', textAlign: 'left',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>☰ {isC2C ? 'All diagonals' : 'All rows'} ({totalSteps})</span>
            <span style={{ color: '#C4614A' }}>{showRowList ? '↑ Collapse' : '↓ See all'}</span>
          </button>

          {showRowList && (
            <div style={{ background: 'white', borderRadius: '0 0 16px 16px', border: '1.5px solid #EDE4D8', borderTop: 'none', overflow: 'hidden', marginTop: -2 }}>
              <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                {instructions.map((r, step) => {
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
                        style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: isDone ? '#4A9050' : 'transparent', border: `2px solid ${isDone ? '#4A9050' : isCurrent ? '#C4614A' : '#D4C9B8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                      >
                        {isDone && <span style={{ fontSize: 11, color: 'white', fontWeight: 700 }}>✓</span>}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isDone ? '#B8AAA0' : '#2C2218', textDecoration: isDone ? 'line-through' : 'none' }}>
                            {r.label}
                          </p>
                          {isCurrent && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#C4614A', fontWeight: 700 }}>← now</span>}
                          {r.phase && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#9A8878' }}>{r.phase === 'growing' ? '↗' : r.phase === 'decreasing' ? '↘' : '→'}</span>}
                          {r.side && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#B8AAA0' }}>{r.side}</span>}
                        </div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>
                          {r.totalStitches} {isC2C ? 'blocks' : 'sts'}
                          {r.carriedColors?.length ? ` · carry ${r.carriedColors.length}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {r.runs.slice(0, 5).map((run, i) => (
                          <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: run.hex, border: '1px solid rgba(0,0,0,0.08)' }} />
                        ))}
                        {r.runs.length > 5 && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#C8BFB0' }}>+{r.runs.length - 5}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Colour key */}
        <div style={{ width: '100%', maxWidth: 440 }}>
          <ColourKey />
        </div>

        {/* Completion discount card */}
        {isComplete && (
          <div style={{ width: '100%', maxWidth: 440, marginTop: 16 }}>
            <DiscountClubCard
              saveLink={typeof window !== 'undefined' ? window.location.href : ''}
              linkLabel="progress"
              couponTier="25"
            />
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '12px 20px max(20px, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #FAF6EF 72%, transparent)', zIndex: 50 }}>
        <ActionButtons />
        {!isComplete && (
          <button onClick={() => router.push('/track')} style={{ width: '100%', marginTop: 6, background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#B8AAA0', cursor: 'pointer' }}>
            ← All patterns
          </button>
        )}
      </div>

      {/* Celebration overlay */}
      {showCelebration && <CelebrationOverlay />}

      {/* Email prompt */}
      {showEmailPrompt && <EmailPrompt />}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </main>
  )

  // ── Overlays (shared between mobile + desktop) ────────────────────────────

  function EmailPrompt() {
    return (
      <>
        <div onClick={dismissEmailPrompt} style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(44,34,24,0.4)' }} />
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, zIndex: 191, background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px max(24px, env(safe-area-inset-bottom))', boxShadow: '0 -8px 32px rgba(44,34,24,0.18)', animation: 'slideUp 0.35s ease-out' }}>
          <div style={{ width: 36, height: 4, background: '#E4D9C8', borderRadius: 999, margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218', marginBottom: 6 }}>
            Save your spot
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', marginBottom: 16, lineHeight: 1.6 }}>
            Get a link to continue on any device
          </p>
          {emailStatus === 'sent' ? (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#4A9050', textAlign: 'center', padding: '12px 0' }}>
              ✓ Link sent! Check your inbox.
            </p>
          ) : (
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                required
                style={{ width: '100%', padding: '12px 14px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218', background: '#FAF6EF', border: '1.5px solid #E4D9C8', borderRadius: 12, outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="submit" disabled={emailStatus === 'sending'} style={{ width: '100%', padding: '13px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,97,74,0.25)' }}>
                {emailStatus === 'sending' ? 'Sending…' : 'Send my link'}
              </button>
            </form>
          )}
          <button onClick={dismissEmailPrompt} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#B8AAA0', cursor: 'pointer' }}>
            No thanks
          </button>
        </div>
      </>
    )
  }

  function CelebrationOverlay() {
    return (
      <>
        <div onClick={() => setShowCelebration(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(44,34,24,0.55)', backdropFilter: 'blur(2px)' }} />
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, zIndex: 201, background: '#FAF6EF', borderRadius: '24px 24px 0 0', padding: '24px 20px max(28px, env(safe-area-inset-bottom))', boxShadow: '0 -8px 40px rgba(44,34,24,0.22)' }}>
          <div style={{ width: 36, height: 4, background: '#E4D9C8', borderRadius: 999, margin: '0 auto 20px' }} />
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218', marginBottom: 6 }}>Pattern complete!</h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.6 }}>
              Every {pattern!.meta.stitchStyle === 'c2c' ? 'diagonal' : 'row'} done.
              {lastCompleted !== null && ` ${pattern!.meta.stitchStyle === 'c2c' ? 'Diagonal' : 'Row'} ${lastCompleted + 1} was the last one.`}
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <DiscountClubCard saveLink={typeof window !== 'undefined' ? window.location.href : ''} linkLabel="progress" couponTier="25" maxWidth={430} />
          </div>
          <button onClick={() => setShowCelebration(false)} style={{ width: '100%', padding: '13px', background: 'white', color: '#6B5744', border: '1.5px solid #EDE4D8', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </>
    )
  }
}
