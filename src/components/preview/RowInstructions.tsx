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
  row:      RowInstruction
  isEven:   boolean
  isDone:   boolean
  isCurrent: boolean
  onToggle: () => void
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
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        cursor:       'pointer',
        transition:   'background 0.12s',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
        border:      isDone ? 'none' : `2px solid ${isCurrent ? '#C4614A' : '#E4D9C8'}`,
        background:  isDone ? '#4A9050' : 'transparent',
        display:     'flex', alignItems: 'center', justifyContent: 'center',
        fontSize:    11, color: 'white', fontWeight: 700,
        transition:  'all 0.12s',
      }}>
        {isDone ? '✓' : ''}
      </div>

      {/* Row label */}
      <span style={{
        fontFamily:     "'DM Sans', sans-serif",
        fontWeight:     isCurrent ? 700 : 600,
        fontSize:       12,
        color:          isDone ? '#B8AAA0' : isCurrent ? '#C4614A' : '#2C2218',
        flexShrink:     0,
        minWidth:       90,
        textDecoration: isDone ? 'line-through' : 'none',
      }}>
        {row.label} ({row.totalStitches} sts):
      </span>

      {/* Stitch runs */}
      <span style={{
        fontFamily:     "'DM Sans', sans-serif",
        fontSize:       12,
        color:          isDone ? '#C8BFB0' : '#3C2E24',
        lineHeight:     1.5,
        flex:           1,
        textDecoration: isDone ? 'line-through' : 'none',
      }}>
        {runsText}
      </span>

      {isCurrent && (
        <span style={{
          fontSize: 10, color: '#C4614A',
          fontFamily: "'DM Sans', sans-serif",
          flexShrink: 0, fontWeight: 600,
        }}>
          ← now
        </span>
      )}
    </div>
  )
}

export default function RowInstructions({
  pattern, completedRows, onToggleRow, onResetProgress, currentRowNumber,
}: RowInstructionsProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAll,  setShowAll]  = useState(false)
  const currentRowRef = useRef<HTMLDivElement>(null)

  const instructions = useMemo(() => generateInstructions(pattern), [pattern])
  const PREVIEW  = 5
  const displayRows = expanded
    ? (showAll ? instructions : instructions.slice(0, 50))
    : instructions.slice(0, PREVIEW)
  const hasMore = expanded && !showAll && instructions.length > 50

  const doneCount  = completedRows.size
  const totalCount = instructions.length
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const allDone    = doneCount >= totalCount && totalCount > 0

  // Scroll current row into view when expanded
  useEffect(() => {
    if (expanded && currentRowRef.current) {
      setTimeout(() => {
        currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 120)
    }
  }, [expanded, currentRowNumber])

  return (
    <div style={{
      background: 'white', borderRadius: 20,
      boxShadow: '0 2px 16px rgba(44,34,24,0.07)', overflow: 'hidden',
    }}>

      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'white', border: 'none', cursor: 'pointer',
          borderBottom: expanded ? '1px solid #F2EAD8' : 'none',
        }}
      >
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <p style={{
              fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#6B5744', fontFamily: "'DM Sans', sans-serif",
              margin: 0,
            }}>
              Row Instructions
            </p>
            {doneCount > 0 && (
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                color: allDone ? '#4A9050' : '#C4614A',
                background: allDone ? 'rgba(74,144,80,0.1)' : 'rgba(196,97,74,0.08)',
                borderRadius: 999, padding: '1px 8px',
              }}>
                {allDone ? '🎉 All done!' : `${doneCount}/${totalCount} rows`}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', maxWidth: 220, height: 5, background: '#F2EAD8', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${pct}%`,
              background: allDone ? '#4A9050' : '#C4614A',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ fontSize: 11, color: '#9A8878', fontFamily: "'DM Sans', sans-serif", marginTop: 4, marginBottom: 0 }}>
            {doneCount === 0
              ? `${totalCount} rows · tap a row to mark done`
              : allDone
                ? 'All rows complete — happy stitching! 🧶'
                : `Row ${currentRowNumber} of ${totalCount} · bottom to top`}
          </p>
        </div>
        <span style={{
          fontSize: 18, color: '#C4614A', marginLeft: 12,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
          display: 'inline-block',
        }}>⌄</span>
      </button>

      {expanded && (
        <>
          {/* Column headers */}
          <div style={{
            padding: '6px 16px', background: '#FAF6EF',
            borderBottom: '1px solid #F2EAD8', display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <div style={{ width: 20, flexShrink: 0 }} />
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
                  row={row}
                  isEven={i % 2 === 0}
                  isDone={isDone}
                  isCurrent={isCurrent}
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
                  width: '100%', padding: '10px',
                  background: '#FAF6EF', border: 'none', borderRadius: 10,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  color: '#6B5744', cursor: 'pointer',
                }}
              >
                Show all {instructions.length} rows ↓
              </button>
            )}
            {doneCount > 0 && onResetProgress && (
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
              onClick={() => { setExpanded(false); setShowAll(false) }}
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

      {/* Collapsed preview */}
      {!expanded && (
        <div style={{ opacity: 0.45, pointerEvents: 'none' }}>
          {instructions.slice(0, PREVIEW).map((row, i) => (
            <RowLine
              key={row.rowNumber}
              row={row}
              isEven={i % 2 === 0}
              isDone={completedRows.has(row.rowNumber)}
              isCurrent={row.rowNumber === currentRowNumber}
              onToggle={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}
