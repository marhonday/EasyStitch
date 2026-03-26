'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useKnittingPattern } from '@/context/KnittingPatternContext'
import { generatePattern } from '@/modules/pattern-engine/generatePattern'
import { logEvent } from '@/lib/log'

// Knitting-specific size presets (width × height in stitches × rows)
const SIZE_PRESETS = [
  { label: 'Swatch',        width: 40,  height: 50  },
  { label: 'Hat',           width: 80,  height: 80  },
  { label: 'Sweater Panel', width: 120, height: 150 },
  { label: 'Blanket',       width: 160, height: 200 },
  { label: 'Custom',        width: 0,   height: 0   },
]

export default function KnittingSettingsPage() {
  const router = useRouter()
  const { state, dispatch } = useKnittingPattern()
  const { settings, rawImage } = state
  const inFlight = useRef(false)

  const [error,   setError]   = useState<string | null>(null)
  const [customW, setCustomW] = useState(String(settings.width))
  const [customH, setCustomH] = useState(String(settings.height))

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
    if (!isNaN(n) && n >= 10 && n <= 300) dispatch({ type: 'UPDATE_SETTINGS', payload: { width: n } })
  }

  function handleCustomH(val: string) {
    setCustomH(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 10 && n <= 300) dispatch({ type: 'UPDATE_SETTINGS', payload: { height: n } })
  }

  async function handleGenerate() {
    if (inFlight.current || !rawImage) return
    inFlight.current = true
    setError(null)
    dispatch({ type: 'SET_GENERATING', payload: true })
    logEvent('GENERATION_STARTED')
    try {
      const patternSettings = {
        gridSize:        { label: 'Custom', width: settings.width, height: settings.height },
        maxColors:       settings.maxColors,
        stitchStyle:     settings.style,
        imageType:       settings.imageType,
        backgroundColor: '#ffffff',
        borderLayers:    [],
      }
      const result = await generatePattern(rawImage, patternSettings)
      logEvent('GENERATION_COMPLETED')
      dispatch({ type: 'SET_PATTERN', payload: result })
      router.push('/knitting/export')
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
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Knitting Settings</p>
        <div style={{ width: 48 }} />
      </div>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 140px', gap: 16 }}>

        {/* ── Knitting style ─────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Knitting technique
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              ['knittingStranded', '🧵', 'Fair Isle / Stranded', 'Carry both yarns across each row. Great for repeating colourwork motifs.'],
              ['knittingIntarsia',  '🪢', 'Intarsia / Standard', 'Separate yarn per colour block. Best for large solid colour sections.'],
            ] as const).map(([val, icon, label, hint]) => {
              const active = settings.style === val
              return (
                <button
                  key={val}
                  onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { style: val } })}
                  style={{
                    padding: '12px 10px', borderRadius: 12, textAlign: 'left',
                    border: active ? '2px solid #C4614A' : '1.5px solid #E4D9C8',
                    background: active ? 'rgba(196,97,74,0.06)' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{icon}</span>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, color: active ? '#C4614A' : '#2C2218', marginBottom: 3 }}>{label}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', lineHeight: 1.3 }}>{hint}</p>
                </button>
              )
            })}
          </div>
          {/* Cell ratio info */}
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 10 }}>
            {settings.style === 'knittingIntarsia'
              ? 'Graph cells will be rendered 1.25× wider than tall to match standard knitting stitch proportions.'
              : 'Graph cells will be rendered square — Fair Isle stitches are nearly square.'}
          </p>
        </div>

        {/* ── Grid size ───────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Stitch count
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
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Stitches wide</p>
              <input
                type="number" min={10} max={300} value={customW}
                onChange={e => handleCustomW(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: '#C8BFB0', textAlign: 'center', paddingTop: 18 }}>×</p>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Rows tall</p>
              <input
                type="number" min={10} max={300} value={customH}
                onChange={e => handleCustomH(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 8 }}>
            10–300 each direction · {settings.width * settings.height} total stitches
          </p>
        </div>

        {/* ── Colour count ─────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Colours
            </p>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: '#2C2218' }}>
              {settings.maxColors}
            </span>
          </div>
          <input
            type="range" min={2} max={12} step={1} value={settings.maxColors}
            onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { maxColors: parseInt(e.target.value) } })}
            style={{ width: '100%', accentColor: '#C4614A' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>2 — bold contrast</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>12 — detailed</p>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 6 }}>
            Knitting colourwork typically uses 2–6 colours per row.
          </p>
        </div>

        {/* ── Image type ───────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Image type
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([['photo', '📷', 'Photo', 'Pets, portraits, scenery'], ['graphic', '🎨', 'Graphic', 'Logos, flat design, clip art']] as const).map(([val, icon, label, hint]) => {
              const active = settings.imageType === val
              return (
                <button
                  key={val}
                  onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { imageType: val } })}
                  style={{
                    padding: '12px 10px', borderRadius: 12, textAlign: 'left',
                    border: active ? '2px solid #C4614A' : '1.5px solid #E4D9C8',
                    background: active ? 'rgba(196,97,74,0.06)' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{icon}</span>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, color: active ? '#C4614A' : '#2C2218' }}>{label}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', lineHeight: 1.3 }}>{hint}</p>
                </button>
              )
            })}
          </div>
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
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'knit-spin 0.8s linear infinite', display: 'inline-block' }} />
                Generating…
              </>
            ) : (
              `Generate ${settings.width}×${settings.height} Graph →`
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes knit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
