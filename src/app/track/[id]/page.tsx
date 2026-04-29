'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import ZoomableCanvas from '@/components/preview/ZoomableCanvas'
import {
  getTracked, updateProgress, markEmailSaved, updateYarnLabel,
  updateTrackedCellColor, updateTrackedPaletteColor,
  defaultYarnLabel, TrackedPattern,
} from '@/lib/patternTracker'
import DiscountClubCard from '@/components/ui/DiscountClubCard'
import { generateInstructions, RowInstruction } from '@/modules/instructions/generateInstructions'
import { PatternData, StitchStyle } from '@/types/pattern'

// (Formspree replaced by Resend via /api/email)

// ── Save / share bar ─────────────────────────────────────────────────────────

function SaveBar({ patternName, patternId }: { patternName: string; patternId: string }) {
  const [copied, setCopied] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  function copyLink() {
    const url = typeof window !== 'undefined' ? window.location.href.split('?')[0] : ''
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setEmailStatus('sending')
    const url = typeof window !== 'undefined' ? window.location.href.split('?')[0] : ''
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), pattern_name: patternName, restore_link: url }),
      })
      setEmailStatus('sent')
      setTimeout(() => { setShowEmail(false); setEmailStatus('idle'); setEmail('') }, 2000)
    } catch { setEmailStatus('idle') }
  }

  return (
    <div style={{ background: 'white', border: '1.5px solid #EDE4D8', borderRadius: 12, padding: '10px 12px' }}>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Save your pattern link
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={copyLink}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 9, border: '1.5px solid #EDE4D8',
            background: copied ? 'rgba(74,144,80,0.08)' : '#FAF6EF',
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
            color: copied ? '#4A9050' : '#6B5744', cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied!' : '📋 Copy link'}
        </button>
        <button
          onClick={() => setShowEmail(v => !v)}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 9,
            border: `1.5px solid ${showEmail ? 'rgba(196,97,74,0.35)' : '#EDE4D8'}`,
            background: showEmail ? 'rgba(196,97,74,0.07)' : '#FAF6EF',
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
            color: showEmail ? '#C4614A' : '#6B5744', cursor: 'pointer',
          }}
        >
          ✉️ Email link
        </button>
      </div>
      {showEmail && (
        <form onSubmit={sendEmail} style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com" required
            style={{ flex: 1, padding: '8px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2C2218', background: '#FAF6EF', border: '1.5px solid #E4D9C8', borderRadius: 9, outline: 'none' }}
          />
          <button
            type="submit" disabled={emailStatus === 'sending'}
            style={{ padding: '8px 12px', background: emailStatus === 'sent' ? '#4A9050' : '#C4614A', color: 'white', border: 'none', borderRadius: 9, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            {emailStatus === 'sent' ? '✓' : emailStatus === 'sending' ? '…' : 'Send'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Craft colour grid ─────────────────────────────────────────────────────────

const CRAFT_COLORS = [
  // Whites · grays · blacks
  '#FFFFFF','#F5F0E8','#D6CCC0','#A89880','#7A6855','#4A3728','#2C2218','#000000',
  // Warm neutrals · beiges
  '#FFF5E6','#EDD9B8','#D4A96A','#C4813A','#A0623C','#8B5E3C','#6B3D24','#3E1A00',
  // Pinks
  '#FFE4EE','#FFB3CC','#FF80AA','#FF4D88','#E91E63','#C2185B','#880E4F','#560027',
  // Reds
  '#FFEBEE','#FFCDD2','#EF9A9A','#EF5350','#F44336','#D32F2F','#B71C1C','#7F0000',
  // Oranges
  '#FFF3E0','#FFCC80','#FFA726','#FF9800','#F57C00','#E65100','#BF360C','#7B1900',
  // Yellows · golds
  '#FFFDE7','#FFF176','#FDD835','#F9A825','#FF8F00','#FF6F00','#E65100','#BF4600',
  // Greens
  '#F1F8E9','#C5E1A5','#81C784','#4CAF50','#388E3C','#2E7D32','#1B5E20','#003300',
  // Teals · mints
  '#E0F7FA','#80DEEA','#26C6DA','#00BCD4','#0097A7','#00838F','#006064','#003333',
  // Blues
  '#E3F2FD','#90CAF9','#42A5F5','#2196F3','#1565C0','#0D47A1','#1A237E','#000051',
  // Purples · lavenders
  '#F3E5F5','#CE93D8','#AB47BC','#9C27B0','#7B1FA2','#6A1B9A','#4A148C','#1A0038',
]

// ── Color picker bottom sheet ─────────────────────────────────────────────────

interface ColorPickerSheetProps {
  targetIndex: number
  currentHex:  string
  yarnName:    string
  hexInput:    string
  setHexInput: (v: string) => void
  onPick:      (hex: string) => void
  onClose:     () => void
}

function ColorPickerSheet({ currentHex, yarnName, hexInput, setHexInput, onPick, onClose }: ColorPickerSheetProps) {
  const rawHex   = hexInput.replace('#', '')
  const isValid  = /^[0-9A-Fa-f]{6}$/.test(rawHex)
  const preview  = isValid ? `#${rawHex}` : null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 221,
      background: 'white', borderRadius: '20px 20px 0 0',
      padding: '16px 16px max(20px, env(safe-area-inset-bottom))',
      boxShadow: '0 -8px 40px rgba(44,34,24,0.22)',
      animation: 'slideUp 0.25s ease-out',
    }}>
      <div style={{ width: 36, height: 4, background: '#E4D9C8', borderRadius: 999, margin: '0 auto 14px' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: currentHex, border: '2px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#2C2218', flex: 1 }}>
          Change colour for {yarnName}
        </p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 20, color: '#C8BFB0', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      {/* Colour grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 14 }}>
        {CRAFT_COLORS.map(hex => (
          <button
            key={hex}
            onClick={() => onPick(hex)}
            style={{
              width: '100%', aspectRatio: '1',
              background: hex,
              border: hex.toLowerCase() === currentHex.toLowerCase()
                ? '3px solid #C4614A'
                : '1.5px solid rgba(0,0,0,0.10)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
            title={hex}
          />
        ))}
      </div>

      {/* Custom hex input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: preview ?? '#F5F0E8',
          border: '1.5px solid rgba(0,0,0,0.10)',
        }} />
        <input
          value={hexInput}
          onChange={e => setHexInput(e.target.value)}
          placeholder="#hex or hex code"
          maxLength={7}
          style={{
            flex: 1, padding: '9px 12px',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218',
            background: '#FAF6EF', border: '1.5px solid #E4D9C8', borderRadius: 10,
            outline: 'none',
          }}
        />
        <button
          onClick={() => { if (preview) onPick(preview) }}
          disabled={!isValid}
          style={{
            padding: '9px 14px', borderRadius: 10, border: 'none',
            background: isValid ? '#C4614A' : '#E4D9C8',
            color: isValid ? 'white' : '#B8AAA0',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: isValid ? 'pointer' : 'not-allowed',
          }}
        >
          Use
        </button>
      </div>
    </div>
  )
}

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
  containerWidth: number,
) {
  const { colorMap, palette, meta } = pattern
  const cellSize = Math.min(24, Math.max(4, Math.floor(containerWidth / meta.width)))
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
  const [showYarnKey,   setShowYarnKey]   = useState(false)

  // ── Desktop state ────────────────────────────────────────────────────────────
  const [isDesktop,     setIsDesktop]     = useState(false)
  const [stripExpanded, setStripExpanded] = useState(false)
  const [showAllRows,   setShowAllRows]   = useState(false)
  const [jumpInput,     setJumpInput]     = useState('')

  // ── Yarn label state ─────────────────────────────────────────────────────────
  const [yarnLabels,       setYarnLabels]       = useState<Record<number, string>>({})
  const [editingYarnIndex, setEditingYarnIndex] = useState<number | null>(null)
  const [editingYarnValue, setEditingYarnValue] = useState('')

  // ── Customization state (edit stitches/colors) ───────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [cellPopover, setCellPopover] = useState<{ row: number; col: number; x: number; y: number } | null>(null)
  const [colorPickerTarget, setColorPickerTarget] = useState<number | null>(null)
  const [hexInput, setHexInput] = useState('')

  // ── Email prompt state ───────────────────────────────────────────────────────
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [emailInput,      setEmailInput]      = useState('')
  const [emailStatus,     setEmailStatus]     = useState<'idle' | 'sending' | 'sent'>('idle')

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const containerRef     = useRef<HTMLDivElement>(null)   // mobile grid container
  const gridContainerRef = useRef<HTMLDivElement>(null)   // desktop left-panel grid area
  const rightPanelRef    = useRef<HTMLDivElement>(null)   // desktop right panel
  const rowItemRefs      = useRef<(HTMLDivElement | null)[]>([])
  const prevCompleteRef  = useRef(false)

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
    setYarnLabels(p.yarnLabels ?? {})
  }, [id, router, searchParams])

  // ── Build instructions ───────────────────────────────────────────────────────
  const instructions = useMemo<RowInstruction[]>(() => {
    if (!pattern) return []
    return generateInstructions(toPatternData(pattern))
  }, [pattern])

  const totalSteps = instructions.length || (pattern?.meta.height ?? 0)

  // ── Draw canvas ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pattern || !canvasRef.current) return
    const container = isDesktop ? gridContainerRef.current : containerRef.current
    const w = container?.getBoundingClientRect().width ?? 320
    drawTrackerGrid(canvasRef.current, pattern, currentStep, completedRows, w)
  }, [pattern, currentStep, completedRows, isDesktop])

  // Re-draw when the container resizes (e.g. panel resize, orientation change)
  useEffect(() => {
    if (!pattern || !canvasRef.current) return
    const container = isDesktop ? gridContainerRef.current : containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      if (!canvasRef.current) return
      const w = container.getBoundingClientRect().width
      if (w > 0) drawTrackerGrid(canvasRef.current, pattern, currentStep, completedRows, w)
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [pattern, currentStep, completedRows, isDesktop])

  // ── Mobile: auto-scroll canvas to current row ────────────────────────────────
  useEffect(() => {
    if (isDesktop || !pattern || !containerRef.current) return
    const el  = containerRef.current
    const w   = el.getBoundingClientRect().width || 320
    const cellSize = Math.min(24, Math.max(4, Math.floor(w / pattern.meta.width)))
    const stride   = cellSize + 1
    const scrollRow = Math.min(currentStep, pattern.meta.height - 1)
    el.scrollTop = Math.max(0, scrollRow * stride - el.clientHeight / 2)
  }, [pattern, currentStep, isDesktop])

  // ── Desktop: auto-scroll right panel to current row ──────────────────────────
  useEffect(() => {
    if (!isDesktop) return
    const el = rowItemRefs.current[currentStep]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentStep, isDesktop])

  // ── Persist progress ─────────────────────────────────────────────────────────
  const persistProgress = useCallback((completed: Set<number>, cur: number) => {
    if (!pattern) return
    updateProgress(pattern.id, Array.from(completed).sort((a, b) => a - b), cur)
  }, [pattern])

  function cellSizeForWidth(containerWidth: number) {
    if (!pattern) return 8
    return Math.min(24, Math.max(4, Math.floor(containerWidth / pattern.meta.width)))
  }

  function hitTestCanvas(clientX: number, clientY: number) {
    if (!editMode || !pattern || !canvasRef.current) return
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const container = isDesktop ? gridContainerRef.current : containerRef.current
    const w      = container?.getBoundingClientRect().width ?? 320
    const cellSize = cellSizeForWidth(w)
    const stride = cellSize + 1
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1
    const col = Math.floor((clientX - rect.left) * scaleX / stride)
    const row = Math.floor((clientY - rect.top)  * scaleX / stride)
    if (row < 0 || col < 0 || row >= pattern.meta.height || col >= pattern.meta.width) return
    setCellPopover({ row, col, x: clientX, y: clientY })
  }

  function handleCanvasClick(e: React.MouseEvent) { hitTestCanvas(e.clientX, e.clientY) }
  function handleCanvasTap(cx: number, cy: number) { hitTestCanvas(cx, cy) }

  function pickCellColor(nextIdx: number) {
    if (!pattern || !cellPopover) return
    updateTrackedCellColor(pattern.id, cellPopover.row, cellPopover.col, nextIdx)
    setPattern(prev => {
      if (!prev) return prev
      const next = { ...prev, colorMap: prev.colorMap.map(r => [...r]) }
      next.colorMap[cellPopover.row][cellPopover.col] = nextIdx
      return next
    })
    setCellPopover(null)
  }

  function applyColorPick(newHex: string) {
    if (colorPickerTarget === null || !pattern) return
    const hex = newHex.startsWith('#') ? newHex.toLowerCase() : `#${newHex.toLowerCase()}`
    updateTrackedPaletteColor(pattern.id, colorPickerTarget, hex)
    setPattern(prev => {
      if (!prev) return prev
      const nextPalette = prev.palette.map((e, i) =>
        i === colorPickerTarget ? { ...e, hex } : e
      )
      return { ...prev, palette: nextPalette }
    })
    setColorPickerTarget(null)
    setHexInput('')
  }

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
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:        emailInput.trim(),
          pattern_name: pattern.name,
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

  // 5-item window for desktop right panel (current ±2)
  const wStart     = Math.max(0, currentStep - 2)
  const wEnd       = Math.min(totalSteps - 1, currentStep + 2)
  const windowSteps: number[] = []
  for (let s = wStart; s <= wEnd; s++) windowSteps.push(s)

  // ── Yarn label helpers ───────────────────────────────────────────────────────
  function yarnName(i: number): string {
    return yarnLabels[i] || defaultYarnLabel(i)
  }

  function yarnNameForHex(hex: string): string {
    const i = pattern!.palette.findIndex(c => c.hex === hex)
    return i >= 0 ? yarnName(i) : hex
  }

  function startEditYarn(i: number) {
    setEditingYarnIndex(i)
    setEditingYarnValue(yarnName(i))
  }

  function saveYarnLabel(i: number) {
    const val = editingYarnValue.trim() || defaultYarnLabel(i)
    setYarnLabels(prev => ({ ...prev, [i]: val }))
    updateYarnLabel(pattern!.id, i, val)
    setEditingYarnIndex(null)
  }

  // Compact row description using yarn names
  function rowSummary(step: number) {
    const r = instructions[step]
    if (!r) return ''
    const runs = r.runs.slice(0, 4).map(run =>
      `${run.count} ${run.symbol} ${yarnNameForHex(run.hex)}`
    ).join(', ')
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
                {run.symbol} × {run.count} <span style={{ color: '#9A8878' }}>{yarnNameForHex(run.hex)}</span>
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

  // ── Yarn key (editable colour labels) ────────────────────────────────────────
  function YarnKey() {
    return (
      <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #EDE4D8', padding: '10px 12px' }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          🧶 Yarn key — tap name to rename
        </p>
        {pattern!.palette.map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 0',
            borderBottom: i < pattern!.palette.length - 1 ? '1px solid #F5EFE6' : 'none',
          }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: c.hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', width: 18, flexShrink: 0 }}>{c.symbol}</span>
            {editingYarnIndex === i ? (
              <input
                autoFocus
                value={editingYarnValue}
                onChange={e => setEditingYarnValue(e.target.value)}
                onBlur={() => saveYarnLabel(i)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveYarnLabel(i) } }}
                style={{
                  flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218',
                  background: '#FAF6EF', border: '1.5px solid #C4614A', borderRadius: 8,
                  padding: '3px 8px', outline: 'none',
                }}
              />
            ) : (
              <span
                onClick={() => startEditYarn(i)}
                title="Tap to rename"
                style={{
                  flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218',
                  cursor: 'text', padding: '3px 6px', borderRadius: 6,
                  borderBottom: '1px dashed #E4D9C8',
                }}
              >
                {yarnName(i)}
              </span>
            )}
            {editMode && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setColorPickerTarget(i)
                  setHexInput('')
                }}
                style={{
                  background: 'rgba(196,97,74,0.08)',
                  border: '1px solid rgba(196,97,74,0.25)',
                  borderRadius: 8,
                  padding: '3px 8px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  color: '#C4614A',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="Change this yarn colour"
              >
                🎨
              </button>
            )}
          </div>
        ))}
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
      <div className="project-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#FAF6EF', overflow: 'hidden' }}>
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
            <div ref={gridContainerRef} style={{ flex: 1, overflow: 'hidden', padding: '0 24px' }} onClick={handleCanvasClick}>
              <ZoomableCanvas canvasRef={canvasRef} showRowHint={true} onTap={editMode ? handleCanvasTap : undefined} />
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

          {/* ── Right panel ───────────────────────────────────────────────── */}
          <div
            ref={rightPanelRef}
            style={{ overflowY: 'auto', padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {/* Save / share */}
            <SaveBar patternName={pattern!.name} patternId={pattern!.id} />

            {/* Edit mode toggle */}
            <button
              onClick={() => { setEditMode(v => !v); setCellPopover(null) }}
              style={{
                width: '100%', padding: '10px 14px',
                background: editMode ? 'rgba(196,97,74,0.08)' : 'white',
                border: `1.5px solid ${editMode ? 'rgba(196,97,74,0.35)' : '#EDE4D8'}`,
                borderRadius: 12,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
                color: editMode ? '#C4614A' : '#6B5744',
                cursor: 'pointer', textAlign: 'left' as const,
              }}
            >
              🎨 {editMode ? 'Edit mode ON — click grid cells to recolor' : 'Enable edit mode'}
            </button>

            {/* Yarn key */}
            <YarnKey />

            {/* Jump to diagonal/row input */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                min={1}
                max={totalSteps}
                value={jumpInput}
                onChange={e => setJumpInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const n = parseInt(jumpInput, 10)
                    if (!isNaN(n) && n >= 1 && n <= totalSteps) {
                      jumpToStep(n - 1)
                      setJumpInput('')
                    }
                  }
                }}
                placeholder={`Jump to ${noun} #…`}
                style={{
                  flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218',
                  background: 'white', border: '1.5px solid #EDE4D8', borderRadius: 10,
                  padding: '8px 12px', outline: 'none',
                }}
              />
              <button
                onClick={() => {
                  const n = parseInt(jumpInput, 10)
                  if (!isNaN(n) && n >= 1 && n <= totalSteps) { jumpToStep(n - 1); setJumpInput('') }
                }}
                style={{ padding: '8px 14px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Go
              </button>
            </div>

            {/* 5-item window OR full list */}
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                {isC2C ? 'Diagonals' : 'Rows'}
              </p>

              {(showAllRows ? instructions.map((_, i) => i) : windowSteps).map(step => {
                const r       = instructions[step]
                if (!r) return null
                const isDone    = completedRows.has(step)
                const isCurrent = step === currentStep
                return (
                  <div
                    key={step}
                    ref={el => { rowItemRefs.current[step] = el }}
                    onClick={() => jumpToStep(step)}
                    style={{
                      padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                      background: isCurrent ? 'rgba(196,97,74,0.06)' : 'transparent',
                      borderLeft: `3px solid ${isCurrent ? '#C4614A' : isDone ? '#4A9050' : 'transparent'}`,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isDone ? '#B8AAA0' : isCurrent ? '#C4614A' : '#2C2218', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {r.label}
                        {isCurrent && <span style={{ marginLeft: 6, fontSize: 9, color: '#C4614A', fontWeight: 700 }}>← now</span>}
                      </p>
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {r.runs.slice(0, 5).map((run, i) => (
                          <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: run.hex, border: '1px solid rgba(0,0,0,0.08)' }} title={`${run.count} ${yarnNameForHex(run.hex)}`} />
                        ))}
                        {r.runs.length > 5 && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#C8BFB0' }}>+{r.runs.length - 5}</span>}
                      </div>
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744' }}>
                      {r.runs.map(run => `${run.count} ${run.symbol} ${yarnNameForHex(run.hex)}`).join(', ')}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C8BFB0', marginTop: 2 }}>
                      {r.totalStitches} {isC2C ? 'blocks' : 'sts'}
                      {r.carriedColors?.length ? ` · carry ${r.carriedColors.length}` : ''}
                      {r.phase ? ` · ${r.phase === 'growing' ? '↗' : r.phase === 'decreasing' ? '↘' : '→'}` : ''}
                    </p>
                  </div>
                )
              })}

              {/* See all toggle */}
              <button
                onClick={() => setShowAllRows(v => !v)}
                style={{ width: '100%', marginTop: 4, padding: '8px', background: 'none', border: '1px dashed #E4D9C8', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', cursor: 'pointer' }}
              >
                {showAllRows ? `↑ Show less` : `↕ See all ${noun}s (${totalSteps})`}
              </button>
            </div>

            {isComplete && (
              <DiscountClubCard
                saveLink={typeof window !== 'undefined' ? window.location.href : ''}
                linkLabel="progress"
                couponTier="25"
              />
            )}

            <div style={{ paddingTop: 12, borderTop: '1px solid #EDE4D8', textAlign: 'center' }}>
              <a href="/privacy" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', textDecoration: 'none', marginRight: 12 }}>Privacy</a>
              <a href="/terms"   style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', textDecoration: 'none' }}>Terms</a>
            </div>
          </div>
        </div>

        {/* Celebration overlay */}
        {showCelebration && <CelebrationOverlay />}

        {/* Email prompt */}
        {showEmailPrompt && <EmailPrompt />}

        {/* Edit popovers (desktop) */}
        {pattern && (cellPopover || colorPickerTarget !== null) && (
          <div
            onClick={() => { setCellPopover(null); setColorPickerTarget(null) }}
            style={{ position: 'fixed', inset: 0, zIndex: 220, background: colorPickerTarget !== null ? 'rgba(44,34,24,0.45)' : 'transparent' }}
          />
        )}
        {pattern && cellPopover && (
          <div style={{ position: 'fixed', left: Math.min(cellPopover.x, window.innerWidth - 190), top: cellPopover.y + 10, zIndex: 221, background: 'white', borderRadius: 14, boxShadow: '0 10px 34px rgba(44,34,24,0.20)', padding: 10, display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 190 }}>
            <div style={{ width: '100%', fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', marginBottom: 2 }}>Recolor stitch</div>
            {pattern.palette.map((entry, idx) => (
              <button key={idx} onClick={() => pickCellColor(idx)} title={entry.label ?? `Color ${idx + 1}`}
                style={{ width: 32, height: 32, borderRadius: 8, background: entry.hex, border: '2px solid rgba(0,0,0,0.10)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'rgba(255,255,255,0.92)' }}>
                {entry.symbol}
              </button>
            ))}
            <button onClick={() => setCellPopover(null)} style={{ width: '100%', padding: '4px', background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', cursor: 'pointer' }}>Cancel</button>
          </div>
        )}
        {pattern && colorPickerTarget !== null && (
          <ColorPickerSheet
            targetIndex={colorPickerTarget}
            currentHex={pattern.palette[colorPickerTarget]?.hex ?? '#000000'}
            yarnName={yarnName(colorPickerTarget)}
            hexInput={hexInput}
            setHexInput={setHexInput}
            onPick={applyColorPick}
            onClose={() => { setColorPickerTarget(null); setHexInput('') }}
          />
        )}

        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT (< 768px)
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <main className="project-page" style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 180px' }}>

        {/* Progress header */}
        <div style={{ width: '100%', maxWidth: 440 }}>
          <ProgressHeader />
        </div>

        {/* Grid — natural height, no cap */}
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div ref={containerRef} style={{ overflowX: 'auto', overflowY: 'auto' }} onClick={handleCanvasClick}>
            <ZoomableCanvas canvasRef={canvasRef} showRowHint={true} onTap={editMode ? handleCanvasTap : undefined} />
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

        {/* Save / share */}
        <div style={{ width: '100%', maxWidth: 440, marginTop: 10 }}>
          <SaveBar patternName={pattern!.name} patternId={pattern!.id} />
        </div>

        {/* Edit mode toggle (mobile) */}
        <div style={{ width: '100%', maxWidth: 440, marginTop: 10 }}>
          <button
            onClick={() => { setEditMode(v => !v); setCellPopover(null) }}
            style={{
              width: '100%', padding: '10px 14px',
              background: editMode ? 'rgba(196,97,74,0.08)' : 'white',
              border: `1.5px solid ${editMode ? 'rgba(196,97,74,0.35)' : '#EDE4D8'}`,
              borderRadius: 12,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: editMode ? '#C4614A' : '#6B5744',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            🎨 {editMode ? 'Edit mode ON — tap grid or 🎨 yarn key' : 'Enable edit mode (recolor)'}
          </button>
        </div>

        {/* Yarn key — collapsible */}
        <div style={{ width: '100%', maxWidth: 440, marginTop: 10 }}>
          <button
            onClick={() => setShowYarnKey(v => !v)}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'white', border: '1.5px solid #EDE4D8', borderRadius: showYarnKey ? '12px 12px 0 0' : 12,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              color: '#6B5744', cursor: 'pointer', textAlign: 'left' as const,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>🧶 Yarn key</span>
            <span style={{ color: '#C4614A' }}>{showYarnKey ? '↑ Hide' : '↓ Show'}</span>
          </button>
          {showYarnKey && (
            <div style={{ borderRadius: '0 0 12px 12px', border: '1.5px solid #EDE4D8', borderTop: 'none', overflow: 'hidden' }}>
              <YarnKey />
            </div>
          )}
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

      {/* Edit popovers */}
      {pattern && (cellPopover || colorPickerTarget !== null) && (
        <div
          onClick={() => { setCellPopover(null); setColorPickerTarget(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 220, background: colorPickerTarget !== null ? 'rgba(44,34,24,0.45)' : 'transparent' }}
        />
      )}

      {pattern && cellPopover && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(cellPopover.x, window.innerWidth - 190),
            top:  cellPopover.y + 10,
            zIndex: 221,
            background: 'white',
            borderRadius: 14,
            boxShadow: '0 10px 34px rgba(44,34,24,0.20)',
            padding: 10,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            maxWidth: 190,
          }}
        >
          <div style={{ width: '100%', fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', marginBottom: 2 }}>
            Recolor stitch
          </div>
          {pattern.palette.map((entry, idx) => (
            <button
              key={idx}
              onClick={() => pickCellColor(idx)}
              title={entry.label ?? `Color ${idx + 1}`}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: entry.hex,
                border: '2px solid rgba(0,0,0,0.10)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: 'rgba(255,255,255,0.92)',
              }}
            >
              {entry.symbol}
            </button>
          ))}
          <button
            onClick={() => setCellPopover(null)}
            style={{ width: '100%', padding: '4px', background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}

      {pattern && colorPickerTarget !== null && (
        <ColorPickerSheet
          targetIndex={colorPickerTarget}
          currentHex={pattern.palette[colorPickerTarget]?.hex ?? '#000000'}
          yarnName={yarnName(colorPickerTarget)}
          hexInput={hexInput}
          setHexInput={setHexInput}
          onPick={applyColorPick}
          onClose={() => { setColorPickerTarget(null); setHexInput('') }}
        />
      )}

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
