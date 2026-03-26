'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import Header from '@/components/layout/Header'
import BottomCTA from '@/components/layout/BottomCTA'
import { useCrossStitch } from '@/context/CrossStitchPatternContext'
import { generatePattern } from '@/modules/pattern-engine/generatePattern'
import { ImageType } from '@/types/pattern'

const IMAGE_TYPE_OPTIONS: { id: ImageType; emoji: string; label: string; hint: string }[] = [
  { id: 'photo',   emoji: '📷', label: 'Photo',   hint: 'Real photo — pet, portrait, flowers, landscape' },
  { id: 'graphic', emoji: '🎨', label: 'Graphic',  hint: 'Logo, clip art, cartoon, flat design' },
]

const AIDA_COUNTS = [14, 18, 28] as const

const SIZE_PRESETS = [
  { label: 'Bookmark', width: 20,  height: 80  },
  { label: 'Card',     width: 50,  height: 70  },
  { label: 'Small',    width: 80,  height: 100 },
  { label: 'Large',    width: 120, height: 150 },
  { label: 'Custom',   width: null, height: null },
] as const

const cardBase: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: 6, padding: '14px 10px', borderRadius: 16,
  border: '2px solid', cursor: 'pointer', transition: 'all 0.15s ease',
  background: 'white', position: 'relative', textAlign: 'center',
}

export default function CrossStitchSettingsPage() {
  const router = useRouter()
  const { state, dispatch } = useCrossStitch()
  const { settings } = state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCustomSize, setIsCustomSize] = useState(false)
  const inFlight = useRef(false)

  // Check if current dimensions match a preset
  useEffect(() => {
    const matchesPreset = SIZE_PRESETS.slice(0, -1).some(
      p => p.width === settings.width && p.height === settings.height
    )
    setIsCustomSize(!matchesPreset)
  }, [settings.width, settings.height])

  function applyPreset(preset: typeof SIZE_PRESETS[number]) {
    if (preset.label === 'Custom') {
      setIsCustomSize(true)
      return
    }
    setIsCustomSize(false)
    dispatch({ type: 'UPDATE_SETTINGS', payload: { width: preset.width!, height: preset.height! } })
  }

  function setAidaCount(count: 14 | 18 | 28) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { aidaCount: count } })
  }

  function setMaxColors(count: number) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { maxColors: count } })
  }

  function setImageType(type: ImageType) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { imageType: type } })
  }

  // Finished size in inches at the selected Aida count
  const finishedW = (settings.width  / settings.aidaCount).toFixed(1)
  const finishedH = (settings.height / settings.aidaCount).toFixed(1)

  const handleGenerate = useCallback(async () => {
    if (inFlight.current) return
    if (!state.rawImage) {
      setError('No image available. Please upload a photo first.')
      return
    }

    inFlight.current = true
    setError(null)
    setIsGenerating(true)
    dispatch({ type: 'SET_GENERATING', payload: true })

    try {
      const patternSettings = {
        stitchStyle:     'crossStitch' as const,
        gridSize:        { label: 'Custom', width: settings.width, height: settings.height },
        maxColors:       settings.maxColors,
        imageType:       settings.imageType,
        backgroundColor: '#ffffff',
        borderLayers:    [],
      }
      const patternData = await generatePattern(state.rawImage, patternSettings)
      dispatch({ type: 'SET_PATTERN', payload: patternData })
      router.push('/crossstitch/export')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pattern generation failed'
      setError(message)
      dispatch({ type: 'SET_GENERATING', payload: false })
    } finally {
      inFlight.current = false
      setIsGenerating(false)
    }
  }, [state.rawImage, settings, dispatch, router])

  // Active preset label
  const activePresetLabel = SIZE_PRESETS.slice(0, -1).find(
    p => p.width === settings.width && p.height === settings.height
  )?.label ?? (isCustomSize ? 'Custom' : null)

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
      <Header />

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 20px 180px', gap: 24 }}>

        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218', marginBottom: 4 }}>
            Chart settings
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9A8878' }}>
            Set the size and detail of your cross stitch chart.
          </p>
        </div>

        {/* Photo preview */}
        {state.rawImage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 16, padding: '10px 14px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.rawImage} alt="Your photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2218', marginBottom: 2 }}>Photo ready</p>
            </div>
            <button
              onClick={() => router.push('/crossstitch')}
              style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
            >
              Change
            </button>
          </div>
        )}

        {/* ── Grid size ──────────────────────────────────────────────── */}
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#2C2218', marginBottom: 4 }}>Chart size</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', marginBottom: 12 }}>
            Larger = more detail, more stitches.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
            {SIZE_PRESETS.map(preset => {
              const isActive = preset.label === 'Custom'
                ? activePresetLabel === 'Custom'
                : preset.label === activePresetLabel
              return (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  style={{
                    ...cardBase,
                    padding: '12px 6px',
                    borderColor: isActive ? '#C4614A' : '#E8DDD0',
                    background:  isActive ? 'rgba(196,97,74,0.06)' : 'white',
                    boxShadow:   isActive ? '0 0 0 3px rgba(196,97,74,0.12)' : '0 1px 4px rgba(44,34,24,0.06)',
                  }}
                >
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, color: isActive ? '#C4614A' : '#2C2218' }}>
                    {preset.label}
                  </span>
                  {preset.width !== null && (
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>
                      {preset.width}×{preset.height}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Custom dimension inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', marginBottom: 4 }}>Width (stitches)</p>
              <input
                type="number"
                min={10} max={200}
                value={settings.width}
                onChange={e => {
                  const v = Math.max(10, Math.min(200, Number(e.target.value) || 10))
                  dispatch({ type: 'UPDATE_SETTINGS', payload: { width: v } })
                  setIsCustomSize(true)
                }}
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: '#2C2218',
                  background: 'white', border: '1.5px solid #E4D9C8',
                  borderRadius: 10, outline: 'none',
                }}
              />
            </div>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', marginBottom: 4 }}>Height (stitches)</p>
              <input
                type="number"
                min={10} max={200}
                value={settings.height}
                onChange={e => {
                  const v = Math.max(10, Math.min(200, Number(e.target.value) || 10))
                  dispatch({ type: 'UPDATE_SETTINGS', payload: { height: v } })
                  setIsCustomSize(true)
                }}
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: '#2C2218',
                  background: 'white', border: '1.5px solid #E4D9C8',
                  borderRadius: 10, outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Aida count / finished size ─────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#2C2218', marginBottom: 2 }}>
            Finished size reference
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 12 }}>
            Aida count only affects displayed size — not the chart itself.
          </p>

          {/* Aida count chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {AIDA_COUNTS.map(count => {
              const isActive = settings.aidaCount === count
              return (
                <button
                  key={count}
                  onClick={() => setAidaCount(count)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: `2px solid ${isActive ? '#C4614A' : '#E8DDD0'}`,
                    background: isActive ? 'rgba(196,97,74,0.08)' : '#FAF6EF',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#C4614A' : '#6B5744',
                    cursor: 'pointer',
                  }}
                >
                  {count}ct
                </button>
              )
            })}
          </div>

          {/* Live size display */}
          <div style={{
            background: 'rgba(196,97,74,0.06)',
            border: '1px solid #EDE4D8',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', marginBottom: 4 }}>
              📏 At {settings.aidaCount}-count Aida:
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2C2218' }}>
              {finishedW}&quot; wide × {finishedH}&quot; tall
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 4 }}>
              Based on {settings.width}×{settings.height} stitches
            </p>
          </div>
        </div>

        {/* ── Colour count ───────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#2C2218' }}>Colour count</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                Cross stitch charts work well at 6–20 colours.
              </p>
            </div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#C4614A', lineHeight: 1 }}>
              {settings.maxColors}
            </span>
          </div>
          <input
            type="range"
            min={2} max={32}
            value={settings.maxColors}
            onChange={e => setMaxColors(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#C4614A' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 4 }}>
            <span>2 colours</span>
            <span>32 colours</span>
          </div>
        </div>

        {/* ── Image type ─────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#2C2218', marginBottom: 10 }}>
            Image type
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {IMAGE_TYPE_OPTIONS.map(opt => {
              const isActive = settings.imageType === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setImageType(opt.id)}
                  style={{
                    ...cardBase,
                    padding: '10px 8px',
                    borderColor: isActive ? '#C4614A' : '#E8DDD0',
                    background:  isActive ? 'rgba(196,97,74,0.06)' : '#FAF6EF',
                    boxShadow:   isActive ? '0 0 0 3px rgba(196,97,74,0.12)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{opt.emoji}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, color: isActive ? '#C4614A' : '#2C2218' }}>
                    {opt.label}
                  </span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: isActive ? 'rgba(196,97,74,0.7)' : '#9A8878', lineHeight: 1.3 }}>
                    {opt.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Generation error */}
        {error && (
          <div style={{ background: 'rgba(196,97,74,0.08)', border: '1px solid rgba(196,97,74,0.2)', borderRadius: 16, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: '#C4614A', marginBottom: 2 }}>
                Couldn&apos;t generate chart
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(196,97,74,0.7)' }}>
                {error}
              </p>
            </div>
          </div>
        )}

      </section>

      <BottomCTA
        primaryLabel={isGenerating ? 'Generating…' : 'Generate Chart'}
        onPrimary={handleGenerate}
        isLoading={isGenerating}
        primaryDisabled={!state.rawImage || isGenerating}
      />
    </main>
  )
}
