'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useCrossStitch } from '@/context/CrossStitchPatternContext'
import { FREE_MODE } from '@/lib/constants'
import { drawPatternToCanvas } from '@/modules/preview-rendering/canvasRenderer'

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#FAF6EF', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#2C2218' }}>{value}</div>
    </div>
  )
}

type Status = 'idle' | 'loading-pdf' | 'loading-png' | 'done-pdf' | 'done-png' | 'error'

export default function CrossStitchExportPage() {
  const router = useRouter()
  const { state, dispatch } = useCrossStitch()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('My Cross Stitch Pattern')
  const [cellSize, setCellSize] = useState(14)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenCanvasRef  = useRef<HTMLCanvasElement>(null)

  const { patternData, settings } = state
  const meta = patternData?.meta

  // Render visible preview
  useEffect(() => {
    if (!patternData || !previewCanvasRef.current) return
    drawPatternToCanvas(previewCanvasRef.current, patternData, { cellSize, gap: 1, showSymbols: true })
  }, [patternData, cellSize])

  // Keep hidden high-res canvas in sync for PNG export
  useEffect(() => {
    if (!patternData || !hiddenCanvasRef.current) return
    drawPatternToCanvas(hiddenCanvasRef.current, patternData, { cellSize: 20, gap: 1, showSymbols: true })
  }, [patternData])

  function openPaywall() {
    alert('Unlock your full pattern to download.')
  }

  async function handleDownloadPdf() {
    if (!FREE_MODE) { openPaywall(); return }
    if (!patternData) return
    setStatus('loading-pdf')
    setError(null)
    try {
      const { downloadPdf } = await import('@/modules/pdf-export/buildPDF')
      await downloadPdf(patternData, projectName.replace(/\s+/g, '-').toLowerCase(), projectName)
      setStatus('done-pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.')
      setStatus('error')
    }
  }

  function handleDownloadPng() {
    if (!FREE_MODE) { openPaywall(); return }
    if (!patternData || !hiddenCanvasRef.current) return
    setStatus('loading-png')
    try {
      const dataUrl = hiddenCanvasRef.current.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setStatus('done-png')
    } catch {
      setError('Could not save image.')
      setStatus('error')
    }
  }

  if (status === 'loading-pdf' || status === 'loading-png') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
        <Header />
        <LoadingSpinner message={status === 'loading-pdf' ? 'Building your PDF…' : 'Saving image…'} />
      </main>
    )
  }

  if (status === 'done-pdf' || status === 'done-png') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 180px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(74,144,80,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 20 }}>
            🎉
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            {status === 'done-pdf' ? 'PDF downloaded!' : 'Image saved!'}
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.7, maxWidth: 280, marginBottom: 28 }}>
            {status === 'done-pdf'
              ? 'Check your downloads folder to start stitching.'
              : 'Check your downloads or camera roll.'}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#B8AAA0', marginBottom: 24 }}>
            Happy stitching! 🪡
          </p>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '14px 20px max(20px, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #FAF6EF 85%, transparent)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => { dispatch({ type: 'RESET' }); router.push('/crossstitch') }}
            style={{ width: '100%', padding: '16px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(196,97,74,0.28)' }}
          >
            New Cross Stitch Pattern
          </button>
          <button
            onClick={() => router.push('/')}
            style={{ width: '100%', padding: '12px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}
          >
            Back to Home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
      <Header />
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} aria-hidden />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 120px' }}>

        <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218', marginBottom: 4 }}>
            Your cross stitch chart
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878' }}>
            Download your symbol chart as a PDF or image.
          </p>
        </div>

        {/* Pattern name */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#6B5744', marginBottom: 6 }}>
            Pattern name
          </p>
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="My Cross Stitch Pattern"
            style={{
              width: '100%', padding: '13px 14px',
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#2C2218',
              background: 'white', border: '1.5px solid #E4D9C8',
              borderRadius: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Pattern stats */}
        {meta && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16, marginBottom: 16 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Chart summary
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <SummaryTile label="Grid"     value={`${meta.width}×${meta.height}`} />
              <SummaryTile label="Colours"  value={String(meta.colorCount)} />
              <SummaryTile label="Stitches" value={meta.totalStitches.toLocaleString()} />
            </div>
          </div>
        )}

        {/* Canvas preview */}
        {patternData && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#6B5744' }}>
                Chart preview
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[8, 12, 16].map(s => (
                  <button
                    key={s}
                    onClick={() => setCellSize(s)}
                    style={{
                      padding: '3px 8px', borderRadius: 6,
                      background: cellSize === s ? '#C4614A' : '#F2EAD8',
                      color: cellSize === s ? 'white' : '#6B5744',
                      border: 'none', cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 360 }}>
              <canvas ref={previewCanvasRef} style={{ display: 'block', maxWidth: '100%' }} />
            </div>
          </div>
        )}

        {/* Finished size card — unique to cross stitch */}
        {meta && settings.aidaCount && (
          <div style={{
            width: '100%', maxWidth: 400, marginBottom: 16,
            background: 'rgba(196,97,74,0.06)',
            border: '1px solid #EDE4D8',
            borderRadius: 16, padding: '14px 16px',
          }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 6 }}>
              📏 Finished size
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2C2218', marginBottom: 4 }}>
              {(meta.width / settings.aidaCount).toFixed(1)}&quot; wide &times; {(meta.height / settings.aidaCount).toFixed(1)}&quot; tall
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
              At {settings.aidaCount}-count Aida · based on {meta.width}×{meta.height} stitches
            </p>
          </div>
        )}

        {/* Colour key */}
        {patternData && patternData.palette.length > 0 && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16, marginBottom: 16 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Colour key
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {patternData.palette.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: entry.hex, border: '1px solid rgba(44,34,24,0.10)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{entry.symbol}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#2C2218' }}>
                      {entry.label ?? entry.hex}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                      {entry.stitchCount?.toLocaleString() ?? '–'} stitches
                    </p>
                  </div>
                  <code style={{ fontFamily: 'monospace', fontSize: 11, color: '#B8AAA0' }}>{entry.hex}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export options */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 26 }}>📄</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>Full Pattern PDF</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>Symbol chart · colour key · stitch instructions · printable</p>
              </div>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={!patternData}
              style={{ width: '100%', padding: '13px', background: patternData ? '#C4614A' : '#E4D9C8', color: patternData ? 'white' : '#B8AAA0', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: patternData ? 'pointer' : 'not-allowed', boxShadow: patternData ? '0 4px 16px rgba(196,97,74,0.22)' : 'none' }}
            >
              ⬇ Download Full PDF
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 26 }}>🖼️</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>Pattern Image</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>Save to camera roll — zoom in to stitch from your phone</p>
              </div>
            </div>
            <button
              onClick={handleDownloadPng}
              disabled={!patternData}
              style={{ width: '100%', padding: '12px', background: 'white', color: '#6B5744', border: `1.5px solid ${patternData ? '#E4D9C8' : '#F0EAE0'}`, borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: patternData ? 'pointer' : 'not-allowed' }}
            >
              ⬇ Download Image (PNG)
            </button>
          </div>
        </div>

        {status === 'error' && error && (
          <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(196,97,74,0.08)', borderRadius: 12, maxWidth: 400, width: '100%' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 20px max(16px, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #FAF6EF 80%, transparent)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => router.push('/crossstitch/settings')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#B8AAA0', cursor: 'pointer', textDecoration: 'underline' }}
        >
          ← Back to settings
        </button>
      </div>
    </main>
  )
}
