'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCrossStitch } from '@/context/CrossStitchPatternContext'
import { drawPatternToCanvas } from '@/modules/preview-rendering/canvasRenderer'
import { logEvent } from '@/lib/log'

type Status = 'idle' | 'loading-pdf' | 'done-pdf' | 'loading-png' | 'done-png' | 'error'

export default function CrossStitchExportPage() {
  const router = useRouter()
  const { state, dispatch } = useCrossStitch()
  const { patternData, settings } = state

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status,              setStatus]              = useState<Status>('idle')
  const [error,               setError]               = useState<string | null>(null)
  const [includeInstructions, setIncludeInstructions] = useState(true)   // on by default
  const [patternName,         setPatternName]         = useState('My Cross Stitch Pattern')

  useEffect(() => {
    if (!patternData) router.replace('/crossstitch')
  }, [patternData, router])

  useEffect(() => {
    if (!patternData || !canvasRef.current) return
    const cellSize = Math.max(4, Math.min(14, Math.floor(320 / Math.max(patternData.meta.width, patternData.meta.height))))
    // showSymbols: true — essential for cross stitch charts (used in B&W)
    drawPatternToCanvas(canvasRef.current, patternData, { cellSize, gap: 1, showSymbols: true })
  }, [patternData])

  if (!patternData) return null

  const { meta, palette } = patternData
  const finishedW = (meta.width  / settings.aidaCount).toFixed(1)
  const finishedH = (meta.height / settings.aidaCount).toFixed(1)

  async function handleDownloadPdf() {
    if (!patternData) return
    logEvent('EXPORT_TRIGGERED', 'crossstitch-pdf')
    setStatus('loading-pdf')
    setError(null)
    try {
      const { downloadPdf } = await import('@/modules/pdf-export/buildPDF')
      await downloadPdf(
        patternData,
        patternName.replace(/\s+/g, '-').toLowerCase(),
        patternName,
        includeInstructions,
      )
      setStatus('done-pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Try again.')
      setStatus('error')
    }
  }

  function handleDownloadPng() {
    if (!canvasRef.current) return
    logEvent('EXPORT_TRIGGERED', 'crossstitch-png')
    setStatus('loading-png')
    try {
      canvasRef.current.toBlob(blob => {
        if (!blob) { setError('Could not save image.'); setStatus('error'); return }
        const url  = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href     = url
        link.download = `${patternName.replace(/\s+/g, '-').toLowerCase()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 2000)
        setStatus('done-png')
      })
    } catch {
      setError('Could not save image.')
      setStatus('error')
    }
  }

  const busy = status === 'loading-pdf' || status === 'loading-png'

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #EDE4D8' }}>
        <button onClick={() => router.push('/crossstitch/settings')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}>
          ← Settings
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#2C2218' }}>Your Chart</p>
        <button
          onClick={() => { dispatch({ type: 'RESET' }); router.push('/crossstitch') }}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', fontWeight: 600, cursor: 'pointer' }}
        >
          New +
        </button>
      </div>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 160px', gap: 16 }}>

        {/* Stats */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', gap: 8 }}>
          {[
            [meta.width + '×' + meta.height, 'Stitches'],
            [meta.colorCount + '', 'Colours'],
            [meta.totalStitches.toLocaleString(), 'Total'],
          ].map(([val, label]) => (
            <div key={label} style={{ flex: 1, background: 'white', borderRadius: 12, padding: '10px 12px', textAlign: 'center', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#2C2218' }}>{val}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Finished size card */}
        <div style={{ width: '100%', maxWidth: 400, background: 'rgba(196,97,74,0.06)', border: '1px solid #EDE4D8', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>
            📏 At {settings.aidaCount}-count Aida: <strong style={{ color: '#2C2218' }}>{finishedW}" wide × {finishedH}" tall</strong>
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 4 }}>
            Use 2 strands on 14ct · 1–2 strands on 18ct · 1 strand on 28ct
          </p>
        </div>

        {/* Chart canvas — with symbols */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, padding: 12, boxShadow: '0 2px 16px rgba(44,34,24,0.08)', overflow: 'hidden' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 8 }}>
            Chart preview · symbols shown
          </p>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12, imageRendering: 'pixelated' }}
          />
        </div>

        {/* Colour key with symbols */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Colour key</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {palette.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: c.hex, flexShrink: 0, boxShadow: '0 1px 3px rgba(44,34,24,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'white', mixBlendMode: 'difference' }}>{c.symbol}</span>
                </div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2C2218', flex: 1 }}>
                  {c.symbol} — {c.label ?? c.hex}
                </span>
                {c.stitchCount != null && (
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                    {c.stitchCount} sts
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pattern name */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 6 }}>Pattern name (used in filename)</p>
          <input
            type="text" value={patternName} onChange={e => setPatternName(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
          />
        </div>

        {/* Download options */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* PDF */}
          <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(44,34,24,0.07)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>📄</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>Download PDF</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>
                  Chart + colour key{includeInstructions ? ' + how-to guide' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIncludeInstructions(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAF6EF', border: '1px solid #EDE4D8', borderRadius: 10, padding: '9px 14px', marginBottom: 10, cursor: 'pointer' }}
            >
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>Include beginner guide</span>
              <span style={{ width: 36, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', background: includeInstructions ? '#C4614A' : '#C8BFB0', padding: '2px', transition: 'background 0.2s' }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', transform: includeInstructions ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
              </span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={busy}
              style={{ width: '100%', padding: '13px', background: busy ? '#E4D9C8' : '#C4614A', color: busy ? '#B8AAA0' : 'white', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: busy ? 'none' : '0 4px 16px rgba(196,97,74,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {status === 'loading-pdf' ? (
                <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'cs-spin 0.8s linear infinite', display: 'inline-block' }} /> Generating PDF…</>
              ) : status === 'done-pdf' ? '✅ PDF Downloaded' : '⬇ Download PDF'}
            </button>
          </div>

          {/* PNG */}
          <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(44,34,24,0.07)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>🖼️</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>Save as Image</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>PNG with symbols — zoom in to stitch from your phone</p>
              </div>
            </div>
            <button
              onClick={handleDownloadPng}
              disabled={busy}
              style={{ width: '100%', padding: '12px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {status === 'loading-png' ? (
                <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'cs-spin 0.8s linear infinite', display: 'inline-block' }} /> Saving…</>
              ) : status === 'done-png' ? '✅ Image Saved' : '⬇ Save Image'}
            </button>
          </div>

        </div>

        {error && (
          <div style={{ width: '100%', maxWidth: 400, background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}

      </section>

      <style>{`@keyframes cs-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
