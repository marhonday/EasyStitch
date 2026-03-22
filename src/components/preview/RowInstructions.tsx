'use client'

/**
 * RowInstructions — collapsible row-by-row stitch guide.
 * Shows each row as run-length encoded colour segments.
 * Collapsed by default — users tap to expand.
 */

import { useState, useMemo } from 'react'
import { PatternData } from '@/types/pattern'
import { generateInstructions, RowInstruction } from '@/modules/instructions/generateInstructions'

interface RowInstructionsProps {
  pattern: PatternData
}

function RunDot({ hex, symbol, count, colorName }: {
  hex: string; symbol: string; count: number; colorName: string
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${hex}22`,
      border: `1.5px solid ${hex}55`,
      borderRadius: 8, padding: '2px 7px',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 12, color: '#2C2218',
      whiteSpace: 'nowrap',
    }}
    title={colorName}
    >
      <span style={{
        width: 10, height: 10, borderRadius: '50%',
        background: hex, flexShrink: 0,
        display: 'inline-block',
      }} />
      {count} {symbol}
    </span>
  )
}

function RowItem({ row, isEven }: { row: RowInstruction; isEven: boolean }) {
  const firstWorkingRow = row.isFirstRow
  const stitchStyle = row.colorChanges === 0
    ? 'solid row'
    : `${row.colorChanges} colour change${row.colorChanges !== 1 ? 's' : ''}`

  return (
    <div style={{
      padding: '10px 14px',
      background: isEven ? '#FDFAF5' : 'white',
      borderBottom: '1px solid #F2EAD8',
    }}>
      {/* Row header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12,
          color: firstWorkingRow ? '#C4614A' : '#2C2218',
        }}>
          {row.label}{firstWorkingRow ? ' ← Start here' : ''}
        </span>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 11,
          color: '#9A8878',
        }}>
          {row.totalStitches} sts · {stitchStyle}
        </span>
      </div>

      {/* Run segments */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {row.runs.map((run, i) => (
          <RunDot key={i} hex={run.hex} symbol={run.symbol} count={run.count} colorName={run.colorName} />
        ))}
      </div>

      {/* Tapestry carry note */}
      {row.carriedColors && row.carriedColors.length > 0 && (
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 11,
          color: '#9A8878', marginTop: 5, fontStyle: 'italic',
        }}>
          Carry: {row.carriedColors.join(', ')}
        </p>
      )}
    </div>
  )
}

export default function RowInstructions({ pattern }: RowInstructionsProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAll,  setShowAll]  = useState(false)

  const instructions = useMemo(() => generateInstructions(pattern), [pattern])

  const PREVIEW_COUNT = 5
  const displayRows = expanded
    ? (showAll ? instructions : instructions.slice(0, 20))
    : instructions.slice(0, PREVIEW_COUNT)

  const hasMore = expanded && !showAll && instructions.length > 20

  return (
    <div style={{
      background: 'white', borderRadius: 20,
      boxShadow: '0 2px 16px rgba(44,34,24,0.07)', overflow: 'hidden',
    }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'white', border: 'none', cursor: 'pointer',
          borderBottom: expanded ? '1px solid #F2EAD8' : 'none',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{
            fontSize: 11, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#6B5744', fontFamily: "'DM Sans', sans-serif",
            marginBottom: 2,
          }}>
            Row Instructions
          </p>
          <p style={{
            fontSize: 12, color: '#9A8878',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {instructions.length} rows · work bottom to top
          </p>
        </div>
        <span style={{
          fontSize: 18, color: '#C4614A',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
          display: 'inline-block',
        }}>
          ⌄
        </span>
      </button>

      {/* Instructions list */}
      {expanded && (
        <>
          {/* Legend */}
          <div style={{
            padding: '10px 14px',
            background: 'rgba(196,97,74,0.04)',
            borderBottom: '1px solid #F2EAD8',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, color: '#6B5744',
          }}>
            📍 Row 1 = bottom of your pattern. Work left to right, then right to left on alternating rows.
          </div>

          {displayRows.map((row, i) => (
            <RowItem key={row.rowNumber} row={row} isEven={i % 2 === 0} />
          ))}

          {/* Show more / collapse */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #F2EAD8' }}>
            {hasMore && (
              <button
                onClick={() => setShowAll(true)}
                style={{
                  width: '100%', padding: '10px',
                  background: '#FAF6EF', border: 'none', borderRadius: 10,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  color: '#6B5744', cursor: 'pointer', marginBottom: 8,
                }}
              >
                Show all {instructions.length} rows ↓
              </button>
            )}
            <button
              onClick={() => { setExpanded(false); setShowAll(false) }}
              style={{
                width: '100%', padding: '10px',
                background: 'transparent', border: 'none',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                color: '#9A8878', cursor: 'pointer',
              }}
            >
              Collapse ↑
            </button>
          </div>
        </>
      )}

      {/* Collapsed preview rows */}
      {!expanded && (
        <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
          {displayRows.map((row, i) => (
            <RowItem key={row.rowNumber} row={row} isEven={i % 2 === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
