'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { PatternData } from '@/types/pattern'
import { removeColorFromPattern } from '@/lib/removeColor'
import Header         from '@/components/layout/Header'
import StepIndicator  from '@/components/ui/StepIndicator'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { usePattern } from '@/context/PatternContext'
import { STITCH_STYLE_META } from '@/lib/constants'
import { isUnlocked } from '@/lib/unlock'
import { encodePatternToUrl } from '@/lib/patternUrl'
import { drawPatternToCanvas } from '@/modules/preview-rendering/canvasRenderer'
import { useProjectStorage }  from '@/hooks/useProjectStorage'
import { applyPersonalizationToPattern } from '@/modules/personalization/personalizePattern'
import { logEvent } from '@/lib/log'
import LifestylePreview from '@/components/LifestylePreview'
import { patternFromPatternData, saveTracked } from '@/lib/patternTracker'
import DiscountClubCard from '@/components/ui/DiscountClubCard'
import { createTemplate, addVariant, getAllTemplates, slugify, exportLibraryJson } from '@/lib/shopStore'

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
  const [includeInstructions, setIncludeInstructions] = useState(true)
  const [trackerSavedId,      setTrackerSavedId]      = useState<string | null>(null)

  // Admin: Save to Shop (visible at ?admin=1)
  const [isAdmin,        setIsAdmin]        = useState(false)
  const [showShopPanel,  setShowShopPanel]  = useState(false)
  const [shopTitle,      setShopTitle]      = useState('')
  const [shopDesc,       setShopDesc]       = useState('')
  const [shopTags,       setShopTags]       = useState('')
  const [shopCategory,   setShopCategory]   = useState('other')
  const [shopPrice,      setShopPrice]      = useState('2.00')
  const [shopAllow,      setShopAllow]      = useState(true)
  const [shopSizeLabel,  setShopSizeLabel]  = useState('')
  const [shopAddToId,    setShopAddToId]    = useState<string>('__new__')
  const [shopSaved,      setShopSaved]      = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Persist admin flag across the whole session (survives upload→preview→export navigation)
      const fromUrl = new URLSearchParams(window.location.search).get('admin') === '1'
      if (fromUrl) sessionStorage.setItem('cw_admin', '1')
      setIsAdmin(fromUrl || sessionStorage.getItem('cw_admin') === '1')
    }
  }, [])

  function getShareUrl() {
    if (!exportPattern) return ''
    return encodePatternToUrl(exportPattern)
  }

  const pngCanvasRef     = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const { patternData } = state

  // Working copy of the base pattern — user can remove colours without re-generating
  const [workingPattern, setWorkingPattern] = useState<PatternData | null>(null)
  useEffect(() => { setWorkingPattern(patternData ?? null) }, [patternData])

  const removeColor = useCallback((idx: number) => {
    setWorkingPattern(prev => prev ? removeColorFromPattern(prev, idx) : prev)
  }, [])

  const exportPattern = workingPattern
    ? applyPersonalizationToPattern(workingPattern, state.personalization)
    : patternData ? applyPersonalizationToPattern(patternData, state.personalization) : null

  useEffect(() => {
    if (!exportPattern || !pngCanvasRef.current) return
    drawPatternToCanvas(pngCanvasRef.current, exportPattern, { cellSize: 20, gap: 1, showSymbols: true })
  }, [exportPattern])

  // Small visible preview so users can confirm name/date is included
  useEffect(() => {
    if (!exportPattern || !previewCanvasRef.current) return
    drawPatternToCanvas(previewCanvasRef.current, exportPattern, { cellSize: 5, gap: 0, showSymbols: false })
  }, [exportPattern])

  function handleSaveProject() {
    // Save the base pattern (no personalization text rows) so the grid
    // in My Patterns shows the clean design without stripe artifacts.
    if (!patternData || savedId) return
    const project = createProject(patternData, projectName)
    setSavedId(project.id)
  }

  function openPaywall() {
    const tier = state.settings?.imageType === 'graphic' ? 'graphic' : 'photo'
    router.push(`/unlock?return=/export&type=${tier}`)
  }

  async function handleDownloadPdf() {
    if (!isUnlocked() && !isAdmin) { openPaywall(); return }
    if (!exportPattern) return
    logEvent('EXPORT_TRIGGERED', 'pdf')   // [EXPORT_TRIGGERED]
    setStatus('loading-pdf')
    setError(null)
    try {
      const { downloadPdf } = await import('@/modules/pdf-export/buildPDF')
      await downloadPdf(exportPattern, projectName.replace(/\s+/g, '-').toLowerCase(), projectName, includeInstructions)
      handleSaveProject()
      setStatus('done-pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.')
      setStatus('error')
    }
  }

  function handleDownloadPng() {
    if (!isUnlocked() && !isAdmin) { openPaywall(); return }
    if (!exportPattern || !pngCanvasRef.current) return
    logEvent('EXPORT_TRIGGERED', 'png')   // [EXPORT_TRIGGERED]
    setStatus('loading-png')
    try {
      // Use toBlob + object URL — works on iOS Safari unlike the data URL approach
      pngCanvasRef.current.toBlob((blob) => {
        if (!blob) { setError('Could not save image.'); setStatus('error'); return }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        handleSaveProject()
        setStatus('done-png')
      }, 'image/png')
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

          {/* Primary CTA — go view the full pattern + instructions */}
          <button
            onClick={() => savedId ? router.push(`/project/${savedId}`) : router.push('/preview')}
            style={{ width: '100%', maxWidth: 320, padding: '15px', background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(196,97,74,0.28)', marginBottom: 10 }}
          >
            📋 View Pattern &amp; Instructions →
          </button>

          {/* Track progress */}
          {!trackerSavedId ? (
            <button
              onClick={() => {
                const base = workingPattern ?? patternData
                if (!base) return
                const tp = patternFromPatternData(base, projectName.trim() || 'My Pattern')
                saveTracked(tp)
                setTrackerSavedId(tp.id)
              }}
              style={{ width: '100%', maxWidth: 320, padding: '13px', background: 'white', color: '#6B5744', border: '1.5px solid #E4D9C8', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 10 }}
            >
              📋 Track my progress →
            </button>
          ) : (
            <button
              onClick={() => router.push(`/track/${trackerSavedId}`)}
              style={{ width: '100%', maxWidth: 320, padding: '13px', background: 'rgba(74,144,80,0.08)', color: '#4A9050', border: '1.5px solid rgba(74,144,80,0.3)', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}
            >
              ✓ Saved! Open tracker →
            </button>
          )}

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#B8AAA0', marginBottom: 20 }}>Happy stitching! 🧶</p>

          {/* Discount Club */}
          <DiscountClubCard saveLink={getShareUrl()} linkLabel="pattern" maxWidth={320} />

          {/* Share your creation nudge */}
          <div style={{
            width: '100%', maxWidth: 320,
            background: 'white', borderRadius: 18,
            boxShadow: '0 2px 12px rgba(44,34,24,0.07)',
            padding: '14px 16px', textAlign: 'left',
          }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 4 }}>
              📸 Show us your creation!
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', lineHeight: 1.6, marginBottom: 12 }}>
              When you finish your blanket, share a photo and we&apos;ll feature it in the gallery.
            </p>
            <button
              onClick={() => router.push('/gallery')}
              style={{
                width: '100%', padding: '11px',
                background: 'rgba(196,97,74,0.08)', color: '#C4614A',
                border: '1.5px solid rgba(196,97,74,0.2)',
                borderRadius: 12, fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Share my finished project →
            </button>
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 20px max(16px, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #FAF6EF 85%, transparent)', zIndex: 50, textAlign: 'center' }}>
          <button onClick={() => { dispatch({ type: 'RESET' }); router.push('/upload') }} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#B8AAA0', cursor: 'pointer', textDecoration: 'underline' }}>
            + Make another pattern
          </button>
        </div>
      </main>
    )
  }

  const styleLabel = exportPattern ? (STITCH_STYLE_META[exportPattern.meta.stitchStyle]?.label ?? exportPattern.meta.stitchStyle) : '—'

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
      <Header /><StepIndicator />
      <canvas ref={pngCanvasRef}     style={{ display: 'none' }} aria-hidden />
      <canvas ref={previewCanvasRef} style={{ display: 'none' }} aria-hidden />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 100px' }}>

        <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218', marginBottom: 4 }}>
            Download your pattern
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878' }}>
            Name it, download it, and save it to your collection.
          </p>
        </div>

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

        {/* ── Pattern visual preview (confirms name/date included) ─────── */}
        {exportPattern && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16, marginBottom: 16, overflow: 'hidden' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Your pattern preview
              {state.personalization?.enabled && (state.personalization.titleText || state.personalization.dateText) && (
                <span style={{ marginLeft: 8, color: '#4A9050', fontWeight: 700 }}>✓ Name/date included</span>
              )}
            </p>
            <div style={{ width: '100%', overflowX: 'auto', borderRadius: 10, background: '#FAF6EF', textAlign: 'center', padding: '6px 0' }}>
              <canvas
                ref={previewCanvasRef}
                style={{ imageRendering: 'pixelated', maxWidth: '100%', display: 'block', margin: '0 auto' }}
              />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#B8AAA0', marginTop: 8, textAlign: 'center' }}>
              Scroll right if the pattern is wide · grid lines are counting guides only
            </p>
          </div>
        )}

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
            {exportPattern.meta.requestedColors != null &&
             exportPattern.meta.colorCount < exportPattern.meta.requestedColors && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 10, textAlign: 'center' }}>
                Using {exportPattern.meta.colorCount} of {exportPattern.meta.requestedColors} colours (simplified for a cleaner pattern)
              </p>
            )}
          </div>
        )}

        {/* ── Colour palette editor ─────────────────────────────────────── */}
        {workingPattern && workingPattern.palette.length > 0 && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16, marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Colours in your pattern
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                {workingPattern.palette.length} found · tap × to remove
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {workingPattern.palette.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#FAF6EF', borderRadius: 999,
                    padding: '5px 10px 5px 6px', border: '1px solid #EDE4D8',
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: entry.hex,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    flexShrink: 0, display: 'inline-block',
                  }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', fontWeight: 500 }}>
                    {entry.stitchCount?.toLocaleString() ?? '?'}
                  </span>
                  {workingPattern.palette.length > 1 && (
                    <button
                      onClick={() => removeColor(i)}
                      title={`Remove this colour`}
                      style={{
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'rgba(44,34,24,0.08)', border: 'none',
                        fontFamily: 'monospace', fontSize: 10, color: '#9A8878',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1, padding: 0, flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 10 }}>
              Removing a colour merges those cells into the nearest remaining colour.
            </p>
          </div>
        )}

        {/* Lifestyle preview */}
        <LifestylePreview patternCanvas={pngCanvasRef} style={{ maxWidth: 400 }} />

        {/* Export options */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* PDF — primary */}
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 26 }}>📄</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>Full Pattern PDF</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>Colour key · printable grid{includeInstructions ? ' · row-by-row instructions' : ''}</p>
              </div>
            </div>

            {/* Instructions toggle */}
            <button
              onClick={() => setIncludeInstructions(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FAF6EF', border: '1px solid #EDE4D8', borderRadius: 10,
                padding: '10px 14px', marginBottom: 10, cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218' }}>
                Include row-by-row instructions
              </span>
              <span style={{
                width: 36, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center',
                background: includeInstructions ? '#C4614A' : '#C8BFB0',
                padding: '2px', transition: 'background 0.2s',
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', background: 'white',
                  transform: includeInstructions ? 'translateX(16px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                }} />
              </span>
            </button>

            <button onClick={handleDownloadPdf} disabled={!exportPattern} style={{ width: '100%', padding: '13px', background: exportPattern ? '#C4614A' : '#E4D9C8', color: exportPattern ? 'white' : '#B8AAA0', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: exportPattern ? 'pointer' : 'not-allowed', boxShadow: exportPattern ? '0 4px 16px rgba(196,97,74,0.22)' : 'none' }}>
              ⬇ Download PDF
            </button>
          </div>

          {/* PNG — secondary */}
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 26 }}>🖼️</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>Pattern Image</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>Save to camera roll — zoom in to stitch from your phone</p>
              </div>
            </div>
            <button onClick={handleDownloadPng} disabled={!exportPattern} style={{ width: '100%', padding: '12px', background: 'white', color: '#6B5744', border: `1.5px solid ${exportPattern ? '#E4D9C8' : '#F0EAE0'}`, borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: exportPattern ? 'pointer' : 'not-allowed' }}>
              ⬇ Download Image
            </button>
          </div>
        </div>

        {/* Save to project tracker */}
        <div style={{ width: '100%', maxWidth: 400, marginTop: 12 }}>
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

        {status === 'error' && error && (
          <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(196,97,74,0.08)', borderRadius: 12, maxWidth: 400 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}

        {/* ── Admin: Save to Shop ───────────────────────────────────────── */}
        {isAdmin && exportPattern && (
          <div style={{ width: '100%', maxWidth: 400, marginTop: 20 }}>
            {shopSaved ? (
              <div style={{ background: 'rgba(74,144,80,0.08)', border: '1.5px solid rgba(74,144,80,0.25)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#4A9050' }}>✓ Saved to Shop!</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                  <button onClick={() => router.push('/shop')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4A9050', cursor: 'pointer', textDecoration: 'underline' }}>View shop →</button>
                  <button
                    onClick={async () => {
                      const json = await exportLibraryJson()
                      const blob = new Blob([json], { type: 'application/json' })
                      const url  = URL.createObjectURL(blob)
                      const a    = document.createElement('a')
                      a.href = url; a.download = 'shopTemplates.json'
                      document.body.appendChild(a); a.click()
                      document.body.removeChild(a)
                      setTimeout(() => URL.revokeObjectURL(url), 1000)
                    }}
                    style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2C2218', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    📥 Export Library JSON (to commit)
                  </button>
                </div>
              </div>
            ) : !showShopPanel ? (
              <button
                onClick={() => { setShopTitle(projectName); setShowShopPanel(true) }}
                style={{ width: '100%', padding: '12px', background: '#2C2218', color: 'white', border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                🛍 Save to Shop (admin)
              </button>
            ) : (
              <div style={{ background: 'white', borderRadius: 20, border: '2px solid #2C2218', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218' }}>🛍 Save to Shop</p>

                {/* Add to existing or create new */}
                <select
                  value={shopAddToId}
                  onChange={e => setShopAddToId(e.target.value)}
                  style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}
                >
                  <option value="__new__">➕ Create new template</option>
                  {getAllTemplates().map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.variants.length} size{t.variants.length !== 1 ? 's' : ''})</option>
                  ))}
                </select>

                {shopAddToId === '__new__' && (
                  <>
                    <input value={shopTitle} onChange={e => setShopTitle(e.target.value)} placeholder="Template title (e.g. Football C2C Blanket)" style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
                    <textarea value={shopDesc} onChange={e => setShopDesc(e.target.value)} placeholder="Short description for the shop page" rows={2} style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12, resize: 'none' }} />
                    <input value={shopTags} onChange={e => setShopTags(e.target.value)} placeholder="Tags (comma separated): football, boy, sports" style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }} />
                    <select value={shopCategory} onChange={e => setShopCategory(e.target.value)} style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                      {['sports','animals','holidays','names','baby','nature','other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', cursor: 'pointer' }}>
                      <input type="checkbox" checked={shopAllow} onChange={e => setShopAllow(e.target.checked)} />
                      Allow name/date personalization
                    </label>
                  </>
                )}

                {/* Size label + price — always shown */}
                <input value={shopSizeLabel} onChange={e => setShopSizeLabel(e.target.value)} placeholder={`Size label (e.g. Throw ${exportPattern.meta.width}×${exportPattern.meta.height})`} style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>$ Price:</span>
                  <input type="number" min="0.50" step="0.50" value={shopPrice} onChange={e => setShopPrice(e.target.value)} style={{ width: 80, border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '8px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                    {exportPattern.meta.width}×{exportPattern.meta.height} · {exportPattern.meta.stitchStyle}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      if (!exportPattern) return
                      const thumbnail = pngCanvasRef.current?.toDataURL('image/jpeg', 0.5) ?? ''
                      const variant = {
                        label:       shopSizeLabel || `${exportPattern.meta.width}×${exportPattern.meta.height}`,
                        width:       exportPattern.meta.width,
                        height:      exportPattern.meta.height,
                        stitchStyle: exportPattern.meta.stitchStyle,
                        price:       Math.round(parseFloat(shopPrice) * 100),
                        patternData: exportPattern,
                      }
                      if (shopAddToId === '__new__') {
                        createTemplate({
                          title:                shopTitle || projectName,
                          description:          shopDesc,
                          tags:                 shopTags.split(',').map(t => t.trim()).filter(Boolean),
                          category:             shopCategory,
                          thumbnail,
                          allowPersonalization: shopAllow,
                          variant,
                        })
                      } else {
                        addVariant(shopAddToId, variant)
                      }
                      setShopSaved(true)
                    }}
                    style={{ flex: 1, padding: '11px', background: '#2C2218', color: 'white', border: 'none', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save
                  </button>
                  <button onClick={() => setShowShopPanel(false)} style={{ padding: '11px 16px', background: 'none', border: '1.5px solid #E4D9C8', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 20px max(16px, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #FAF6EF 80%, transparent)', zIndex: 50, textAlign: 'center' }}>
        <button onClick={() => router.push('/preview')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#B8AAA0', cursor: 'pointer', textDecoration: 'underline' }}>
          ← Back to preview
        </button>
      </div>
    </main>
  )
}
