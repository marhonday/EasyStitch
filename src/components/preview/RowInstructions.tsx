'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { PatternData } from '@/types/pattern'
import { generateInstructions, RowInstruction } from '@/modules/instructions/generateInstructions'

interface RowInstructionsProps {
  pattern:          PatternData
  completedRows:    Set<number>
  onToggleRow:      (rowNumber: number) => void
  onResetProgress?: () => void
  currentRowNumber: number
}

function RowLine({
  row, isEven, isDone, isCurrent, onToggle,
}: {
  row:       RowInstruction
  isEven:    boolean
  isDone:    boolean
  isCurrent: boolean
  onToggle:  () => void
}) {
  const runsText = row.runs.map(r => `${r.count} ${r.symbol}`).join(', ')
  return (
    <div
      onClick={onToggle}
      style={{
        padding:      '9px 14px 9px 12px',
        background:   isCurrent
          ? 'rgba(196,97,74,0.07)'
          : isDone
            ? 'rgba(74,144,80,0.04)'
            : isEven ? '#FDFAF5' : 'white',
        borderBottom: '1px solid #F2EAD8',
        borderLeft:   `3px solid ${isCurrent ? '#C4614A' : isDone ? '#4A9050' : 'transparent'}`,
        display:      'flex', alignItems: 'center', gap: 10,
        cursor:       'pointer', transition: 'background 0.12s',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
        border:     isDone ? 'none' : `2px solid ${isCurrent ? '#C4614A' : '#E4D9C8'}`,
        background: isDone ? '#4A9050' : 'transparent',
        display:    'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: 'white', fontWeight: 700, transition: 'all 0.12s',
      }}>
        {isDone ? '✓' : ''}
      </div>
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontWeight: isCurrent ? 700 : 600,
        fontSize: 12, flexShrink: 0, minWidth: 90,
        color: isDone ? '#B8AAA0' : isCurrent ? '#C4614A' : '#2C2218',
        textDecoration: isDone ? 'line-through' : 'none',
      }}>
        {row.label} ({row.totalStitches} sts):
      </span>
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, flex: 1,
        color: isDone ? '#C8BFB0' : '#3C2E24', lineHeight: 1.5,
        textDecoration: isDone ? 'line-through' : 'none',
      }}>
        {runsText}
      </span>
      {isCurrent && (
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C4614A', fontWeight: 600, flexShrink: 0 }}>
          ← now
        </span>
      )}
    </div>
  )
}

export default function RowInstructions({
  pattern, completedRows, onToggleRow, onResetProgress, currentRowNumber,
}: RowInstructionsProps) {
  const [listOpen, setListOpen] = useState(false)
  const [showAll,  setShowAll]  = useState(false)
  const currentRowRef = useRef<HTMLDivElement>(null)

  const instructions = useMemo(() => generateInstructions(pattern), [pattern])
  const totalCount   = instructions.length
  const doneCount    = completedRows.size
  const pct          = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const allDone      = doneCount >= totalCount && totalCount > 0

  const currentRow   = instructions.find(r => r.rowNumber === currentRowNumber)
  const nextRow      = instructions.find(r => r.rowNumber === currentRowNumber + 1)

  const displayRows  = showAll ? instructions : instructions.slice(0, 50)
  const hasMore      = !showAll && instructions.length > 50

  // Scroll current row into view when list opens
  useEffect(() => {
    if (listOpen && currentRowRef.current) {
      setTimeout(() => {
        currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 140)
    }
  }, [listOpen, currentRowNumber])

  return (
    <div style={{
      background: 'white', borderRadius: 20,
      boxShadow: '0 2px 16px rgba(44,34,24,0.07)', overflow: 'hidden',
    }}>

      {/* ── Now Stitching card (always visible) ──────────────────────── */}
      {!allDone && currentRow ? (
        <div style={{ padding: '16px 16px 14px' }}>

          {/* Row label + count */}
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
              height: '100%', borderRadius: 3,
              width: `${pct}%`, background: '#C4614A',
              transition: 'width 0.35s ease',
            }} />
          </div>

          {/* Instruction card */}
          <div style={{
            background: '#FAF6EF', borderRadius: 14,
            padding: '12px 14px', marginBottom: 12,
            borderLeft: '3px solid #C4614A',
          }}>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11,
              color: '#9A8878', marginBottom: 5, fontWeight: 600,
            }}>
              Row {currentRowNumber} · {currentRow.totalStitches} stitches
            </p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 17,
              fontWeight: 700, color: '#2C2218', lineHeight: 1.5,
              letterSpacing: '0.01em',
            }}>
              {currentRow.runs.map((r, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: '#D4C4B4', margin: '0 5px' }}>·</span>}
                  {r.count} {r.symbol}
                </span>
              ))}
            </p>
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
              letterSpacing: '0.01em',
            }}
          >
            ✓ Done{nextRow ? ` — Row ${nextRow.rowNumber} next` : ' — Last row!'}
          </button>
        </div>

      ) : allDone ? (
        /* ── All done state ─────────────────────────────────────────── */
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

      {/* ── Divider + View all rows toggle ───────────────────────────── */}
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
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12,
          fontWeight: 600, color: '#6B5744',
        }}>
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

      {/* ── Full row list ─────────────────────────────────────────────── */}
      {listOpen && (
        <>
          {/* How-to key */}
          <div style={{ background: '#FFF8F0', borderBottom: '1px solid #F2EAD8', padding: '10px 16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', marginBottom: 5 }}>
              How to read this
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744' }}>
                • <strong>Row 1</strong> = bottom edge of your blanket — work upward
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744' }}>
                • Each row: stitch <strong>left → right</strong>
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744' }}>
                • <strong>3 ■</strong> means 3 stitches in that colour, one after the other
              </p>
            </div>
            {/* Colour key */}
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
            padding: '6px 16px 6px 38px', background: '#FAF6EF',
            borderBottom: '1px solid #F2EAD8', display: 'flex', gap: 10,
          }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 90 }}>
              Row (sts)
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Stitches (left → right)
            </span>
          </div>

          {displayRows.map((row, i) => {
            const isDone    = completedRows.has(row.rowNumber)
            const isCurrent = row.rowNumber === currentRowNumber
            return (
              <div key={row.rowNumber} ref={isCurrent ? currentRowRef : null}>
                <RowLine
                  row={row} isEven={i % 2 === 0}
                  isDone={isDone} isCurrent={isCurrent}
                  onToggle={() => onToggleRow(row.rowNumber)}
                />
              </div>
            )
          })}

          <div style={{ padding: '10px 14px', borderTop: '1px solid #F2EAD8', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hasMore && (
              <button
                onClick={() => setShowAll(true)}
                style={{
                  width: '100%', padding: '10px', background: '#FAF6EF',
                  border: 'none', borderRadius: 10,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  color: '#6B5744', cursor: 'pointer',
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
