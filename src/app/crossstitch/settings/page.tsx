'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCrossStitch } from '@/context/CrossStitchPatternContext'
import { generatePattern } from '@/modules/pattern-engine/generatePattern'
import { preprocessImageForCrossStitch } from '@/lib/crossStitchPreprocess'
import { logEvent } from '@/lib/log'

const SIZE_PRESETS = [
  { label: 'Bookmark', width: 20,  height: 80  },
  { label: 'Card',     width: 50,  height: 70  },
  { label: 'Small',    width: 80,  height: 100 },
  { label: 'Large',    width: 120, height: 150 },
  { label: 'Custom',   width: 0,   height: 0   },
]

const AIDA_COUNTS = [14, 18, 28] as const

export default function CrossStitchSettingsPage() {
  const router = useRouter()
  const { state, dispatch } = useCrossStitch()
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
    if (!isNaN(n) && n >= 10 && n <= 200) dispatch({ type: 'UPDATE_SETTINGS', payload: { width: n } })
  }

  function handleCustomH(val: string) {
    setCustomH(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 10 && n <= 200) dispatch({ type: 'UPDATE_SETTINGS', payload: { height: n } })
  }

  // Finished size at current Aida count
  const finishedW = (settings.width  / settings.aidaCount).toFixed(1)
  const finishedH = (settings.height / settings.aidaCount).toFixed(1)

  async function handleGenerate() {
    if (inFlight.current || !rawImage) return
    inFlight.current = true
    setError(null)
    dispatch({ type: 'SET_GENERATING', payload: true })
    logEvent('GENERATION_STARTED')
    try {
      // Auto-fit: complexity-adaptive fill (70–88%) centred in natural background
      const { dataUrl: processedImage } = await preprocessImageForCrossStitch(rawImage)
      const patternSettings = {
        gridSize:        { label: 'Custom', width: settings.width, height: settings.height },
        maxColors:       settings.maxColors,
        stitchStyle:     'crossStitch' as const,
        imageType:       settings.imageType,
        backgroundColor: '#ffffff',
        borderLayers:    [],
        dithering:       settings.dithering,
      }
      const result = await generatePattern(processedImage, patternSettings)
      logEvent('GENERATION_COMPLETED')
      dispatch({ type: 'SET_PATTERN', payload: result })
      router.push('/crossstitch/export')
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #EDE4D8' }}>
        <button onClick={() => router.push('/crossstitch')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878', cursor: 'pointer' }}>
          ← Back
        </button>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2C2218' }}>Chart Settings</p>
        <div style={{ width: 48 }} />
      </div>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 140px', gap: 16 }}>

        {/* ── Aida count + finished size reference ────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
            Aida count
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginBottom: 12 }}>
            Choose your fabric count to see finished size — does not affect the chart.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {AIDA_COUNTS.map(count => {
              const active = settings.aidaCount === count
              return (
                <button
                  key={count}
                  onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { aidaCount: count } })}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 12, textAlign: 'center',
                    border: active ? '2px solid #C4614A' : '1.5px solid #E4D9C8',
                    background: active ? 'rgba(196,97,74,0.06)' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: active ? '#C4614A' : '#2C2218' }}>{count}ct</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>
                    {count === 14 ? 'Standard' : count === 18 ? 'Fine' : 'Very fine'}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Live finished size */}
          <div style={{ background: 'rgba(196,97,74,0.06)', border: '1px solid #EDE4D8', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>
              📏 At {settings.aidaCount}-count: <strong style={{ color: '#2C2218' }}>{finishedW}" wide × {finishedH}" tall</strong>
            </p>
          </div>
        </div>

        {/* ── Grid size ───────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Stitch count
          </p>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Stitches wide</p>
              <input
                type="number" min={10} max={200} value={customW}
                onChange={e => handleCustomW(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: '#C8BFB0', textAlign: 'center', paddingTop: 18 }}>×</p>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 4 }}>Stitches tall</p>
              <input
                type="number" min={10} max={200} value={customH}
                onChange={e => handleCustomH(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E4D9C8', fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#2C2218', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 8 }}>
            10–200 each direction · {settings.width * settings.height} total stitches
          </p>
        </div>

        {/* ── Colour count ─────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Colours</p>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: '#2C2218' }}>{settings.maxColors}</span>
          </div>
          <input
            type="range" min={2} max={20} step={1} value={Math.min(settings.maxColors, 20)}
            onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { maxColors: parseInt(e.target.value) } })}
            style={{ width: '100%', accentColor: '#C4614A' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>2 — bold</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>20 — detailed</p>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 6 }}>
            {settings.imageType === 'photo' ? 'Portraits & pets: 10–16 colours recommended.' : 'Graphics & logos: 6–12 colours recommended.'}
          </p>
        </div>

        {/* ── Dithering toggle ─────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                Light dithering
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                Softens colour edges with a subtle dot pattern.
              </p>
            </div>
            <button
              onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { dithering: !settings.dithering } })}
              style={{
                width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: settings.dithering ? '#C4614A' : '#E4D9C8',
                position: 'relative', flexShrink: 0, marginLeft: 12,
                transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: settings.dithering ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </button>
          </div>
        </div>

        {/* ── Image type ───────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Image type</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([['photo', '📷', 'Photo', 'Portraits, pets, landscapes'], ['graphic', '🎨', 'Graphic', 'Logos, flat design, clip art']] as const).map(([val, icon, label, hint]) => {
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
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'cs-spin 0.8s linear infinite', display: 'inline-block' }} />
                Generating…
              </>
            ) : (
              `Generate ${settings.width}×${settings.height} Chart →`
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes cs-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
