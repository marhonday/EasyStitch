'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { PatternData, StitchStyle, ColorEntry } from '@/types/pattern'
import { generateInstructions, RowInstruction } from '@/modules/instructions/generateInstructions'

// ─── Per-style configuration ─────────────────────────────────────────────────

interface RowNoteCtx {
  activeColors: number
  palette:      ColorEntry[]
}

interface StyleConfig {
  /** Static stitch abbreviation, e.g. "sc", "block" */
  abbrev: string
  /**
   * Per-row abbreviation override — use when the abbreviation changes
   * between rows (e.g. knitting: "k" on RS, "p" on WS).
   * Takes precedence over `abbrev` when provided.
   */
  abbrevFn?: (row: RowInstruction) => string
  /** What to do at the end of every row, shown in the current-row card */
  turnNote: string
  /** Whether to show RS/WS badge + ← / → arrows on each row */
  showDirection: boolean
  /**
   * When true, runs for RTL rows are reversed so they appear in
   * stitching order (right edge first) rather than visual left-to-right.
   */
  reverseRTL: boolean
  /** Foundation / cast-on hint shown before Row / Diagonal 1 */
  foundationHint?: (width: number) => string
  /**
   * Optional per-row contextual note shown below the stitch runs.
   * Return null to show nothing for that row.
   */
  rowNote?: (row: RowInstruction, ctx: RowNoteCtx) => string | null
  /** Bullet points for the "How to read this" help box */
  helpItems: string[]
  /** Header label for the stitch column in the full list */
  columnLabel: string
}

const STYLE_CONFIG: Partial<Record<StitchStyle, StyleConfig>> = {

  // ── Single Crochet ──────────────────────────────────────────────────
  singleCrochet: {
    abbrev:         'sc',
    turnNote:       'ch 1, turn',
    showDirection:  true,
    reverseRTL:     true,
    foundationHint: (w) => `Foundation chain: ch ${w + 1}`,
    columnLabel:    'sc stitches (in stitching order)',
    helpItems: [
      'Row 1 = bottom edge of your work — start here and work upward',
      'Odd rows (1, 3, 5 …) are RS — stitch right → left',
      'Even rows (2, 4, 6 …) are WS — stitch left → right',
      'End every row: ch 1, turn',
      "Change colour on the last yarn-over of the stitch before the colour change — don't cut yarn, carry loosely up the side",
      '3 ■ = 3 sc in that colour, worked one after the other',
    ],
  },

  // ── C2C ────────────────────────────────────────────────────────────
  c2c: {
    abbrev:         'block',
    turnNote:       '',
    showDirection:  false,
    reverseRTL:     false,
    foundationHint: () => 'Start: ch 6, dc in 4th ch from hook, dc in next 2 ch — first block made',
    columnLabel:    'colour blocks along diagonal',
    rowNote: (row) => {
      if (row.isFirstRow) return null
      if (row.phase === 'growing')
        return 'Turn: sl st into corner ch-3 sp of last block, ch 6, work blocks across, add 1 new block at far end'
      if (row.phase === 'decreasing')
        return 'Decreasing: sl st across first block to skip it, ch 3, work blocks across — no new block at far end'
      if (row.phase === 'peak')
        return 'Peak diagonal — work blocks across, no new block added at either end'
      return null
    },
    helpItems: [
      'Each entry = 1 C2C block (ch 3, 3 dc into the corner ch-3 space of the block below)',
      'Diagonal 1 = starting corner (bottom-right) — the foundation block',
      'Growing phase: each diagonal adds one block at each end — work grows diagonally',
      'Decreasing phase: sl st across first block to skip it; no new block at the far end',
      'Change colour before starting a new block — on the last dc of the previous block',
      '2 ■ = 2 consecutive C2C blocks in that colour',
    ],
  },

  // ── Tapestry ───────────────────────────────────────────────────────
  tapestry: {
    abbrev:         'sc',
    turnNote:       'ch 1, turn',
    showDirection:  true,
    reverseRTL:     true,
    foundationHint: (w) => `Foundation chain: ch ${w + 1}`,
    columnLabel:    'sc stitches (in stitching order)',
    rowNote: (_row, { activeColors }) =>
      activeColors > 1
        ? `Carry all ${activeColors} yarn colours across the back — crochet over them as you work`
        : null,
    helpItems: [
      'Row 1 = bottom edge of your work — start here and work upward',
      'Odd rows (1, 3, 5 …) are RS — stitch right → left',
      'Even rows (2, 4, 6 …) are WS — stitch left → right',
      'End every row: ch 1, turn',
      'TAPESTRY: carry ALL yarn colours across every row — crochet over the unused strands to hide them inside the fabric',
      'Keep carried yarns at medium tension — too tight puckers, too loose makes the back messy',
      'Change colour on the last yarn-over of the stitch before the colour change',
      '3 ■ = 3 sc in that colour (unused colours carried behind)',
    ],
  },

  // ── Mosaic ─────────────────────────────────────────────────────────
  mosaic: {
    abbrev:         'st',
    turnNote:       'ch 1, turn',
    showDirection:  true,
    reverseRTL:     true,
    foundationHint: (w) => `Foundation chain: ch ${w + 1} with Colour A`,
    columnLabel:    'stitches — sc (active colour) / sl st (contrast)',
    rowNote: (row, { palette }) => {
      // Rows come in pairs: pair 1 = rows 1-2 (Colour A), pair 2 = rows 3-4 (Colour B), etc.
      const pairIndex     = Math.floor((row.rowNumber - 1) / 2)
      const isColourA     = pairIndex % 2 === 0
      const activeColor   = palette[isColourA ? 0 : 1]
      const contrastColor = palette[isColourA ? 1 : 0]
      const activeName    = activeColor?.label  ?? (isColourA ? 'Colour A' : 'Colour B')
      const contrastName  = contrastColor?.label ?? (isColourA ? 'Colour B' : 'Colour A')
      const endNote       = row.rowNumber % 2 === 0 && !row.isLastRow
        ? ` · Join ${palette[isColourA ? 1 : 0]?.label ?? (isColourA ? 'Colour B' : 'Colour A')} for next pair`
        : ''
      return `Working ${activeName}: sc in ${activeName} stitches · elongated sl st over ${contrastName} stitches (insert hook 2 rows below)${endNote}`
    },
    helpItems: [
      'Mosaic uses 2 colours in alternating pairs of 2 rows each',
      'Rows 1–2: work with Colour A. Rows 3–4: Colour B. Rows 5–6: Colour A. And so on.',
      'Odd rows are RS — stitch right → left. Even rows are WS — stitch left → right.',
      'Active colour stitches: sc normally',
      'Contrast colour stitches: elongated sl st — insert hook into the stitch 2 rows below and pull up a long loop',
      'Do NOT cut yarn between pairs — drop and pick up at the edge',
      'End of every row: ch 1, turn',
      '3 ■ = 3 stitches showing as Colour A in the finished fabric (sc or sl st depending on active colour)',
    ],
  },

  // ── Filet Crochet ──────────────────────────────────────────────────
  filetCrochet: {
    abbrev:         'sq',
    turnNote:       'ch 3, turn (ch 5 if next row begins with a mesh)',
    showDirection:  true,
    reverseRTL:     true,
    foundationHint: (w) => `Foundation chain: ch ${w * 3 + 1} — dc in 4th ch from hook, work across`,
    columnLabel:    '■ filled block (dc, dc, dc)  ·  □ open mesh (ch 2, skip 2, dc)',
    rowNote: (row) => {
      const dir = row.side === 'RS' ? 'right → left' : 'left → right'
      return `Work ${dir} · ■ block: dc in each of next 3 sts · □ mesh: ch 2, skip 2, dc in next dc`
    },
    helpItems: [
      'Row 1 = bottom edge — start here and work upward',
      'Odd rows (1, 3, 5 …) are RS — work right → left',
      'Even rows (2, 4, 6 …) are WS — work left → right',
      '■ BLOCK = dc in each of the 3 stitches of that square',
      '□ MESH  = ch 2, skip 2 stitches/chains, dc in next dc',
      'Turning chain: ch 3 when next row starts with a block, ch 5 for a mesh start',
      '3 ■ = 3 consecutive filled blocks (9 dc)',
      '2 □ = 2 consecutive open mesh squares (ch2, sk2, dc repeated)',
    ],
  },

  // ── Knitting — Stranded / Fair Isle ────────────────────────────────
  knittingStranded: {
    abbrev:         'st',
    abbrevFn:       (row) => row.side === 'RS' ? 'k' : 'p',
    turnNote:       'turn work',
    showDirection:  true,
    reverseRTL:     true,
    foundationHint: (w) => `Cast on ${w} sts with Colour A. Join Colour B ready at right edge.`,
    columnLabel:    'stitches in knitting order (RS: right → left, WS: left → right)',
    rowNote: (row, { activeColors }) => {
      if (row.side === 'RS')
        return `Knit row — strand all ${activeColors} yarns loosely across back. Catch floats longer than 5 sts.`
      return `Purl row — strand all ${activeColors} yarns loosely across front.`
    },
    helpItems: [
      'Row 1 = cast-on edge — start here, work upward',
      'Odd rows (1, 3, 5 …) are RS — knit right → left across needle',
      'Even rows (2, 4, 6 …) are WS — purl left → right across needle',
      'STRANDED: carry ALL yarn colours across every row — hold unused yarns loosely at back (RS) or front (WS)',
      'Catch floats longer than 5 stitches to prevent snagging',
      'Change colour by picking up new yarn from under the current yarn — this twists them and prevents holes',
      '3 ■ = 3 stitches in that colour (k on RS, p on WS)',
    ],
  },

  // ── Cross Stitch ────────────────────────────────────────────────────
  crossStitch: {
    abbrev:         'X',
    turnNote:       '',
    showDirection:  false,
    reverseRTL:     false,
    columnLabel:    'cross stitches (left → right across row)',
    foundationHint: () => 'Start at bottom-right of your Aida cloth — work upward, row by row',
    rowNote: (row, { palette }) => {
      const colorList = palette
        .filter(p => (p.stitchCount ?? 0) > 0)
        .map(p => p.label ?? p.hex)
        .join(', ')
      const dir = row.rowNumber % 2 !== 0 ? 'left → right' : 'right → left'
      return `Row ${row.rowNumber} — work ${dir} · Colours in this row: ${colorList}`
    },
    helpItems: [
      'Row 1 = bottom edge of Aida — start here and work upward',
      'Traditional method: work all half-stitches (/) across a row first, then complete the X on the way back',
      'Ensure all top stitches cross in the same direction for a neat finish',
      'Work one colour section at a time to reduce thread changes',
      'Use 2 strands on 14-count Aida · 1 strand on 18-count · 1 strand on 28-count evenweave',
      'Leave a 2–3cm tail at start — secure under first few stitches (no knots)',
      'Each ■ = 1 cross stitch in that colour thread',
      '3 ■ = 3 consecutive cross stitches without changing colour',
    ],
  },

  // ── Knitting — Intarsia ─────────────────────────────────────────────
  knittingIntarsia: {
    abbrev:         'st',
    abbrevFn:       (row) => row.side === 'RS' ? 'k' : 'p',
    turnNote:       'turn work',
    showDirection:  true,
    reverseRTL:     true,
    foundationHint: (w) => `Cast on ${w} sts. Wind a separate bobbin for each colour section.`,
    columnLabel:    'stitches in knitting order (RS: right → left, WS: left → right)',
    rowNote: (row) => {
      if (row.side === 'RS')
        return 'Knit row — at each colour change, twist yarns (bring new colour up from under old) to prevent holes. Do NOT carry across.'
      return 'Purl row — twist yarns at each colour join. Each section uses its own bobbin.'
    },
    helpItems: [
      'Row 1 = cast-on edge — start here, work upward',
      'Odd rows (1, 3, 5 …) are RS — knit right → left across needle',
      'Even rows (2, 4, 6 …) are WS — purl left → right across needle',
      'INTARSIA: each colour section uses a separate bobbin — do NOT carry yarn across',
      'At every colour change: bring new colour up from under the old one to twist yarns and close the join',
      'On WS rows the twist goes the opposite way — still bring new under old',
      '3 ■ = 3 stitches in that colour (k on RS, p on WS)',
    ],
  },

}

/** Fallback for styles without a specific config */
const DEFAULT_CONFIG: StyleConfig = {
  abbrev:        '',
  turnNote:      '',
  showDirection: false,
  reverseRTL:    false,
  columnLabel:   'Stitches (left → right)',
  helpItems: [
    'Row 1 = bottom edge of your work — start here',
    'Each row listed in order, worked upward',
    '3 ■ = 3 stitches in that colour',
  ],
}

function getConfig(style: StitchStyle): StyleConfig {
  return STYLE_CONFIG[style] ?? DEFAULT_CONFIG
}

// ─── Direction arrow component ────────────────────────────────────────────────

function DirectionArrow({
  direction, side, size = 'normal',
}: {
  direction: RowInstruction['direction']
  side:      RowInstruction['side']
  size?:     'normal' | 'large'
}) {
  if (direction === 'diagonal' || !side) return null
  const isRS   = side === 'RS'
  const label  = isRS ? '← RS' : 'WS →'
  const fs     = size === 'large' ? 12 : 10
  const px     = size === 'large' ? '3px 8px' : '1px 5px'
  return (
    <span style={{
      fontFamily:    "'DM Sans', sans-serif",
      fontSize:      fs,
      fontWeight:    700,
      color:         isRS ? '#C4614A' : '#7A6A5E',
      background:    isRS ? 'rgba(196,97,74,0.1)' : 'rgba(44,34,24,0.06)',
      borderRadius:  6,
      padding:       px,
      flexShrink:    0,
      letterSpacing: '0.02em',
      userSelect:    'none',
    }}>
      {label}
    </span>
  )
}

// ─── Single row in the expandable list ───────────────────────────────────────

function RowLine({
  row, cfg, isEven, isDone, isCurrent, onToggle,
}: {
  row:       RowInstruction
  cfg:       StyleConfig
  isEven:    boolean
  isDone:    boolean
  isCurrent: boolean
  onToggle:  () => void
}) {
  const displayRuns = cfg.reverseRTL && row.direction === 'rtl'
    ? [...row.runs].reverse()
    : row.runs

  const runsText = displayRuns.map(r => `${r.count} ${r.symbol}`).join(', ')

  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? onToggle() : undefined}
      style={{
        padding:      '10px 14px 10px 12px',
        background:   isCurrent
          ? 'rgba(196,97,74,0.07)'
          : isDone
            ? 'rgba(74,144,80,0.04)'
            : isEven ? '#FDFAF5' : 'white',
        borderBottom: '1px solid #F2EAD8',
        borderLeft:   `3px solid ${isCurrent ? '#C4614A' : isDone ? '#4A9050' : 'transparent'}`,
        display:      'flex', alignItems: 'center', gap: 8,
        cursor:       'pointer', transition: 'background 0.12s',
        outline:      'none',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
        border:     isDone ? 'none' : `2px solid ${isCurrent ? '#C4614A' : '#E4D9C8'}`,
        background: isDone ? '#4A9050' : 'transparent',
        display:    'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: 'white', fontWeight: 700, transition: 'all 0.12s',
      }}>
        {isDone ? '✓' : ''}
      </div>

      {/* Row label */}
      <span style={{
        fontFamily:     "'DM Sans', sans-serif",
        fontWeight:     isCurrent ? 700 : 600,
        fontSize:       12,
        flexShrink:     0,
        minWidth:       50,
        color:          isDone ? '#B8AAA0' : isCurrent ? '#C4614A' : '#2C2218',
        textDecoration: isDone ? 'line-through' : 'none',
      }}>
        {row.label} ({row.totalStitches}):
      </span>

      {/* Direction arrow — visible, tappable feel */}
      {cfg.showDirection && !isDone && (
        <DirectionArrow direction={row.direction} side={row.side} />
      )}

      {/* Stitch runs */}
      <span style={{
        fontFamily:     "'DM Sans', sans-serif",
        fontSize:       12,
        flex:           1,
        color:          isDone ? '#C8BFB0' : '#3C2E24',
        lineHeight:     1.5,
        textDecoration: isDone ? 'line-through' : 'none',
      }}>
        {runsText}
      </span>

      {isCurrent && (
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 10,
          color: '#C4614A', fontWeight: 700, flexShrink: 0,
        }}>
          NOW
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RowInstructionsProps {
  pattern:          PatternData
  completedRows:    Set<number>
  onToggleRow:      (rowNumber: number) => void
  onResetProgress?: () => void
  currentRowNumber: number
  /** e.g. "60×40 Single Crochet" — used in the email session-save */
  patternLabel?:    string
}

export default function RowInstructions({
  pattern, completedRows, onToggleRow, onResetProgress, currentRowNumber, patternLabel,
}: RowInstructionsProps) {
  const [listOpen, setListOpen] = useState(false)
  const [showAll,  setShowAll]  = useState(false)
  const [showSave, setShowSave] = useState(false)
  const currentRowRef = useRef<HTMLDivElement>(null)

  const cfg          = useMemo(() => getConfig(pattern.meta.stitchStyle), [pattern.meta.stitchStyle])
  const activeColors = useMemo(
    () => pattern.palette.filter(p => (p.stitchCount ?? 0) > 0).length,
    [pattern.palette]
  )
  const noteCtx: RowNoteCtx = useMemo(
    () => ({ activeColors, palette: pattern.palette }),
    [activeColors, pattern.palette]
  )

  const instructions = useMemo(() => generateInstructions(pattern), [pattern])
  const totalCount   = instructions.length
  const doneCount    = completedRows.size
  const pct          = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const allDone      = doneCount >= totalCount && totalCount > 0

  const currentRow   = instructions.find(r => r.rowNumber === currentRowNumber)
  const nextRow      = instructions.find(r => r.rowNumber === currentRowNumber + 1)

  const displayRows  = showAll ? instructions : instructions.slice(0, 50)
  const hasMore      = !showAll && instructions.length > 50

  // Runs in stitching order for the current-row card
  const currentDisplayRuns = useMemo(() => {
    if (!currentRow) return []
    return cfg.reverseRTL && currentRow.direction === 'rtl'
      ? [...currentRow.runs].reverse()
      : currentRow.runs
  }, [currentRow, cfg])

  // Scroll current row into view when list opens
  useEffect(() => {
    if (listOpen && currentRowRef.current) {
      setTimeout(() => {
        currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 140)
    }
  }, [listOpen, currentRowNumber])

  // ── Email session-save link ─────────────────────────────────────────
  function buildMailtoLink() {
    const sorted    = [...completedRows].sort((a, b) => a - b)
    const rowList   = sorted.length ? sorted.join(', ') : 'none yet'
    const label     = patternLabel ?? 'CraftWabi pattern'
    const subject   = encodeURIComponent(`CraftWabi progress — ${label}`)
    const body      = encodeURIComponent(
      `Saving my CraftWabi progress so I can pick up where I left off.\n\n` +
      `Pattern: ${label}\n` +
      `Progress: Row ${currentRowNumber} of ${totalCount} (${pct}% done)\n` +
      `Completed rows: ${rowList}\n\n` +
      `Progress is also saved automatically in my browser — just reopen CraftWabi on this device to continue.\n\n` +
      `Saved: ${new Date().toLocaleString()}`
    )
    return `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <div style={{
      background: 'white', borderRadius: 20,
      boxShadow: '0 2px 16px rgba(44,34,24,0.07)', overflow: 'hidden',
    }}>

      {/* ── Foundation hint (shown before first row is started) ────────── */}
      {cfg.foundationHint && currentRowNumber === 1 && !allDone && (
        <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🧶</span>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', fontWeight: 500 }}>
            {cfg.foundationHint(pattern.meta.width)}
          </p>
        </div>
      )}

      {/* ── Now Stitching card ─────────────────────────────────────────── */}
      {!allDone && currentRow ? (
        <div style={{ padding: '14px 16px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700,
              color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              Now stitching
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
              {currentRowNumber} of {totalCount}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: 5, background: '#F2EAD8', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{
              height: '100%', borderRadius: 3, width: `${pct}%`,
              background: '#C4614A', transition: 'width 0.35s ease',
            }} />
          </div>

          {/* Instruction card */}
          <div style={{
            background: '#FAF6EF', borderRadius: 14, padding: '12px 14px',
            marginBottom: 12, borderLeft: '3px solid #C4614A',
          }}>
            {/* Row meta + direction */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                color: '#9A8878', fontWeight: 600, margin: 0,
              }}>
                {currentRow.label} · {currentRow.totalStitches} {(() => {
                  const ab = cfg.abbrevFn?.(currentRow) ?? cfg.abbrev
                  return ab ? `${ab}${currentRow.totalStitches !== 1 ? 's' : ''}` : 'stitches'
                })()}
              </p>
              {cfg.showDirection && (
                <DirectionArrow direction={currentRow.direction} side={currentRow.side} size="large" />
              )}
            </div>

            {/* Turn / chain note */}
            {cfg.turnNote && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                color: '#B8AAA0', marginBottom: 8, fontStyle: 'italic',
              }}>
                {cfg.turnNote}
              </p>
            )}

            {/* Stitch runs */}
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 17,
              fontWeight: 700, color: '#2C2218', lineHeight: 1.5,
              letterSpacing: '0.01em', margin: 0,
            }}>
              {currentDisplayRuns.map((r, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: '#D4C4B4', margin: '0 5px' }}>·</span>}
                  {r.count} {r.symbol}
                </span>
              ))}
            </p>

            {/* Per-row contextual note */}
            {cfg.rowNote && (() => {
              const note = cfg.rowNote!(currentRow, noteCtx)
              return note ? (
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                  color: '#7A5C44', marginTop: 10, marginBottom: 0,
                  background: 'rgba(196,97,74,0.06)', borderRadius: 8,
                  padding: '6px 10px', lineHeight: 1.5,
                }}>
                  💡 {note}
                </p>
              ) : null
            })()}
          </div>

          {/* Done button */}
          <button
            onClick={() => onToggleRow(currentRowNumber)}
            style={{
              width: '100%', padding: '15px',
              background: '#C4614A', color: 'white',
              border: 'none', borderRadius: 14,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(196,97,74,0.25)',
            }}
          >
            ✓ Done{nextRow ? ` — ${nextRow.label} next` : ' — Last row!'}
          </button>
        </div>

      ) : allDone ? (
        /* ── All done ─────────────────────────────────────────────────── */
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
          <p style={{
            fontFamily: "'Playfair Display', serif", fontSize: 20,
            fontWeight: 700, color: '#2C2218', marginBottom: 6,
          }}>
            All rows complete!
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', marginBottom: 14 }}>
            Time to download your pattern and start stitching.
          </p>
          {onResetProgress && (
            <button
              onClick={onResetProgress}
              style={{
                background: 'none', border: 'none',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, color: '#C8BFB0', cursor: 'pointer',
              }}
            >
              Reset progress
            </button>
          )}
        </div>
      ) : null}

      {/* ── Save session strip ─────────────────────────────────────────── */}
      {doneCount > 0 && !allDone && (
        <div style={{
          borderTop: '1px solid #F2EAD8', padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FDFAF5',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>💾</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
              Progress saved in this browser
            </span>
          </div>
          <button
            onClick={() => setShowSave(s => !s)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", fontSize: 11,
              color: '#C4614A', fontWeight: 600,
            }}
          >
            {showSave ? 'Close ↑' : '📧 Email for later'}
          </button>
        </div>
      )}

      {/* ── Email save panel ─────────────────────────────────────────────── */}
      {showSave && doneCount > 0 && (
        <div style={{
          borderTop: '1px solid #F2EAD8', padding: '14px 16px',
          background: '#FFF8F0',
        }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
            fontWeight: 700, color: '#2C2218', marginBottom: 4,
          }}>
            Finishing for today?
          </p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 11,
            color: '#6B5744', marginBottom: 12, lineHeight: 1.6,
          }}>
            Your progress ({pct}% · row {currentRowNumber} of {totalCount}) is already saved
            in this browser. Email yourself a reminder so you know where you left off —
            especially if you might switch devices.
          </p>
          <a
            href={buildMailtoLink()}
            style={{
              display: 'block', width: '100%', padding: '12px',
              background: '#C4614A', color: 'white', textAlign: 'center',
              borderRadius: 12, textDecoration: 'none',
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
              boxShadow: '0 2px 10px rgba(196,97,74,0.22)',
            }}
          >
            📧 Open email with progress summary
          </a>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 10,
            color: '#C8BFB0', textAlign: 'center', marginTop: 8,
          }}>
            Opens your email app with a pre-filled summary — nothing is sent automatically.
          </p>
        </div>
      )}

      {/* ── View all rows toggle ──────────────────────────────────────── */}
      <button
        onClick={() => setListOpen(o => !o)}
        style={{
          width: '100%', padding: '11px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: listOpen ? 'white' : '#FAF6EF',
          border: 'none', borderTop: '1px solid #F2EAD8',
          borderBottom: listOpen ? '1px solid #F2EAD8' : 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#6B5744' }}>
          {listOpen ? 'Hide row list' : `View all ${totalCount} rows`}
          {doneCount > 0 && !allDone && (
            <span style={{ color: '#9A8878', fontWeight: 400, marginLeft: 6 }}>
              ({doneCount} done)
            </span>
          )}
        </span>
        <span style={{
          fontSize: 14, color: '#C4614A',
          transform: listOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>
          ⌄
        </span>
      </button>

      {/* ── Full row list ──────────────────────────────────────────────── */}
      {listOpen && (
        <>
          {/* How-to key */}
          <div style={{ background: '#FFF8F0', borderBottom: '1px solid #F2EAD8', padding: '10px 16px' }}>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11,
              fontWeight: 700, color: '#C4614A', marginBottom: 6,
            }}>
              How to read this
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cfg.helpItems.map((item, i) => (
                <p key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', margin: 0 }}>
                  • {item}
                </p>
              ))}
            </div>
            {/* Colour key */}
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pattern.palette.filter(p => (p.stitchCount ?? 0) > 0).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: p.hex, border: '1px solid rgba(44,34,24,0.15)', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#2C2218', fontWeight: 600 }}>{p.symbol}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>{p.label ?? `Colour ${i + 1}`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div style={{
            padding: '6px 16px 6px 42px', background: '#FAF6EF',
            borderBottom: '1px solid #F2EAD8', display: 'flex', gap: 8,
          }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600,
              color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 70,
            }}>
              Row (sts)
            </span>
            {cfg.showDirection && (
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600,
                color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 48,
              }}>
                Dir.
              </span>
            )}
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600,
              color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {cfg.columnLabel}
            </span>
          </div>

          {/* Rows */}
          {displayRows.map((row, i) => {
            const isDone    = completedRows.has(row.rowNumber)
            const isCurrent = row.rowNumber === currentRowNumber
            const note      = cfg.rowNote?.(row, noteCtx) ?? null
            return (
              <div key={row.rowNumber} ref={isCurrent ? currentRowRef : null}>
                <RowLine
                  row={row}
                  cfg={cfg}
                  isEven={i % 2 === 0}
                  isDone={isDone}
                  isCurrent={isCurrent}
                  onToggle={() => onToggleRow(row.rowNumber)}
                />
                {note && !isDone && (
                  <div style={{
                    padding: '3px 14px 5px 50px',
                    background: isCurrent ? 'rgba(196,97,74,0.04)' : i % 2 === 0 ? '#FDFAF5' : 'white',
                    borderBottom: '1px solid #F2EAD8',
                  }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', fontStyle: 'italic' }}>
                      💡 {note}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Footer */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #F2EAD8', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hasMore && (
              <button
                onClick={() => setShowAll(true)}
                style={{
                  width: '100%', padding: '10px', background: '#FAF6EF',
                  border: 'none', borderRadius: 10,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', cursor: 'pointer',
                }}
              >
                Show all {totalCount} rows ↓
              </button>
            )}
            {doneCount > 0 && !allDone && onResetProgress && (
              <button
                onClick={onResetProgress}
                style={{
                  width: '100%', padding: '8px', background: 'transparent',
                  border: 'none', fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11, color: '#C8BFB0', cursor: 'pointer',
                }}
              >
                Reset progress
              </button>
            )}
            <button
              onClick={() => { setListOpen(false); setShowAll(false) }}
              style={{
                width: '100%', padding: '8px', background: 'transparent',
                border: 'none', fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, color: '#9A8878', cursor: 'pointer',
              }}
            >
              Collapse ↑
            </button>
          </div>
        </>
      )}
    </div>
  )
}
