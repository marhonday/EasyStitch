'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
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
  const [customizeOpen, setCustomizeOpen] = useState(false)

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
    gap: 6, padding: '14px 10px', borderRadius: 16,
    border: '2px solid', cursor: 'pointer', transition: 'all 0.15s ease',
    background: 'white', position: 'relative', textAlign: 'center',
  }

  return (
    <main className="min-h-screen flex flex-col bg-cream-50">
      <Header />
      <StepIndicator />

      <section className="flex-1 flex flex-col px-5 pt-2 pb-44 gap-7">

        {/* Photo preview — shows what we're working with */}
        {state.rawImage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 16, padding: '10px 14px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: settings.backgroundColor ?? '#ffffff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.enhancedImage ?? state.rawImage}
                alt="Your photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2218', marginBottom: 2 }}>
                Photo ready
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                {state.enhancedImage ? '✨ Auto-enhanced for best results' : 'Original photo'}
              </p>
            </div>
            <button
              onClick={() => router.push('/upload')}
              style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
            >
              Change
            </button>
          </div>
        )}

        <div>
          <h1 className="font-display text-2xl text-ink mb-1">Pattern settings</h1>
          <p className="font-body text-sm text-ink/50">Customise how your pattern looks.</p>
        </div>

        {/* ── Image Type — auto-detected, user can override ────────────── */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p className="font-body font-semibold text-sm text-ink">Image type</p>
          </div>
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
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0', marginTop: 8 }}>
            Select <strong>Photo</strong> for pets, portraits and landscapes — it unlocks the full colour detail engine.
          </p>
        </div>

        {/* ── Stitch Style ─────────────────────────────────────────────── */}
        <div>
          <p className="font-body font-semibold text-sm text-ink mb-3">Stitch style</p>
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
                    borderColor:     isActive ? '#C4614A' : '#E8DDD0',
                    background:      isActive ? 'rgba(196,97,74,0.06)' : 'white',
                    boxShadow:       isActive ? '0 0 0 3px rgba(196,97,74,0.12)' : '0 1px 4px rgba(44,34,24,0.06)',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{STITCH_ICONS[style]}</span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13,
                    color: isActive ? '#C4614A' : '#2C2218',
                  }}>
                    {meta.label}
                  </span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                    color: isActive ? 'rgba(196,97,74,0.7)' : '#9A8878',
                    lineHeight: 1.3,
                  }}>
                    {meta.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Grid Size ────────────────────────────────────────────────── */}
        <div>
          <p className="font-body font-semibold text-sm text-ink mb-1">Grid size</p>
          <p className="font-body text-xs text-ink/40 mb-3">
            Larger grids = more detail, more stitches.
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
                    padding: '14px 8px',
                    borderColor: isActive ? '#C4614A' : '#E8DDD0',
                    background:  isActive ? 'rgba(196,97,74,0.06)' : 'white',
                    boxShadow:   isActive ? '0 0 0 3px rgba(196,97,74,0.12)' : '0 1px 4px rgba(44,34,24,0.06)',
                  }}
                >
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14,
                    color: isActive ? '#C4614A' : '#2C2218',
                  }}>
                    {size.label}
                  </span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                    {size.width}×{size.height}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Warning: graphic logos with text lose detail at small grid sizes */}
          {settings.imageType === 'graphic' && settings.gridSize.width <= 50 && (
            <div style={{
              marginTop: 10, padding: '10px 13px',
              background: 'rgba(196,97,74,0.07)', border: '1px solid rgba(196,97,74,0.2)',
              borderRadius: 12, display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#7A4A38', lineHeight: 1.5, margin: 0 }}>
                Fine text and thin outlines in logos may not be readable at <strong>{settings.gridSize.label}</strong> size.
                Try <strong>Throw</strong> or larger for clearer lettering — or generate and use the{' '}
                <strong>cell editor</strong> to fix any unclear stitches after.
              </p>
            </div>
          )}
        </div>

        {/* ── Colour Difficulty ────────────────────────────────────────── */}
        <div>
          <p className="font-body font-semibold text-sm text-ink mb-1">Photo complexity</p>
          <p className="font-body text-xs text-ink/40 mb-3">
            Match to your photo — or dial in the exact count below.
          </p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {DIFFICULTY_TIERS.map(tier => {
              const isActive = activeTier === tier.id
              return (
                <button
                  key={tier.id}
                  onClick={() => applyDifficulty(tier.colors)}
                  style={{
                    ...cardBase,
                    padding: '12px 8px',
                    borderColor: isActive ? '#C4614A' : '#E8DDD0',
                    background:  isActive ? 'rgba(196,97,74,0.06)' : 'white',
                    boxShadow:   isActive ? '0 0 0 3px rgba(196,97,74,0.12)' : '0 1px 4px rgba(44,34,24,0.06)',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{tier.emoji}</span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12,
                    color: isActive ? '#C4614A' : '#2C2218',
                  }}>
                    {tier.label}
                  </span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                    color: '#9A8878', lineHeight: 1.3,
                  }}>
                    {tier.colors} colours
                  </span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                    color: isActive ? 'rgba(196,97,74,0.6)' : '#B8AAA0',
                    lineHeight: 1.3,
                  }}>
                    {tier.hint}
                  </span>
                </button>
              )
            })}
          </div>

        </div>

        {/* ── Customize Pattern (collapsible) ──────────────────────────── */}
        <div>
          <button
            onClick={() => setCustomizeOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'white', border: '1.5px solid #E4D9C8', borderRadius: 16,
              padding: '13px 16px', cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(44,34,24,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🎨</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#2C2218' }}>
                Customize Pattern
              </span>
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', transition: 'transform 0.2s', display: 'inline-block', transform: customizeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▾
            </span>
          </button>

          {customizeOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>

              {/* Fine-tune slider */}
              <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-body text-sm font-medium text-ink">Fine-tune colours</p>
                    <p className="font-body text-xs text-ink/40">Fewer = simpler to stitch</p>
                  </div>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#C4614A', lineHeight: 1 }}>
                    {settings.maxColors}
                  </span>
                </div>
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
                <div className="flex justify-between text-xs font-body text-ink/30 mt-1">
                  <span>{MIN_COLORS} colours</span>
                  <span>{MAX_COLORS} colours</span>
                </div>
                {state.detectedColors && state.recommendedColors && (
                  <>
                    <p className="font-body text-xs text-ink/50 mt-2">
                      We detected {state.detectedColors} dominant {state.detectedColors === 1 ? 'color' : 'colors'} - recommended: {state.recommendedColors} colors
                    </p>
                    {(state.dominantPalette?.length ?? 0) > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <p className="font-body text-[11px] text-ink/40 mb-2">Detected dominant swatches</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                          {(state.dominantPalette ?? []).slice(0, 8).map((swatch, idx) => {
                            const totalPopulation = (state.dominantPalette ?? []).reduce((sum, item) => sum + item.population, 0)
                            const pct = totalPopulation > 0 ? Math.round((swatch.population / totalPopulation) * 100) : 0
                            return (
                              <div key={`${swatch.hex}-${idx}`} style={{ background: '#FAF6EF', border: '1px solid #E8DDD0', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                                <div style={{ width: 22, height: 22, borderRadius: 6, margin: '0 auto 6px', background: swatch.hex, border: '1px solid rgba(44,34,24,0.12)' }} aria-label={`Detected swatch ${swatch.hex}`} />
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

              {/* Background colour */}
              <div>
                <p className="font-body font-semibold text-sm text-ink mb-1">Background colour</p>
                <p className="font-body text-xs text-ink/40 mb-3">
                  One palette slot is reserved for the background. White works for most photos.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
                  <input
                    type="color"
                    value={settings.backgroundColor ?? '#ffffff'}
                    onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { backgroundColor: e.target.value } })}
                    style={{ width: 40, height: 40, borderRadius: 10, border: '1.5px solid #E4D9C8', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: '#2C2218' }}>
                      {settings.backgroundColor === '#ffffff' || !settings.backgroundColor ? 'White (default)' : settings.backgroundColor}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 2 }}>
                      Tap to change — applies to background of your pattern
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

              {/* Border layers */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p className="font-body font-semibold text-sm text-ink">Border layers</p>
                  {(settings.borderLayers ?? []).length < 3 && (
                    <button
                      onClick={() => {
                        const layers = [...(settings.borderLayers ?? [])]
                        layers.push({ color: '#ffffff', width: 2 })
                        dispatch({ type: 'UPDATE_SETTINGS', payload: { borderLayers: layers } })
                      }}
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4614A', background: 'rgba(196,97,74,0.08)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
                    >
                      + Add layer
                    </button>
                  )}
                </div>
                <p className="font-body text-xs text-ink/40 mb-3">
                  Up to 3 layers around the pattern — outermost first.
                </p>
                {(settings.borderLayers ?? []).length === 0 && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C8BFB0', textAlign: 'center', padding: '12px 0' }}>
                    No border — tap + Add layer to add one
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
                      style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #E4D9C8', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginBottom: 4 }}>
                        Layer {i + 1} · {i === 0 ? 'Outermost' : i === (settings.borderLayers ?? []).length - 1 ? 'Innermost' : 'Middle'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                              width: 28, height: 24, borderRadius: 6, fontSize: 11,
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
                      style={{ background: 'none', border: 'none', fontSize: 16, color: '#C8BFB0', cursor: 'pointer', padding: 4 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}
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
