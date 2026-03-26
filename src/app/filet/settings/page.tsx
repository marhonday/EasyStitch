'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useFiletPattern } from '@/context/FiletPatternContext'
import { processImageForFilet } from '@/lib/filetPreprocess'
import { generatePattern } from '@/modules/pattern-engine/generatePattern'
import { logEvent } from '@/lib/log'

const SIZE_PRESETS = [
  { label: 'Motif',   width: 30,  height: 30  },
  { label: 'Panel',   width: 40,  height: 60  },
  { label: 'Runner',  width: 50,  height: 100 },
  { label: 'Curtain', width: 80,  height: 150 },
  { label: 'Custom',  width: 0,   height: 0   },
]

export default function FiletSettingsPage() {
  const router = useRouter()
  const { state, dispatch } = useFiletPattern()
  const { settings, rawImage } = state
  const inFlight = useRef(false)

  const [error,   setError]   = useState<string | null>(null)
  const [customW, setCustomW] = useState(String(settings.width))
  const [customH, setCustomH] = useState(String(settings.height))

  // Preview canvas
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live threshold preview
  const updatePreview = useCallback(() => {
    if (!rawImage || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current
    processImageForFilet(rawImage, settings.threshold, settings.invert, true, 1.5)
      .then(dataUrl => {
        const img = new Image()
        img.onload = () => {
          const maxW = 200
          const scale = Math.min(1, maxW / img.naturalWidth)
          canvas.width  = Math.round(img.naturalWidth  * scale)
          canvas.height = Math.round(img.naturalHeight * scale)
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
        img.src = dataUrl
      })
      .catch(() => {/* best-effort */})
  }, [rawImage, settings.threshold, settings.invert])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(updatePreview, 100)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [updatePreview])

  const activePreset = SIZE_PRESETS.find(p =>
    p.label !== 'Custom' && p.width === settings.width && p.height === settings.height
  )?.label ?? 'Custom'

  function applyPreset(label: string) {
    const p = SIZE_PRESETS.find(s => s.label === label)
    if (!p || p.label === 'Custom') return
    dispatch({ type: 'UPDATE_SETTINGS', payload: { width: p.width, height: p.height } })
    setCustomW(String(p.width))
    setCustomH(String(p.height))
  }

  function handleCustomW(val: string) {
    setCustomW(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 10 && n <= 200) dispatch({ type: 'UPDATE_SETTINGS', payload: { width: n } })
  }

  function handleCustomH(val: string) {
    setCustomH(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 10 && n <= 200) dispatch({ type: 'UPDATE_SETTINGS', payload: { height: n } })
  }

  async function handleGenerate() {
    if (inFlight.current || !rawImage) return
    inFlight.current = true
    setError(null)
    dispatch({ type: 'SET_GENERATING', payload: true })
    logEvent('GENERATION_STARTED')
    try {
      // Pre-process image to binary B&W
      const processedImage = await processImageForFilet(rawImage, settings.threshold, settings.invert, true, 1.5)
      const patternSettings = {
        gridSize:        { label: 'Custom', width: settings.width, height: settings.height },
        maxColors:       2,
        stitchStyle:     'filetCrochet' as const,
        imageType:       'graphic' as const,
        backgroundColor: '#ffffff',
        borderLayers:    [],
      }
      const result = await generatePattern(processedImage, patternSettings)
      logEvent('GENERATION_COMPLETED')
      dispatch({ type: 'SET_PATTERN', payload: result })
      router.push('/filet/export')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Try again.')
      dispatch({ type: 'SET_GENERATING', payload: false })
    } finally {
      inFlight.current = false
    }
  }

  const isGenerating = state.isGenerating
  const canGenerate  = !!rawImage && !isGenerating && settings.width >= 10 && settings.height >= 10

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #EDE4D8' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}>
          ← Back
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Filet Settings</p>
        <div style={{ width: 48 }} />
      </div>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 140px', gap: 16 }}>

        {/* ── Threshold preview ────────────────────────────────────────── */}
        {rawImage && (
          <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', alignSelf: 'flex-start' }}>
              Live preview
            </p>
            <div style={{ background: '#F9F9F9', borderRadius: 12, overflow: 'hidden', maxWidth: 200, border: '1px solid #EDE4D8' }}>
              <canvas
                ref={previewCanvasRef}
                style={{ display: 'block', width: '100%', height: 'auto', imageRendering: 'pixelated' }}
              />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>
              Dark = filled block · Light = open mesh
            </p>
          </div>
        )}

        {/* ── Threshold slider ─────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Fill level
            </p>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700,
              color: '#2C2218', background: '#F2EAD8',
              borderRadius: 999, padding: '3px 10px',
            }}>
              {settings.threshold} / 255
            </span>
          </div>
          <input
            type="range" min={1} max={255} step={1} value={settings.threshold}
            onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { threshold: parseInt(e.target.value) } })}
            style={{ width: '100%', accentColor: '#C4614A', marginBottom: 4 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>Fewer fills →</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>← More fills</p>
          </div>
        </div>

        {/* ── Invert toggle ────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <button
            onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { invert: !settings.invert } })}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#2C2218' }}>Invert fills</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', marginTop: 2 }}>
                Flip dark/light — use when subject is light on a dark background
              </p>
            </div>
            <span style={{ flexShrink: 0, marginLeft: 12, width: 44, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', background: settings.invert ? '#C4614A' : '#C8BFB0', padding: '3px', transition: 'background 0.2s' }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', transform: settings.invert ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
            </span>
          </button>
        </div>

        {/* ── Grid size ────────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Grid size
          </p>

          {/* Preset chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {SIZE_PRESETS.map(p => {
              const active = activePreset === p.label
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.label)}
                  style={{
                    padding: '6px 14px', borderRadius: 999,
                    border: active ? '2px solid #C4614A' : '1.5px solid #E4D9C8',
                    background: active ? 'rgba(196,97,74,0.08)' : 'white',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: active ? 700 : 400,
                    color: active ? '#C4614A' : '#6B5744',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}{p.label !== 'Custom' ? ` (${p.width}×${p.height})` : ''}
                </button>
              )
            })}
          </div>

          {/* Width × Height inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Columns wide</p>
              <input
                type="number" min={10} max={200} value={customW}
                onChange={e => handleCustomW(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: '#C8BFB0', textAlign: 'center', paddingTop: 18 }}>×</p>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Rows tall</p>
              <input
                type="number" min={10} max={200} value={customH}
                onChange={e => handleCustomH(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 8 }}>
            10–200 each direction · {settings.width * settings.height} total squares
          </p>
        </div>

        {error && (
          <div style={{ width: '100%', maxWidth: 400, background: 'rgba(196,97,74,0.08)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{error}</p>
          </div>
        )}

      </section>

      {/* Bottom CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to bottom, transparent, #FAF6EF 35%)', padding: '20px 20px max(24px, env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              width: '100%', padding: '16px',
              background: canGenerate ? '#C4614A' : '#E4D9C8',
              color: canGenerate ? 'white' : '#B8AAA0',
              border: 'none', borderRadius: 16,
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600,
              cursor: canGenerate ? 'pointer' : 'not-allowed',
              boxShadow: canGenerate ? '0 4px 20px rgba(196,97,74,0.28)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            {isGenerating ? (
              <>
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'filet-spin 0.8s linear infinite', display: 'inline-block' }} />
                Generating…
              </>
            ) : (
              `Generate ${settings.width}×${settings.height} Chart →`
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes filet-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
