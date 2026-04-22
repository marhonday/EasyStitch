'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { detectGrid, detectGridManual, GridDetectionResult } from '@/lib/gridDetection'
import { saveTracked, patternFromDetection, TRACKER_SYMBOLS } from '@/lib/patternTracker'
import { StitchStyle } from '@/types/pattern'

const STITCH_OPTIONS: { value: StitchStyle; label: string; icon: string }[] = [
  { value: 'singleCrochet',    label: 'Single Crochet',    icon: '▦' },
  { value: 'c2c',              label: 'C2C',               icon: '◪' },
  { value: 'tapestry',         label: 'Tapestry',          icon: '⬛' },
  { value: 'mosaic',           label: 'Mosaic',            icon: '◈' },
  { value: 'crossStitch',      label: 'Cross Stitch',      icon: '✚' },
  { value: 'knittingStranded', label: 'Knitting',          icon: '🧵' },
]

type Step = 'idle' | 'detecting' | 'result' | 'saving'

export default function TrackUploadPage() {
  const router = useRouter()

  const [step,          setStep]          = useState<Step>('idle')
  const [imageDataUrl,  setImageDataUrl]  = useState<string | null>(null)
  const [detection,     setDetection]     = useState<GridDetectionResult | null>(null)
  const [error,         setError]         = useState<string | null>(null)

  // Setup fields
  const [patternName,   setPatternName]   = useState('My Pattern')
  const [stitchStyle,   setStitchStyle]   = useState<StitchStyle>('singleCrochet')
  const [manualCols,    setManualCols]    = useState('')
  const [manualRows,    setManualRows]    = useState('')
  const [isDragging,    setIsDragging]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, or WebP).')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image too large — please use a file under 20 MB.')
      return
    }
    setError(null)
    setStep('detecting')

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setImageDataUrl(dataUrl)
      const result = await detectGrid(dataUrl)
      setDetection(result)
      setStep('result')
    }
    reader.readAsDataURL(file)
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  async function handleSave() {
    if (!imageDataUrl) return
    setStep('saving')

    let result = detection
    // If manual-needed and user provided manual dimensions, re-detect
    if (detection?.status === 'manual-needed' && manualCols && manualRows) {
      const cols = parseInt(manualCols)
      const rows = parseInt(manualRows)
      if (cols > 0 && rows > 0) {
        result = await detectGridManual(imageDataUrl, cols, rows)
      }
    }

    if (!result?.colorMap || !result.palette || !result.width || !result.height) {
      setError('Could not build pattern grid. Please check your dimensions and try again.')
      setStep('result')
      return
    }

    const pattern = patternFromDetection(
      result.colorMap,
      result.palette,
      result.width,
      result.height,
      patternName.trim() || 'My Pattern',
      stitchStyle,
      result.gridLineColor,
    )
    saveTracked(pattern)
    router.push(`/track/${pattern.id}`)
  }

  const canSave = (
    detection?.status === 'success' ||
    (detection?.status === 'manual-needed' && manualCols && manualRows &&
     parseInt(manualCols) > 0 && parseInt(manualRows) > 0)
  )

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 120px' }}>

        <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218', marginBottom: 4 }}>
            Track a pattern
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878' }}>
            Upload your pattern chart and follow it row by row.
          </p>
        </div>

        {/* ── Upload zone ─────────────────────────────────────────────────── */}
        {step === 'idle' && (
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${isDragging ? '#C4614A' : '#D4C9B8'}`,
                borderRadius: 20,
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'rgba(196,97,74,0.04)' : 'white',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#2C2218', marginBottom: 6 }}>
                Upload your pattern image
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', lineHeight: 1.6 }}>
                PNG, JPG, or WebP · screenshots and scans welcome<br />
                We'll try to detect the grid automatically
              </p>
              <div style={{ marginTop: 16, display: 'inline-block', padding: '10px 20px', background: 'rgba(196,97,74,0.10)', borderRadius: 10 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#C4614A' }}>
                  Choose image →
                </span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />

            {error && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A', marginTop: 12, textAlign: 'center' }}>
                {error}
              </p>
            )}

            {/* Tips */}
            <div style={{ marginTop: 16, background: 'white', borderRadius: 16, border: '1.5px solid #EDE4D8', padding: '14px 16px' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Tips for best detection
              </p>
              {[
                { icon: '📸', text: 'Use a screenshot or clean digital scan — photos of printed patterns are harder to read' },
                { icon: '✏️', text: 'If your pattern has grid lines, trace over them with a solid high-contrast colour (black or white) before uploading' },
                { icon: '✂️', text: 'Crop tightly around the pattern grid, removing any legends or margins' },
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{tip.icon}</span>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.5 }}>{tip.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Detecting ───────────────────────────────────────────────────── */}
        {step === 'detecting' && (
          <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'es-spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744' }}>Analysing your pattern…</p>
            <style>{`@keyframes es-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          </div>
        )}

        {/* ── Result ──────────────────────────────────────────────────────── */}
        {(step === 'result' || step === 'saving') && detection && (
          <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Detection status banner */}
            {detection.status === 'success' && (
              <div style={{ background: 'rgba(74,144,80,0.08)', border: '1.5px solid rgba(74,144,80,0.25)', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218' }}>
                    Grid detected — {detection.width}×{detection.height} · {detection.palette?.length} colours
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginTop: 2 }}>
                    Looking good! Review the details below and start tracking.
                  </p>
                </div>
              </div>
            )}

            {detection.status === 'manual-needed' && (
              <div style={{ background: 'rgba(196,97,74,0.07)', border: '1.5px solid rgba(196,97,74,0.22)', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 4 }}>
                      Couldn&apos;t auto-detect grid
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.5 }}>
                      {detection.tip}
                    </p>
                  </div>
                </div>
                {detection.gridLineColor && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 10px' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>Detected grid line colour:</span>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: detection.gridLineColor, border: '1.5px solid rgba(0,0,0,0.12)' }} />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>{detection.gridLineColor}</span>
                  </div>
                )}
              </div>
            )}

            {detection.status === 'failed' && (
              <div style={{ background: 'rgba(196,97,74,0.08)', border: '1.5px solid rgba(196,97,74,0.25)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#C4614A', marginBottom: 6 }}>
                  ✗ Pattern not recognised
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.5 }}>
                  {detection.tip}
                </p>
                <button
                  onClick={() => { setStep('idle'); setDetection(null); setImageDataUrl(null) }}
                  style={{ marginTop: 12, padding: '9px 16px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Try another image
                </button>
              </div>
            )}

            {/* Manual grid size input (shown for manual-needed) */}
            {detection.status === 'manual-needed' && (
              <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #EDE4D8', padding: '14px 16px' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#6B5744', marginBottom: 10 }}>
                  Enter your grid dimensions
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Stitches wide</p>
                    <input
                      type="number" min={2} max={300} value={manualCols}
                      onChange={e => setManualCols(e.target.value)}
                      placeholder="e.g. 40"
                      style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218', background: '#FAF6EF', border: '1.5px solid #E4D9C8', borderRadius: 10, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Rows tall</p>
                    <input
                      type="number" min={2} max={300} value={manualRows}
                      onChange={e => setManualRows(e.target.value)}
                      placeholder="e.g. 50"
                      style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218', background: '#FAF6EF', border: '1.5px solid #E4D9C8', borderRadius: 10, outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Colour preview (success only) */}
            {detection.status === 'success' && detection.palette && (
              <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #EDE4D8', padding: '14px 16px' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Detected colours
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {detection.palette.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FAF6EF', borderRadius: 999, padding: '4px 8px' }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: c.hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744' }}>{TRACKER_SYMBOLS[i % TRACKER_SYMBOLS.length]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pattern name */}
            {detection.status !== 'failed' && (
              <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #EDE4D8', padding: '14px 16px' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#6B5744', marginBottom: 6 }}>Pattern name</p>
                <input
                  value={patternName}
                  onChange={e => setPatternName(e.target.value)}
                  placeholder="My Pattern"
                  style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218', background: '#FAF6EF', border: '1.5px solid #E4D9C8', borderRadius: 10, outline: 'none' }}
                />
              </div>
            )}

            {/* Stitch style */}
            {detection.status !== 'failed' && (
              <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #EDE4D8', padding: '14px 16px' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#6B5744', marginBottom: 10 }}>Stitch style</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {STITCH_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStitchStyle(opt.value)}
                      style={{
                        padding: '8px 6px',
                        background: stitchStyle === opt.value ? 'rgba(196,97,74,0.10)' : '#FAF6EF',
                        border: `1.5px solid ${stitchStyle === opt.value ? '#C4614A' : '#EDE4D8'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'center' as const,
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{opt.icon}</div>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: stitchStyle === opt.value ? '#C4614A' : '#6B5744' }}>{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A', textAlign: 'center' }}>{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom */}
      {(step === 'result' || step === 'saving') && detection?.status !== 'failed' && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          padding: '14px 20px max(20px, env(safe-area-inset-bottom))',
          background: 'linear-gradient(to top, #FAF6EF 75%, transparent)',
          zIndex: 50,
        }}>
          <button
            onClick={handleSave}
            disabled={!canSave || step === 'saving'}
            style={{
              width: '100%', padding: '16px',
              background: canSave && step !== 'saving' ? '#C4614A' : '#E4D9C8',
              color: canSave && step !== 'saving' ? 'white' : '#B8AAA0',
              border: 'none', borderRadius: 14,
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700,
              cursor: canSave && step !== 'saving' ? 'pointer' : 'not-allowed',
              boxShadow: canSave && step !== 'saving' ? '0 4px 20px rgba(196,97,74,0.28)' : 'none',
            }}
          >
            {step === 'saving' ? 'Setting up tracker…' : '🧶 Start tracking →'}
          </button>
          <button
            onClick={() => { setStep('idle'); setDetection(null); setImageDataUrl(null) }}
            style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#B8AAA0', cursor: 'pointer' }}
          >
            ← Upload a different image
          </button>
        </div>
      )}

      {step === 'idle' && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          padding: '10px 20px max(16px, env(safe-area-inset-bottom))',
          background: 'linear-gradient(to top, #FAF6EF 80%, transparent)',
          zIndex: 50, textAlign: 'center',
        }}>
          <button
            onClick={() => router.push('/track')}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#B8AAA0', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Back to my patterns
          </button>
        </div>
      )}
    </main>
  )
}
