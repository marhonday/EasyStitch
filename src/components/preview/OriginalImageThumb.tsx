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

  const thumbSize = {
    width:  pattern.meta.width  * 6,
    height: pattern.meta.height * 6,
  }

  // Use pattern aspect ratio for both containers so they match
  const aspect = `${pattern.meta.width} / ${pattern.meta.height}`

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
          <div style={{
            borderRadius: 12, overflow: 'hidden',
            background: '#FFFFFF',
            aspectRatio: aspect,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {originalSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={originalSrc}
                alt="Original"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <span style={{ fontSize: 28 }}>🖼</span>
            )}
          </div>
        </div>

        {/* Pattern thumbnail */}
        <div>
          <p style={{ fontSize: 11, color: '#C8BFB0', fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
            Pattern
          </p>
          <div style={{
            borderRadius: 12, overflow: 'hidden',
            background: '#E4D9C8', aspectRatio: aspect,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <canvas
              ref={thumbCanvasRef}
              width={thumbSize.width}
              height={thumbSize.height}
              style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' }}
              aria-label="Pattern thumbnail"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
