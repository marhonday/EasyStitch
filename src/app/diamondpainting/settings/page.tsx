'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDiamondPainting } from '@/context/DiamondPaintingContext'
import { generatePattern } from '@/modules/pattern-engine/generatePattern'
import { canvasSizeCm, canvasSizeInches } from '@/modules/diamond/dmcMatcher'
import { logEvent } from '@/lib/log'

const SIZE_PRESETS = [
  { label: 'Small',    width: 40,  height: 50  },
  { label: 'Portrait', width: 60,  height: 80  },
  { label: 'Standard', width: 80,  height: 100 },
  { label: 'Large',    width: 100, height: 130 },
  { label: 'Custom',   width: 0,   height: 0   },
]

export default function DiamondPaintingSettingsPage() {
  const router = useRouter()
  const { state, dispatch } = useDiamondPainting()
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
        stitchStyle:     'crossStitch' as const,   // same square-cell grid engine
        imageType:       settings.imageType,
        backgroundColor: '#ffffff',
        borderLayers:    [],
        dithering:       false,
      }
      const result = await generatePattern(rawImage, patternSettings)
      logEvent('GENERATION_COMPLETED')
      dispatch({ type: 'SET_PATTERN', payload: result })
      router.push('/diamondpainting/export')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Try again.')
      dispatch({ type: 'SET_GENERATING', payload: false })
    } finally {
      inFlight.current = false
    }
  }

  const isGenerating = state.isGenerating
  const canGenerate  = !!rawImage && !isGenerating && settings.width >= 10 && settings.height >= 10

  const cm  = canvasSizeCm(settings.width, settings.height)
  const ins = canvasSizeInches(settings.width, settings.height)

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #EDE4D8' }}>
        <button onClick={() => router.push('/diamondpainting')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}>
          ← Back
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Canvas Settings</p>
        <div style={{ width: 48 }} />
      </div>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 140px', gap: 16 }}>

        {/* ── Drill type ──────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Drill type
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              ['round',  '🔵', 'Round Drills',  'Easiest to place · tiny gaps between diamonds · great for beginners'],
              ['square', '🔷', 'Square Drills', 'Seamless coverage · sharper image · more advanced · preferred by experienced painters'],
            ] as const).map(([val, icon, label, hint]) => {
              const active = settings.drillType === val
              return (
                <button
                  key={val}
                  onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { drillType: val } })}
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
        </div>

        {/* ── Canvas size ─────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Canvas size
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Diamonds wide</p>
              <input
                type="number" min={10} max={300} value={customW}
                onChange={e => handleCustomW(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: '#C8BFB0', textAlign: 'center', paddingTop: 18 }}>×</p>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Diamonds tall</p>
              <input
                type="number" min={10} max={300} value={customH}
                onChange={e => handleCustomH(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Live canvas size */}
          <div style={{ background: 'rgba(196,97,74,0.06)', border: '1px solid #EDE4D8', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>
              📐 Canvas size: <strong style={{ color: '#2C2218' }}>{cm.w}cm × {cm.h}cm</strong>
              <span style={{ color: '#9A8878' }}> ({ins.w}&quot; × {ins.h}&quot;)</span>
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 4 }}>
              At the standard 2.5mm per diamond · {settings.width * settings.height} total diamonds
            </p>
          </div>
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
            type="range" min={5} max={30} step={1} value={settings.maxColors}
            onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { maxColors: parseInt(e.target.value) } })}
            style={{ width: '100%', accentColor: '#C4614A' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>5 — bold & simple</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>30 — detailed</p>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 6 }}>
            More colours = more diamond types to order. 12–20 is the sweet spot for most photos.
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
                <button key={val} onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { imageType: val } })}
                  style={{ padding: '12px 10px', borderRadius: 12, textAlign: 'left', border: active ? '2px solid #C4614A' : '1.5px solid #E4D9C8', background: active ? 'rgba(196,97,74,0.06)' : 'white', cursor: 'pointer' }}
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
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'dp-spin 0.8s linear infinite', display: 'inline-block' }} />
                Generating…
              </>
            ) : (
              `Generate ${settings.width}×${settings.height} Chart →`
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes dp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
