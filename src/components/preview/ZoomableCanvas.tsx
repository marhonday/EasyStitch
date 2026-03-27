'use client'

import { RefObject, useState } from 'react'

interface ZoomableCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement>
  label?: string
  showRowHint?: boolean
}

export default function ZoomableCanvas({ canvasRef, label, showRowHint }: ZoomableCanvasProps) {
  const [zoomed, setZoomed] = useState(false)

  return (
    <div style={{
      width: '100%',
      maxWidth: 400,
      background: 'white',
      borderRadius: 20,
      padding: 12,
      boxShadow: '0 2px 16px rgba(44,34,24,0.08)',
      overflow: 'hidden',
    }}>
      {label && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 8 }}>
          {label}
        </p>
      )}

      {/* Scrollable canvas area */}
      <div style={{
        overflow: zoomed ? 'scroll' : 'hidden',
        maxHeight: zoomed ? '65vh' : 'none',
        borderRadius: zoomed ? 4 : 12,
        position: 'relative',
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: zoomed ? '300%' : '100%',
            height: 'auto',
            display: 'block',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Footer: row hint + zoom toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 10,
          color: showRowHint ? '#C4614A' : 'transparent',
          flex: 1,
        }}>
          ← Highlighted row = current row in tracker below
        </p>
        <button
          onClick={() => setZoomed(v => !v)}
          style={{
            background: 'none',
            border: '1px solid #EDE4D8',
            borderRadius: 8,
            padding: '4px 10px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: '#6B5744',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {zoomed ? '⊖ Fit' : '⊕ Zoom'}
        </button>
      </div>
    </div>
  )
}
