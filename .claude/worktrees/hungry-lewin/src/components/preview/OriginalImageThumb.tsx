'use client'

import { useRef, useEffect } from 'react'
import { PatternData } from '@/types/pattern'
import { drawPatternThumbnail } from '@/modules/preview-rendering/canvasRenderer'

interface OriginalImageThumbProps {
  originalSrc:  string | null
  pattern:      PatternData
}

export default function OriginalImageThumb({ originalSrc, pattern }: OriginalImageThumbProps) {
  const thumbCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (thumbCanvasRef.current && pattern) {
      drawPatternThumbnail(thumbCanvasRef.current, pattern)
    }
  }, [pattern])

  const thumbWidth  = pattern.meta.width  * 6
  const thumbHeight = pattern.meta.height * 6

  return (
    <div style={{
      background: 'white', borderRadius: 20,
      padding: 16, boxShadow: '0 2px 16px rgba(44,34,24,0.07)',
    }}>
      <p style={{
        fontSize: 11, fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: '#6B5744', fontFamily: "'DM Sans', sans-serif",
        marginBottom: 12,
      }}>
        Original → Pattern
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Original photo */}
        <div>
          <p style={{ fontSize: 11, color: '#C8BFB0', fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
            Photo
          </p>
          <div style={{ borderRadius: 12, overflow: 'hidden', background: '#FFFFFF', lineHeight: 0 }}>
            {originalSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={originalSrc}
                alt="Original"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            ) : (
              <span style={{ fontSize: 28, lineHeight: 'normal', display: 'block', padding: 16 }}>🖼</span>
            )}
          </div>
        </div>

        {/* Pattern thumbnail */}
        <div>
          <p style={{ fontSize: 11, color: '#C8BFB0', fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
            Pattern
          </p>
          <div style={{ borderRadius: 12, overflow: 'hidden', lineHeight: 0 }}>
            <canvas
              ref={thumbCanvasRef}
              width={thumbWidth}
              height={thumbHeight}
              style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', display: 'block' }}
              aria-label="Pattern thumbnail"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
