'use client'

/**
 * components/preview/PatternMetadata.tsx
 *
 * Displays pattern stats in a 2×2 tile grid:
 * grid dimensions, total stitches, stitch style, colour count.
 *
 * Pure display — no interaction.
 */

import { PatternMeta } from '@/types/pattern'
import { STITCH_STYLE_META } from '@/lib/constants'

interface PatternMetadataProps {
  meta: PatternMeta
}

export default function PatternMetadata({ meta }: PatternMetadataProps) {
  const styleName = STITCH_STYLE_META[meta.stitchStyle]?.label ?? meta.stitchStyle

  const tiles = [
    { label: 'Grid size',      value: `${meta.width}×${meta.height}` },
    { label: 'Total stitches', value: meta.totalStitches.toLocaleString() },
    { label: 'Stitch style',   value: styleName },
    { label: 'Colours',        value: String(meta.colorCount) },
  ]

  return (
    <div style={{
      background:   'white',
      borderRadius: 20,
      padding:      16,
      boxShadow:    '0 2px 16px rgba(44,34,24,0.07)',
    }}>
      <p style={{
        fontSize:      11,
        fontWeight:    500,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color:         '#6B5744',
        fontFamily:    "'DM Sans', sans-serif",
        marginBottom:  12,
      }}>
        Pattern Info
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {tiles.map(tile => (
          <div key={tile.label} style={{
            background:   '#FAF6EF',
            borderRadius: 12,
            padding:      '12px 14px',
          }}>
            <div style={{
              fontSize:   11,
              color:      '#6B5744',
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: 4,
            }}>
              {tile.label}
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize:   18,
              fontWeight: 700,
              color:      '#2C2218',
            }}>
              {tile.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
