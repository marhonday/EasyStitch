'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useKnittingPattern, getCellWidthMultiplier } from '@/context/KnittingPatternContext'
import { useProjectStorage } from '@/hooks/useProjectStorage'
import { drawPatternToCanvas } from '@/modules/preview-rendering/canvasRenderer'
import ZoomableCanvas  from '@/components/preview/ZoomableCanvas'
import { STITCH_STYLE_META }   from '@/lib/constants'
import { logEvent }            from '@/lib/log'
import { isUnlocked }         from '@/lib/unlock'
import { PatternData }         from '@/types/pattern'
import { removeColorFromPattern } from '@/lib/removeColor'

type Status = 'idle' | 'loading-pdf' | 'done-pdf' | 'loading-png' | 'done-png' | 'error'

export default function KnittingExportPage() {
  const router = useRouter()
  const { state, dispatch } = useKnittingPattern()
  const { patternData, settings } = state
  const { createProject } = useProjectStorage()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Track the cell size used for drawing so the highlight uses the same stride
  const cellSizeRef = useRef(12)

  const [status,              setStatus]              = useState<Status>('idle')
  const [error,               setError]               = useState<string | null>(null)
  const [includeInstructions, setIncludeInstructions] = useState(false)
  const [patternName,         setPatternName]         = useState('My Knitting Graph')
  const [savedId,             setSavedId]             = useState<string | null>(null)

  // Working copy — user can remove colours without re-generating
  const [workingPattern, setWorkingPattern] = useState<PatternData | null>(null)
  useEffect(() => { setWorkingPattern(patternData ?? null) }, [patternData])
  const removeColor = useCallback((idx: number) => {
    setWorkingPattern(prev => prev ? removeColorFromPattern(prev, idx) : prev)
  }, [])
  const activePattern = workingPattern ?? patternData

  // ── Row progress (localStorage-persisted) ─────────────────────────────
  const patternKey = useMemo(() => {
    if (!patternData) return ''
    const { stitchStyle, width, height, colorCount, generatedAt } = patternData.meta
    return `${stitchStyle}_${width}x${height}_c${colorCount}_${generatedAt}`
  }, [patternData])

  const patternLabel = useMemo(() => {
    if (!patternData) return ''
    const { stitchStyle, width, height } = patternData.meta
    const styleLabel = STITCH_STYLE_META[stitchStyle]?.label ?? stitchStyle
    return `${width}×${height} ${styleLabel}`
  }, [patternData])

  // Redirect if no pattern
  useEffect(() => {
    if (!patternData) router.replace('/knitting')
  }, [patternData, router])

  // Draw pattern preview
  useEffect(() => {
    if (!activePattern || !canvasRef.current) return
    const cellWidthMultiplier = getCellWidthMultiplier(settings.style)
    const cs = Math.max(4, Math.min(16, Math.floor(320 / Math.max(activePattern.meta.width, activePattern.meta.height))))
    cellSizeRef.current = cs
    drawPatternToCanvas(canvasRef.current, activePattern, { cellSize: cs, gap: 1, showSymbols: false, cellWidthMultiplier })
  }, [activePattern, settings.style])

  if (!patternData) return null

  const { meta, palette } = activePattern ?? patternData
  const styleLabel = STITCH_STYLE_META[meta.stitchStyle]?.label ?? meta.stitchStyle
  const cellWidthMultiplier = getCellWidthMultiplier(settings.style)

  async function handleDownloadPdf() {
    if (!isUnlocked()) { router.push(`/unlock?return=/knitting/export&type=${settings.imageType === 'graphic' ? 'graphic' : 'photo'}`); return }
    if (!activePattern) return
    logEvent('EXPORT_TRIGGERED', 'knitting-pdf')
    setStatus('loading-pdf')
    setError(null)
    try {
      const { downloadPdf } = await import('@/modules/pdf-export/buildPDF')
      await downloadPdf(
        activePattern,
        patternName.replace(/\s+/g, '-').toLowerCase(),
        patternName,
        includeInstructions,
        cellWidthMultiplier,
      )
      setStatus('done-pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Try again.')
      setStatus('error')
    }
  }

  function handleDownloadPng() {
    if (!isUnlocked()) { router.push(`/unlock?return=/knitting/export&type=${settings.imageType === 'graphic' ? 'graphic' : 'photo'}`); return }
    if (!canvasRef.current) return
    logEvent('EXPORT_TRIGGERED', 'knitting-png')
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

  function handleSaveProject() {
    if (!patternData || savedId) return
    const project = createProject(patternData, patternName)
    setSavedId(project.id)
  }

  const busy = status === 'loading-pdf' || status === 'loading-png'

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #EDE4D8' }}>
        <button
          onClick={() => router.push('/knitting/settings')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}
        >
          ← Settings
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Your Knitting Graph</p>
        <button
          onClick={() => { dispatch({ type: 'RESET' }); router.push('/knitting') }}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', fontWeight: 600, cursor: 'pointer' }}
        >
          New +
        </button>
      </div>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 160px', gap: 16 }}>

        {/* Pattern stats */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', gap: 8 }}>
          {[
            [meta.width + '×' + meta.height, 'Stitches'],
            [meta.colorCount + '', 'Colours'],
            [styleLabel, 'Style'],
          ].map(([val, label]) => (
            <div key={label} style={{ flex: 1, background: 'white', borderRadius: 12, padding: '10px 12px', textAlign: 'center', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#2C2218' }}>{val}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </div>
          ))}
        </div>
        {meta.requestedColors != null && meta.colorCount < meta.requestedColors && (
          <p style={{ width: '100%', maxWidth: 400, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', textAlign: 'center' }}>
            Using {meta.colorCount} of {meta.requestedColors} colours (simplified for a cleaner pattern)
          </p>
        )}

        {/* Graph canvas — row highlight drawn on top */}
        <ZoomableCanvas
          canvasRef={canvasRef}
          showRowHint={false}
        />

        {/* ── Colour palette editor ───────────────────────────────────── */}
        {workingPattern && workingPattern.palette.length > 0 && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Colours
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                {workingPattern.palette.length} found · tap × to remove
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {workingPattern.palette.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FAF6EF', borderRadius: 999, padding: '5px 10px 5px 6px', border: '1px solid #EDE4D8' }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, background: entry.hex, border: '1.5px solid rgba(0,0,0,0.1)', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', fontWeight: 500 }}>
                    {entry.symbol}
                  </span>
                  {workingPattern.palette.length > 1 && (
                    <button onClick={() => removeColor(i)} style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(44,34,24,0.08)', border: 'none', fontFamily: 'monospace', fontSize: 10, color: '#9A8878', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 10 }}>
              Removing a colour merges those stitches into the nearest remaining colour.
            </p>
          </div>
        )}

        {/* Pattern name */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 6 }}>Pattern name (used in filename)</p>
          <input
            type="text"
            value={patternName}
            onChange={e => setPatternName(e.target.value)}
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
                  Graph + colour key{includeInstructions ? ' + knitting instructions' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIncludeInstructions(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FAF6EF', border: '1px solid #EDE4D8', borderRadius: 10,
                padding: '9px 14px', marginBottom: 10, cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>Include stitch instructions</span>
              <span style={{ width: 36, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', background: includeInstructions ? '#C4614A' : '#C8BFB0', padding: '2px', transition: 'background 0.2s' }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', transform: includeInstructions ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
              </span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={busy}
              style={{
                width: '100%', padding: '13px', background: busy ? '#E4D9C8' : '#C4614A',
                color: busy ? '#B8AAA0' : 'white', border: 'none', borderRadius: 12,
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
                boxShadow: busy ? 'none' : '0 4px 16px rgba(196,97,74,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {status === 'loading-pdf' ? (
                <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'knit-spin 0.8s linear infinite', display: 'inline-block' }} /> Generating PDF…</>
              ) : status === 'done-pdf' ? '✅ PDF Downloaded' : '⬇ Download PDF'}
            </button>
          </div>

          {/* PNG */}
          <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(44,34,24,0.07)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>🖼️</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>Save as Image</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>PNG file — zoom in to knit from your phone or print it out</p>
              </div>
            </div>
            <button
              onClick={handleDownloadPng}
              disabled={busy}
              style={{
                width: '100%', padding: '12px', background: 'white',
                color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 12,
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                cursor: busy ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {status === 'loading-png' ? (
                <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'knit-spin 0.8s linear infinite', display: 'inline-block' }} /> Saving…</>
              ) : status === 'done-png' ? '✅ Image Saved' : '⬇ Save Image'}
            </button>
          </div>

        </div>

        {/* Save to My Patterns */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          {savedId ? (
            <button
              onClick={() => router.push(`/project/${savedId}`)}
              style={{ width: '100%', padding: '13px', background: 'rgba(74,144,80,0.08)', border: '1.5px solid rgba(74,144,80,0.3)', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#4A9050', cursor: 'pointer' }}
            >
              ✓ Saved — Open in My Patterns →
            </button>
          ) : (
            <button
              onClick={handleSaveProject}
              style={{ width: '100%', padding: '13px', background: 'white', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: '#6B5744', cursor: 'pointer' }}
            >
              📋 Save to My Patterns
            </button>
          )}
        </div>

        {error && (
          <div style={{ width: '100%', maxWidth: 400, background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}

      </section>

      <style>{`@keyframes knit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
