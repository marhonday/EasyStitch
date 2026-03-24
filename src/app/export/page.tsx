'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import Header         from '@/components/layout/Header'
import StepIndicator  from '@/components/ui/StepIndicator'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { usePattern } from '@/context/PatternContext'
import { STITCH_STYLE_META, FREE_MODE } from '@/lib/constants'
import { drawPatternToCanvas } from '@/modules/preview-rendering/canvasRenderer'
import { useProjectStorage }  from '@/hooks/useProjectStorage'
import { applyPersonalizationToPattern } from '@/modules/personalization/personalizePattern'

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#FAF6EF', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#2C2218' }}>{value}</div>
    </div>
  )
}

type Status = 'idle' | 'loading-pdf' | 'loading-png' | 'done-pdf' | 'done-png' | 'error'

export default function ExportPage() {
  const router  = useRouter()
  const { state, dispatch } = usePattern()
  const { createProject }   = useProjectStorage()
  const [status,      setStatus]      = useState<Status>('idle')
  const [error,       setError]       = useState<string | null>(null)
  const [projectName, setProjectName] = useState('My Crochet Pattern')
  const [savedId,     setSavedId]     = useState<string | null>(null)
  const pngCanvasRef = useRef<HTMLCanvasElement>(null)

  const { patternData } = state
  const exportPattern = patternData ? applyPersonalizationToPattern(patternData, state.personalization) : null

  useEffect(() => {
    if (!exportPattern || !pngCanvasRef.current) return
    drawPatternToCanvas(pngCanvasRef.current, exportPattern, { cellSize: 20, gap: 1, showSymbols: true })
  }, [exportPattern])

  function handleSaveProject() {
    if (!exportPattern) return
    const project = createProject(exportPattern, projectName)
    setSavedId(project.id)
  }

  function openPaywall() {
    alert('Unlock your full pattern to download.')
  }

  async function handleDownloadPdf() {
    if (!FREE_MODE) { openPaywall(); return }
    if (!exportPattern) return
    setStatus('loading-pdf')
    setError(null)
    try {
      const { downloadPdf } = await import('@/modules/pdf-export/buildPDF')
      await downloadPdf(exportPattern, projectName.replace(/\s+/g, '-').toLowerCase(), projectName)
      setStatus('done-pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.')
      setStatus('error')
    }
  }

  function handleDownloadPng() {
    if (!FREE_MODE) { openPaywall(); return }
    if (!exportPattern || !pngCanvasRef.current) return
    setStatus('loading-png')
    try {
      const dataUrl = pngCanvasRef.current.toDataURL('image/png')
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
        <Header /><StepIndicator />
        <LoadingSpinner message={status === 'loading-pdf' ? 'Building your PDF…' : 'Saving image…'} />
      </main>
    )
  }

  if (status === 'done-pdf' || status === 'done-png') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
        <Header /><StepIndicator />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 180px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(74,144,80,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 20 }}>🎉</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#2C2218', marginBottom: 8 }}>
            {status === 'done-pdf' ? 'PDF downloaded!' : 'Image saved!'}
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5744', lineHeight: 1.7, maxWidth: 280, marginBottom: 24 }}>
            {status === 'done-pdf'
              ? 'Check your downloads folder to start stitching.'
              : 'Check your downloads or camera roll.'}
          </p>

          {/* Saved project link */}
          {savedId && (
            <button
              onClick={() => router.push(`/project/${savedId}`)}
              style={{ width: '100%', maxWidth: 320, padding: '14px', background: 'rgba(74,144,80,0.08)', border: '1.5px solid rgba(74,144,80,0.25)', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#4A9050', cursor: 'pointer', marginBottom: 12 }}
            >
              📋 Open My Patterns →
            </button>
          )}
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#B8AAA0' }}>Happy stitching! 🧶</p>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '14px 20px max(20px, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #FAF6EF 85%, transparent)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => { dispatch({ type: 'RESET' }); router.push('/') }} style={{ width: '100%', padding: '16px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(196,97,74,0.28)' }}>
            Make Another Pattern
          </button>
          <button onClick={() => router.push('/project')} style={{ width: '100%', padding: '12px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}>
            My Patterns
          </button>
        </div>
      </main>
    )
  }

  const styleLabel = exportPattern ? (STITCH_STYLE_META[exportPattern.meta.stitchStyle]?.label ?? exportPattern.meta.stitchStyle) : '—'

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
      <Header /><StepIndicator />
      <canvas ref={pngCanvasRef} style={{ display: 'none' }} aria-hidden />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 220px' }}>

        {/* Project name */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#6B5744' }}>
              Pattern name
            </p>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
              ✓ Pattern preserved — you can navigate freely
            </span>
          </div>
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="My Crochet Pattern"
            style={{
              width: '100%', padding: '13px 14px',
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#2C2218',
              background: 'white', border: '1.5px solid #E4D9C8',
              borderRadius: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Pattern summary */}
        {exportPattern && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16, marginBottom: 16 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Pattern summary</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <SummaryTile label="Grid"     value={`${exportPattern.meta.width}×${exportPattern.meta.height}`} />
              <SummaryTile label="Colours"  value={String(exportPattern.meta.colorCount)} />
              <SummaryTile label="Stitches" value={exportPattern.meta.totalStitches.toLocaleString()} />
              <SummaryTile label="Style"    value={styleLabel} />
            </div>
          </div>
        )}

        {/* Save to project tracker */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 16 }}>
          {savedId ? (
            <button
              onClick={() => router.push(`/project/${savedId}`)}
              style={{ width: '100%', padding: '13px', background: 'rgba(74,144,80,0.08)', border: '1.5px solid rgba(74,144,80,0.3)', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#4A9050', cursor: 'pointer' }}
            >
              ✓ Saved! Open My Patterns →
            </button>
          ) : (
            <button
              onClick={handleSaveProject}
              disabled={!exportPattern}
              style={{ width: '100%', padding: '13px', background: 'white', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: '#6B5744', cursor: exportPattern ? 'pointer' : 'not-allowed' }}
            >
              📋 Save to my Patterns
            </button>
          )}
        </div>

        {/* Export options */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* PNG */}
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 26 }}>🖼️</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>Save as Image</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>Best for phone — save to camera roll, zoom in to stitch</p>
              </div>
            </div>
            <button onClick={handleDownloadPng} disabled={!exportPattern} style={{ width: '100%', padding: '12px', background: exportPattern ? '#C4614A' : '#E4D9C8', color: exportPattern ? 'white' : '#B8AAA0', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: exportPattern ? 'pointer' : 'not-allowed' }}>
              ⬇ Download Preview (low detail)
            </button>
          </div>

          {/* PDF */}
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 26 }}>📄</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>Download PDF</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>Best for printing — colour key, row numbers, instructions</p>
              </div>
            </div>
            <button onClick={handleDownloadPdf} disabled={!exportPattern} style={{ width: '100%', padding: '12px', background: 'white', color: '#6B5744', border: `1.5px solid ${exportPattern ? '#E4D9C8' : '#F0EAE0'}`, borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: exportPattern ? 'pointer' : 'not-allowed' }}>
              ⬇ Download PDF
            </button>
          </div>
        </div>

        {status === 'error' && error && (
          <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(196,97,74,0.08)', borderRadius: 12, maxWidth: 400 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '14px 20px max(20px, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #FAF6EF 85%, transparent)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => router.push('/project')} style={{ width: '100%', padding: '12px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}>
          📋 My Patterns
        </button>
        <button onClick={() => router.push('/preview')} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#9A8878', border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}>
          ← Back to preview
        </button>
      </div>
    </main>
  )
}
