'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import Header        from '@/components/layout/Header'
import StepIndicator from '@/components/ui/StepIndicator'
import BottomCTA     from '@/components/layout/BottomCTA'
import { usePattern }            from '@/context/PatternContext'
import { usePatternGeneration }  from '@/hooks/usePatternGeneration'
import { GRID_SIZES, STITCH_STYLE_META, MIN_COLORS, MAX_COLORS } from '@/lib/constants'
import { StitchStyle, GridSize, ImageType } from '@/types/pattern'

const IMAGE_TYPE_OPTIONS: { id: ImageType; emoji: string; label: string; hint: string }[] = [
  { id: 'photo',   emoji: '📷', label: 'Photo',   hint: 'Real photo — pet, portrait, flowers, landscape' },
  { id: 'graphic', emoji: '🎨', label: 'Graphic',  hint: 'Logo, clip art, cartoon, flat design' },
]

const STITCH_ICONS: Record<StitchStyle, string> = {
  c2c:           '◪',
  singleCrochet: '▦',
}

// Difficulty tiers — suggest color count based on photo complexity
const DIFFICULTY_TIERS = [
  {
    id:      'simple',
    label:   'Beginner',
    emoji:   '🟢',
    colors:  6,
    hint:    'Bold shapes, plain background',
    example: 'Logos, simple icons',
  },
  {
    id:      'medium',
    label:   'Intermediate',
    emoji:   '🟡',
    colors:  12,
    hint:    'Some detail, light texture',
    example: 'Portraits, pets with detail',
  },
  {
    id:      'complex',
    label:   'Expert',
    emoji:   '🔴',
    colors:  25,
    hint:    'Fine detail, many tones',
    example: 'Landscapes, busy scenes',
  },
]

export default function SettingsPage() {
  const router  = useRouter()
  const { state, dispatch }        = usePattern()
  const { generate, isGenerating, error } = usePatternGeneration()
  const { settings } = state

  function setImageType(type: ImageType) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { imageType: type } })
  }



  function setStitchStyle(style: StitchStyle) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { stitchStyle: style } })
  }

  function setGridSize(size: GridSize) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { gridSize: size } })
  }

  function setMaxColors(count: number) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { maxColors: count } })
  }

  function applyDifficulty(colors: number) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { maxColors: colors } })
  }

  // Which difficulty tier is currently active (if any)
  const activeTier = useMemo(() =>
    DIFFICULTY_TIERS.find(t => t.colors === settings.maxColors)?.id ?? null,
    [settings.maxColors]
  )

  async function handleGenerate() {
    const succeeded = await generate()
    if (succeeded) router.push('/preview')
  }

  const cardBase: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 4, padding: '10px 8px', borderRadius: 12,
    border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s ease',
    background: 'white', position: 'relative', textAlign: 'center',
  }

  return (
    <main className="min-h-screen flex flex-col bg-cream-50">
      <Header />
      <StepIndicator />

      <section className="flex-1 flex flex-col px-5 pt-2 pb-44 gap-6">

        {/* Photo preview — shows what we're working with */}
        {state.rawImage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 14, padding: '10px 14px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.enhancedImage ?? state.rawImage}
                alt="Your photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2218', marginBottom: 1 }}>
                Photo ready
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                {state.enhancedImage ? '✨ Auto-enhanced' : 'Original photo'}
              </p>
            </div>
            <button
              onClick={() => router.push('/upload')}
              style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', cursor: 'pointer', flexShrink: 0 }}
            >
              Change
            </button>
          </div>
        )}

        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#2C2218', marginBottom: 3 }}>Pattern settings</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>Adjust these to match your photo and project.</p>
        </div>

        {/* ── Image Type ───────────────────────────────────────────────── */}
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 3 }}>Image type</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginBottom: 10 }}>
            Choose <strong>Photo</strong> for real photos — it uses the full colour engine.
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
                    padding: '10px 10px',
                    borderColor: isActive ? '#C4614A' : '#E8DDD0',
                    background:  isActive ? 'rgba(196,97,74,0.06)' : '#FAF6EF',
                    boxShadow:   isActive ? '0 0 0 2px rgba(196,97,74,0.15)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, color: isActive ? '#C4614A' : '#2C2218' }}>
                    {opt.label}
                  </span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: isActive ? 'rgba(196,97,74,0.75)' : '#6B5744', lineHeight: 1.4 }}>
                    {opt.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Stitch Style ─────────────────────────────────────────────── */}
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 3 }}>Stitch style</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginBottom: 10 }}>
            C2C builds diagonally. Single crochet works in rows — better for fine detail.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(STITCH_STYLE_META) as StitchStyle[]).map(style => {
              const meta     = STITCH_STYLE_META[style]
              const isActive = settings.stitchStyle === style

              return (
                <button
                  key={style}
                  onClick={() => setStitchStyle(style)}
                  style={{
                    ...cardBase,
                    padding: '11px 10px',
                    borderColor:     isActive ? '#C4614A' : '#E8DDD0',
                    background:      isActive ? 'rgba(196,97,74,0.06)' : 'white',
                    boxShadow:       isActive ? '0 0 0 2px rgba(196,97,74,0.15)' : '0 1px 4px rgba(44,34,24,0.06)',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{STITCH_ICONS[style]}</span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12,
                    color: isActive ? '#C4614A' : '#2C2218',
                  }}>
                    {meta.label}
                  </span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                    color: isActive ? 'rgba(196,97,74,0.75)' : '#6B5744',
                    lineHeight: 1.4,
                  }}>
                    {meta.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Background Colour ────────────────────────────────────────── */}
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 3 }}>Background colour</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginBottom: 10 }}>
            One colour slot is used for the background. White suits most photos.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
            <input
              type="color"
              value={settings.backgroundColor ?? '#ffffff'}
              onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { backgroundColor: e.target.value } })}
              style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #E4D9C8', cursor: 'pointer', padding: 2, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2218' }}>
                {settings.backgroundColor === '#ffffff' || !settings.backgroundColor ? 'White (default)' : settings.backgroundColor}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', marginTop: 1 }}>
                Tap swatch to change
              </div>
            </div>
            {settings.backgroundColor && settings.backgroundColor !== '#ffffff' && (
              <button
                onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { backgroundColor: '#ffffff' } })}
                style={{ marginLeft: 'auto', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C4614A', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Border Layers ─────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218' }}>Border layers</p>
            {(settings.borderLayers ?? []).length < 3 && (
              <button
                onClick={() => {
                  const layers = [...(settings.borderLayers ?? [])]
                  layers.push({ color: '#ffffff', width: 2 })
                  dispatch({ type: 'UPDATE_SETTINGS', payload: { borderLayers: layers } })
                }}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C4614A', background: 'rgba(196,97,74,0.08)', border: 'none', borderRadius: 7, padding: '3px 10px', cursor: 'pointer' }}
              >
                + Add
              </button>
            )}
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginBottom: 10 }}>
            Optional colour border around the pattern edge — good for logos and framing.
          </p>

          {(settings.borderLayers ?? []).length === 0 && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C8BFB0', padding: '8px 0' }}>
              No border added
            </p>
          )}

          {(settings.borderLayers ?? []).map((layer, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 12, padding: '10px 14px', marginBottom: 8, boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(layer.color) ? layer.color : '#ffffff'}
                onChange={e => {
                  const layers = [...(settings.borderLayers ?? [])]
                  layers[i] = { ...layers[i], color: e.target.value }
                  dispatch({ type: 'UPDATE_SETTINGS', payload: { borderLayers: layers } })
                }}
                style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #E4D9C8', cursor: 'pointer', padding: 2, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#2C2218', marginBottom: 4 }}>
                  Layer {i + 1} · {i === 0 ? 'Outermost' : i === (settings.borderLayers ?? []).length - 1 ? 'Innermost' : 'Middle'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>Width:</span>
                  {[1,2,3,4,6].map(w => (
                    <button
                      key={w}
                      onClick={() => {
                        const layers = [...(settings.borderLayers ?? [])]
                        layers[i] = { ...layers[i], width: w }
                        dispatch({ type: 'UPDATE_SETTINGS', payload: { borderLayers: layers } })
                      }}
                      style={{
                        width: 26, height: 22, borderRadius: 5, fontSize: 11,
                        fontFamily: "'DM Sans', sans-serif",
                        background: layer.width === w ? '#C4614A' : '#F2EAD8',
                        color:      layer.width === w ? 'white' : '#6B5744',
                        border: 'none', cursor: 'pointer', fontWeight: layer.width === w ? 600 : 400,
                      }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  const layers = (settings.borderLayers ?? []).filter((_, j) => j !== i)
                  dispatch({ type: 'UPDATE_SETTINGS', payload: { borderLayers: layers } })
                }}
                style={{ background: 'none', border: 'none', fontSize: 14, color: '#C8BFB0', cursor: 'pointer', padding: 4 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* ── Grid Size ────────────────────────────────────────────────── */}
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 3 }}>Blanket size</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginBottom: 10 }}>
            Larger = more detail and more stitches. Throw is a good all-round choice.
          </p>
          <div className="grid grid-cols-5 gap-2">
            {GRID_SIZES.map(size => {
              const isActive = settings.gridSize.label === size.label
              return (
                <button
                  key={size.label}
                  onClick={() => setGridSize(size)}
                  style={{
                    ...cardBase,
                    padding: '10px 4px',
                    borderColor: isActive ? '#C4614A' : '#E8DDD0',
                    background:  isActive ? 'rgba(196,97,74,0.06)' : 'white',
                    boxShadow:   isActive ? '0 0 0 2px rgba(196,97,74,0.15)' : '0 1px 4px rgba(44,34,24,0.06)',
                  }}
                >
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12,
                    color: isActive ? '#C4614A' : '#2C2218',
                  }}>
                    {size.label}
                  </span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#6B5744' }}>
                    {size.width}×{size.height}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Colour Count ─────────────────────────────────────────────── */}
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218', marginBottom: 3 }}>Number of colours</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginBottom: 10 }}>
            Auto-detected from your photo — fewer colours is simpler to stitch.
          </p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {DIFFICULTY_TIERS.map(tier => {
              const isActive = activeTier === tier.id
              return (
                <button
                  key={tier.id}
                  onClick={() => applyDifficulty(tier.colors)}
                  style={{
                    ...cardBase,
                    padding: '10px 6px',
                    borderColor: isActive ? '#C4614A' : '#E8DDD0',
                    background:  isActive ? 'rgba(196,97,74,0.06)' : 'white',
                    boxShadow:   isActive ? '0 0 0 2px rgba(196,97,74,0.15)' : '0 1px 4px rgba(44,34,24,0.06)',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{tier.emoji}</span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 11,
                    color: isActive ? '#C4614A' : '#2C2218',
                  }}>
                    {tier.label}
                  </span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                    color: '#6B5744', lineHeight: 1.3,
                  }}>
                    {tier.colors} colours
                  </span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                    color: isActive ? 'rgba(196,97,74,0.7)' : '#9A8878',
                    lineHeight: 1.3,
                  }}>
                    {tier.hint}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Fine-tune slider */}
          <div style={{
            background: 'white', borderRadius: 14, padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(44,34,24,0.06)',
          }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2218' }}>Fine-tune</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', marginTop: 1 }}>Drag to set exact count</p>
              </div>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28, fontWeight: 700, color: '#C4614A', lineHeight: 1,
              }}>
                {settings.maxColors}
              </span>
            </div>

            {/* Colour bar visualiser */}
            <div className="flex gap-1 mb-3">
              {Array.from({ length: MAX_COLORS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: 8, borderRadius: 4,
                    background: i < settings.maxColors ? '#C4614A' : '#E8DDD0',
                    opacity: i < settings.maxColors ? 1 - (i * 0.55 / settings.maxColors) : 1,
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
            </div>

            <input
              type="range"
              min={MIN_COLORS}
              max={MAX_COLORS}
              value={Math.max(MIN_COLORS, Math.min(settings.maxColors, MAX_COLORS))}
              onChange={(e) => setMaxColors(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#C4614A' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>{MIN_COLORS}</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>{MAX_COLORS}</span>
            </div>
            {state.detectedColors && state.recommendedColors && (
              <>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6B5744', marginTop: 8 }}>
                  Detected {state.detectedColors} dominant {state.detectedColors === 1 ? 'colour' : 'colours'} · recommended: <strong>{state.recommendedColors}</strong>
                </p>
                {(state.dominantPalette?.length ?? 0) > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginBottom: 8 }}>Dominant swatches from your photo</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                      {(state.dominantPalette ?? []).slice(0, 8).map((swatch, idx) => {
                        const totalPopulation = (state.dominantPalette ?? []).reduce((sum, item) => sum + item.population, 0)
                        const pct = totalPopulation > 0 ? Math.round((swatch.population / totalPopulation) * 100) : 0
                        return (
                          <div
                            key={`${swatch.hex}-${idx}`}
                            style={{
                              background: '#FAF6EF',
                              border: '1px solid #E8DDD0',
                              borderRadius: 10,
                              padding: '8px 6px',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                margin: '0 auto 6px',
                                background: swatch.hex,
                                border: '1px solid rgba(44,34,24,0.12)',
                              }}
                              aria-label={`Detected swatch ${swatch.hex}`}
                            />
                            <p className="font-body text-[10px] text-ink/70" style={{ lineHeight: 1.2 }}>{swatch.hex}</p>
                            <p className="font-body text-[10px] text-ink/40" style={{ lineHeight: 1.2 }}>{pct}%</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </section>

      {/* Generation error */}
      {error && (
        <div className="px-5 pb-4">
          <div style={{
            background: 'rgba(196,97,74,0.08)', border: '1px solid rgba(196,97,74,0.2)',
            borderRadius: 16, padding: '12px 16px',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: '#C4614A', marginBottom: 2 }}>
                Couldn&apos;t generate pattern
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(196,97,74,0.7)' }}>
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomCTA
        primaryLabel="Generate Pattern"
        onPrimary={handleGenerate}
        isLoading={isGenerating}
        primaryDisabled={!state.rawImage && !state.patternData}
      />
    </main>
  )
}
// BUILD_MARKER_1774196984
