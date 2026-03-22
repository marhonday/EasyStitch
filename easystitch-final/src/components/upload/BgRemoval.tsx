'use client'

/**
 * BgRemoval
 * 
 * Shows after crop, before generation.
 * Runs @imgly/background-removal entirely in-browser (WASM).
 * First load downloads the model (~40MB) — shows friendly message.
 * After processing shows before/after with Accept/Cancel.
 */

import { useState, useEffect, useRef } from 'react'

interface BgRemovalProps {
  imageUrl: string
  onAccept: (resultUrl: string) => void
  onCancel: () => void
  onSkip:   () => void
}

type Status = 'loading_model' | 'processing' | 'done' | 'error'

export default function BgRemoval({ imageUrl, onAccept, onCancel, onSkip }: BgRemovalProps) {
  const [status,    setStatus]    = useState<Status>('loading_model')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [progress,  setProgress]  = useState(0)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    runRemoval()
  }, [])

  async function runRemoval() {
    try {
      setStatus('loading_model')

      // Dynamic import so the heavy WASM only loads when this component mounts
      const { removeBackground } = await import('@imgly/background-removal')

      setStatus('processing')

      // Convert dataUrl to Blob
      const res    = await fetch(imageUrl)
      const blob   = await res.blob()

      const result = await removeBackground(blob, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) setProgress(Math.round((current / total) * 100))
        },
      })

      const url = URL.createObjectURL(result)
      setResultUrl(url)
      setStatus('done')
    } catch (err) {
      console.error('BG removal failed:', err)
      setStatus('error')
    }
  }

  const btnBase: React.CSSProperties = {
    flex: 1, padding: '14px', borderRadius: 14,
    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
    fontWeight: 600, cursor: 'pointer', border: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAF6EF' }}>

      {/* Header */}
      <div style={{ padding: '14px 20px', textAlign: 'center', flexShrink: 0, borderBottom: '1px solid #F2EAD8' }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218', margin: 0 }}>
          Remove Background
        </p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: 16, overflow: 'hidden' }}>

        {(status === 'loading_model' || status === 'processing') && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              border: '4px solid #E4D9C8', borderTopColor: '#C4614A',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
              {status === 'loading_model'
                ? 'Loading background removal model… this only happens once and may take a moment.'
                : `Processing… ${progress > 0 ? `${progress}%` : ''}`}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#C4614A', textAlign: 'center' }}>
              Background removal failed. You can skip and continue with the original image.
            </p>
          </>
        )}

        {status === 'done' && resultUrl && (
          <>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', margin: 0 }}>
              Before → After
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 400 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', background: '#F2EAD8' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Before" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', background: 'repeating-conic-gradient(#E4D9C8 0% 25%, #FAF6EF 0% 50%) 0 0 / 16px 16px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt="After" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>
          </>
        )}

      </div>

      {/* Buttons */}
      <div style={{ padding: '14px 20px', display: 'flex', gap: 10, flexShrink: 0, borderTop: '1px solid #F2EAD8' }}>
        {status === 'done' && resultUrl ? (
          <>
            <button onClick={onCancel} style={{ ...btnBase, background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8' }}>
              Cancel
            </button>
            <button onClick={() => onAccept(resultUrl)} style={{ ...btnBase, flex: 2, background: '#C4614A', color: 'white', boxShadow: '0 4px 16px rgba(196,97,74,0.28)' }}>
              Use this ✓
            </button>
          </>
        ) : (
          <>
            <button onClick={onSkip} style={{ ...btnBase, background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8' }}>
              Skip
            </button>
            {status === 'error' && (
              <button onClick={runRemoval} style={{ ...btnBase, background: '#C4614A', color: 'white' }}>
                Retry
              </button>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
