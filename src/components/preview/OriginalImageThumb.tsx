'use client'

/**
 * components/preview/OriginalImageThumb.tsx
 *
 * Shows the original uploaded image alongside a small canvas thumbnail
 * of the generated pattern side by side — the "before/after" moment.
 *
 * The pattern thumbnail draws itself via useEffect on mount using
 * drawPatternThumbnail() — a small canvas render that runs once.
 */

import { useRef, useEffect } from 'react'
import { PatternData } from '@/types/pattern'
import { drawPatternThumbnail } from '@/modules/preview-rendering/canvasRenderer'

interface OriginalImageThumbProps {
  originalSrc:  string | null
  pattern:      PatternData
}

export default function OriginalImageThumb({
  originalSrc,
  pattern,
}: OriginalImageThumbProps) {
  const thumbCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (thumbCanvasRef.current && pattern) {
      drawPatternThumbnail(thumbCanvasRef.current, pattern)
    }
  }, [pattern])

  const thumbSize = computeThumbSize(pattern)

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
        Original → Pattern
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Original photo */}
        <div>
          <p style={{ fontSize: 11, color: '#C8BFB0', fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
            Photo
          </p>
          <div style={{
            borderRadius: 12,
            overflow:     'hidden',
            aspectRatio:  '1',
            background:   '#F2EAD8',
          }}>
            {originalSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={originalSrc}
                alt="Original uploaded photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28,
              }}>
                🖼
              </div>
            )}
          </div>
        </div>

        {/* Pattern thumbnail */}
        <div>
          <p style={{ fontSize: 11, color: '#C8BFB0', fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
            Pattern
          </p>
          <div style={{
            borderRadius: 12,
            overflow:     'hidden',
            aspectRatio:  '1',
            background:   '#E4D9C8',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
          }}>
            <canvas
              ref={thumbCanvasRef}
              width={thumbSize.width}
              height={thumbSize.height}
              style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
              aria-label="Pattern thumbnail"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Compute canvas dimensions for the thumbnail at 6px cells */
function computeThumbSize(pattern: PatternData) {
  return {
    width:  pattern.meta.width  * 6,
    height: pattern.meta.height * 6,
  }
}
