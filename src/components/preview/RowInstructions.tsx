'use client'

import { useState, useMemo } from 'react'
import { PatternData } from '@/types/pattern'
import { generateInstructions, RowInstruction } from '@/modules/instructions/generateInstructions'

interface RowInstructionsProps {
  pattern: PatternData
}

function RowLine({ row, isEven }: { row: RowInstruction; isEven: boolean }) {
  // Format: Row 1 (10 sts): 3 ■, 5 ●, 2 ■
  const runsText = row.runs.map(r => `${r.count} ${r.symbol}`).join(', ')

  return (
    <div style={{
      padding: '8px 16px',
      background: isEven ? '#FDFAF5' : 'white',
      borderBottom: '1px solid #F2EAD8',
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
    }}>
      {/* Row label + total */}
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: 12,
        color: row.isFirstRow ? '#C4614A' : '#2C2218',
        flexShrink: 0,
        minWidth: 100,
      }}>
        {row.label} ({row.totalStitches} sts):
      </span>

      {/* Stitch runs */}
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        color: '#3C2E24',
        lineHeight: 1.5,
      }}>
        {runsText}
      </span>
    </div>
  )
}

export default function RowInstructions({ pattern }: RowInstructionsProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAll,  setShowAll]  = useState(false)

  const instructions = useMemo(() => generateInstructions(pattern), [pattern])
  const PREVIEW = 5
  const displayRows = expanded
    ? (showAll ? instructions : instructions.slice(0, 30))
    : instructions.slice(0, PREVIEW)

  const hasMore = expanded && !showAll && instructions.length > 30

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
        <div style={{ textAlign: 'left' }}>
          <p style={{
            fontSize: 11, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#6B5744', fontFamily: "'DM Sans', sans-serif",
            marginBottom: 2,
          }}>
            Row Instructions
          </p>
          <p style={{ fontSize: 12, color: '#9A8878', fontFamily: "'DM Sans', sans-serif" }}>
            {instructions.length} rows · bottom to top
          </p>
        </div>
        <span style={{
          fontSize: 18, color: '#C4614A',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
          display: 'inline-block',
        }}>⌄</span>
      </button>

      {expanded && (
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
            padding: '5px 16px',
            background: '#FAF6EF',
            borderBottom: '1px solid #F2EAD8',
            display: 'flex', gap: 8,
          }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 100 }}>
              Row (stitches)
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Left → right
            </span>
          </div>

          {displayRows.map((row, i) => (
            <RowLine key={row.rowNumber} row={row} isEven={i % 2 === 0} />
          ))}

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
          {displayRows.map((row, i) => (
            <RowLine key={row.rowNumber} row={row} isEven={i % 2 === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
