'use client'

/**
 * components/preview/ColorLegend.tsx
 *
 * Displays the reduced colour palette with:
 * - Colour swatch
 * - Symbol character
 * - Colour label (if available) or fallback "Colour N"
 * - Stitch count and percentage
 *
 * Tapping a swatch highlights that colour in the parent (via onSelect).
 * This is optional — component works fine without the callback.
 */

import { useRef } from 'react'
import { ColorEntry } from '@/types/pattern'

interface ColorLegendProps {
  palette:         ColorEntry[]
  totalStitches:   number
  selectedIndex?:  number | null
  onSelect?:       (index: number | null) => void
  onColorChange?:  (paletteIndex: number, newHex: string) => void
  hasOverrides?:   boolean
  onResetColors?:  () => void
}

export default function ColorLegend({
  palette,
  totalStitches,
  selectedIndex = null,
  onSelect,
  onColorChange,
  hasOverrides,
  onResetColors,
}: ColorLegendProps) {
  const colorInputRefs = useRef<(HTMLInputElement | null)[]>([])

  function handleTap(i: number) {
    if (!onSelect) return
    onSelect(selectedIndex === i ? null : i)
  }

  function handleSwatchClick(e: React.MouseEvent, i: number) {
    if (onColorChange) {
      e.stopPropagation()
      colorInputRefs.current[i]?.click()
    } else {
      handleTap(i)
    }
  }

  return (
    <div style={{
      background:   'white',
      borderRadius: 20,
      padding:      16,
      boxShadow:    '0 2px 16px rgba(44,34,24,0.07)',
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   14,
      }}>
        <div>
          <p style={{
            fontSize:      11,
            fontWeight:    500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color:         '#6B5744',
            fontFamily:    "'DM Sans', sans-serif",
          }}>
            Colour Key
          </p>
          {onColorChange && (
            <p style={{ fontSize: 10, color: '#9A8878', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
              Tap a swatch to change colour
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasOverrides && onResetColors && (
            <button
              onClick={onResetColors}
              style={{
                fontSize: 10, color: '#C4614A',
                border: 'none',
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer', padding: '2px 6px',
                borderRadius: 6,
                background: 'rgba(196,97,74,0.08)',
              }}
            >
              Reset
            </button>
          )}
          <p style={{ fontSize: 11, color: '#C8BFB0', fontFamily: "'DM Sans', sans-serif" }}>
            {palette.filter(e => (e.stitchCount ?? 0) > 0).length} colour{palette.filter(e => (e.stitchCount ?? 0) > 0).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Swatches — only show colors actually used in the grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {palette.filter(entry => (entry.stitchCount ?? 0) > 0).map((entry, i) => {
          const realIdx = palette.indexOf(entry)
          const count   = entry.stitchCount ?? 0
          const pct     = totalStitches > 0 ? Math.round((count / totalStitches) * 100) : 0
          const isSelected = selectedIndex === realIdx

          return (
            <button
              key={realIdx}
              onClick={() => handleTap(realIdx)}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           10,
                background:    isSelected ? 'rgba(196,97,74,0.06)' : 'transparent',
                border:        `1.5px solid ${isSelected ? '#C4614A' : 'transparent'}`,
                borderRadius:  12,
                padding:       '8px 10px',
                cursor:        'pointer',
                textAlign:     'left',
                transition:    'all 0.15s ease',
                position:      'relative',
              }}
            >
              {/* Swatch — clicking opens color picker if enabled */}
              <div
                onClick={(e) => handleSwatchClick(e, realIdx)}
                style={{
                  width:        36,
                  height:       36,
                  borderRadius: 10,
                  flexShrink:   0,
                  background:   entry.hex,
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  fontSize:     15,
                  color:        'rgba(255,255,255,0.9)',
                  boxShadow:    '0 2px 8px rgba(44,34,24,0.15)',
                  fontFamily:   'sans-serif',
                  cursor:       onColorChange ? 'pointer' : 'default',
                  position:     'relative',
                }}
              >
                {entry.symbol}
                {onColorChange && (
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    background: 'white', borderRadius: '50%',
                    width: 14, height: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}>
                    ✏️
                  </div>
                )}
                {/* Hidden native color input */}
                {onColorChange && (
                  <input
                    ref={el => { colorInputRefs.current[realIdx] = el }}
                    type="color"
                    value={entry.hex}
                    onChange={e => onColorChange(realIdx, e.target.value)}
                    style={{
                      position: 'absolute', opacity: 0,
                      width: 1, height: 1, pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              {/* Label + count */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize:   13,
                  fontWeight: 500,
                  color:      '#2C2218',
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: 'nowrap',
                  overflow:   'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {entry.label ?? `Colour ${realIdx + 1}`}
                </div>
                <div style={{
                  fontSize:   11,
                  color:      '#6B5744',
                  fontFamily: "'DM Sans', sans-serif",
                  marginTop:  2,
                }}>
                  {count.toLocaleString()} st · {pct}%
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
