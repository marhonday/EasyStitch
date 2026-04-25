'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Header        from '@/components/layout/Header'
import StepIndicator from '@/components/ui/StepIndicator'
import BottomCTA     from '@/components/layout/BottomCTA'
import { usePattern }            from '@/context/PatternContext'
import { usePatternGeneration }  from '@/hooks/usePatternGeneration'
import { GRID_SIZES, STITCH_STYLE_META } from '@/lib/constants'
import { StitchStyle, GridSize, ImageType } from '@/types/pattern'

const IMAGE_TYPE_OPTIONS: { id: ImageType; emoji: string; label: string; hint: string }[] = [
  { id: 'photo',   emoji: '📷', label: 'Photo',     hint: 'Real photo — pet, portrait, flowers, landscape' },
  { id: 'graphic', emoji: '🎨', label: 'Graphic',   hint: 'Logo, clip art, cartoon, flat design' },
  { id: 'pixel',   emoji: '🔲', label: 'Pixel Art', hint: 'Existing grid or chart — not for real photos' },
]

const STITCH_ICONS: Partial<Record<StitchStyle, string>> = {
  c2c:           '◪',
  singleCrochet: '▦',
  tapestry:      '⬛',
  mosaic:        '◈',
}

const COLOR_TIERS = [
  { id: 'beginner',     label: 'Beginner',     min: 2,  max: 6,  default: 4  },
  { id: 'intermediate', label: 'Intermediate', min: 7,  max: 12, default: 8  },
  { id: 'advanced',     label: 'Advanced',     min: 13, max: 30, default: 15 },
]

function SettingsInner() {
  const router  = useRouter()
  const params  = useSearchParams()
  const { state, dispatch }        = usePattern()
  const { generate, isGenerating, error } = usePatternGeneration()
  const { settings } = state
  const [customizeOpen, setCustomizeOpen] = useState(true)

  // Pre-select style from URL param (e.g. ?style=singleCrochet from home page)
  useEffect(() => {
    const styleParam = params.get('style') as StitchStyle | null
    if (styleParam && styleParam !== settings.stitchStyle) {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { stitchStyle: styleParam } })
    }
  // Only run once on mount — ignore settings.stitchStyle in deps to avoid loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setImageType(type: ImageType) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { imageType: type } })
  }



  function setGridSize(size: GridSize) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { gridSize: size } })
  }

  function setMaxColors(count: number) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { maxColors: count } })
  }

  function tierFromColors(n: number): string {
    if (n <= 6) return 'beginner'
    if (n <= 12) return 'intermediate'
    return 'advanced'
  }
  const [activeTier, setActiveTier] = useState(() => tierFromColors(settings.maxColors))

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
              style={{
                background: 'white', border: '1.5px solid #E4D9C8',
                borderRadius: 8, padding: '5px 12px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                color: '#C4614A', cursor: 'pointer', flexShrink: 0,
              }}
            >
              ⇄ Change photo
            </button>
          </div>
        )}

        <div>
          <h1 className="font-display text-2xl text-ink mb-1">Pattern settings</h1>
          <p className="font-body text-sm text-ink/50">Customise how your pattern looks.</p>
        </div>

        {/* ── Smart complexity recommendation ───────────────────────────── */}
        {state.imageComplexity && state.imageComplexity.level !== 'simple' && (
          <ComplexityBanner
            complexity={state.imageComplexity}
            currentImageType={settings.imageType}
            rawImage={state.rawImage}
            onAutoOptimize={() => dispatch({
              type: 'UPDATE_SETTINGS',
              payload: {
                imageType:  state.imageComplexity!.recommendation,
                maxColors:  state.imageComplexity!.suggestedColors,
              },
            })}
            onSetImageType={(t) => dispatch({ type: 'UPDATE_SETTINGS', payload: { imageType: t } })}
          />
        )}

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

          {/* Inline warning — graphic chosen but image is complex */}
          {settings.imageType === 'graphic' &&
           state.imageComplexity && state.imageComplexity.level === 'complex' && (
            <div style={{
              marginTop: 10, padding: '10px 13px',
              background: 'rgba(196,97,74,0.06)', border: '1px solid rgba(196,97,74,0.25)',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, color: '#7A4A38', marginBottom: 3 }}>
                    Detail loss warning
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#7A4A38', lineHeight: 1.5 }}>
                    Graphic mode uses flat colour regions — fine edges, gradients, and textures in your image will be heavily simplified or lost entirely.
                  </p>
                </div>
              </div>
              {state.rawImage && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 4, aspectRatio: '1', background: '#F2EAD8', maxWidth: 80, margin: '0 auto 4px' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={state.rawImage} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Photo mode</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: 28, color: '#C8BFB0', fontSize: 14 }}>→</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 4, aspectRatio: '1', background: '#F2EAD8', maxWidth: 80, margin: '0 auto 4px' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={state.rawImage}
                        alt="Graphic mode simulation"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.6) saturate(0.25) brightness(1.1)' }}
                      />
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#C4614A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Graphic mode</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { imageType: 'photo' } })}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: '#C4614A', color: 'white',
                  border: 'none', borderRadius: 8,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Switch to Photo mode →
              </button>
            </div>
          )}
        </div>

        {/* ── Stitch Style — read-only ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>Style:</span>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
            color: '#6B5744', background: '#F2EAD8',
            borderRadius: 999, padding: '4px 12px',
          }}>
            {STITCH_ICONS[settings.stitchStyle] ?? ''}{STITCH_ICONS[settings.stitchStyle] ? ' ' : ''}{STITCH_STYLE_META[settings.stitchStyle]?.label ?? settings.stitchStyle}
          </span>
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

        {/* ── Colour count ─────────────────────────────────────────────── */}
        <div>
          <p className="font-body font-semibold text-sm text-ink mb-3">Colour count</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {COLOR_TIERS.map(tier => {
              const isActive = activeTier === tier.id
              return (
                <button
                  key={tier.id}
                  onClick={() => {
                    setActiveTier(tier.id)
                    setMaxColors(tier.default)
                  }}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 999,
                    border: `1.5px solid ${isActive ? '#C4614A' : '#E4D9C8'}`,
                    background: isActive ? '#C4614A' : 'white',
                    color: isActive ? 'white' : '#6B5744',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  {tier.label}
                </button>
              )
            })}
          </div>
          {(() => {
            const tier = COLOR_TIERS.find(t => t.id === activeTier)!
            return (
              <div style={{ background: 'white', borderRadius: 16, padding: '16px 16px', boxShadow: '0 1px 4px rgba(44,34,24,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878' }}>
                    {tier.min}–{tier.max} colours · fewer = easier
                  </p>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: '#C4614A', lineHeight: 1 }}>
                    {settings.maxColors}
                  </span>
                </div>
                <input
                  type="range"
                  min={tier.min}
                  max={tier.max}
                  step={1}
                  value={Math.max(tier.min, Math.min(tier.max, settings.maxColors))}
                  onChange={e => setMaxColors(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#C4614A' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>{tier.min}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>{tier.max}</span>
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── Customize Pattern ─────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 0 }}>

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

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  )
}
// ── Complexity recommendation banner ─────────────────────────────────────────

import type { ComplexityResult } from '@/modules/image-processing/analyzeComplexity'

function ComplexityBanner({
  complexity,
  currentImageType,
  rawImage,
  onAutoOptimize,
  onSetImageType,
}: {
  complexity:       ComplexityResult
  currentImageType: ImageType
  rawImage:         string | null
  onAutoOptimize:   () => void
  onSetImageType:   (t: ImageType) => void
}) {
  const isAlreadyOptimal = currentImageType === complexity.recommendation

  const levelColor   = complexity.level === 'complex' ? '#C4614A' : '#B07840'
  const levelBg      = complexity.level === 'complex' ? 'rgba(196,97,74,0.07)' : 'rgba(176,120,64,0.07)'
  const levelBorder  = complexity.level === 'complex' ? 'rgba(196,97,74,0.22)' : 'rgba(176,120,64,0.22)'

  const levelLabel = complexity.level === 'complex' ? 'Complex image' : 'Detailed image'
  const meterWidth = Math.round(complexity.score * 100)

  return (
    <div style={{
      background: levelBg,
      border: `1px solid ${levelBorder}`,
      borderRadius: 16,
      padding: '14px 16px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: levelColor }}>
            {levelLabel} detected
          </p>
        </div>
        {/* Complexity meter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 64, height: 6, background: '#E8DDD0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${meterWidth}%`,
              background: levelColor, borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: levelColor, fontWeight: 600 }}>
            {meterWidth}%
          </span>
        </div>
      </div>

      {/* Reason text */}
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#5A3E2B', lineHeight: 1.55, marginBottom: 12 }}>
        {complexity.reason}
      </p>

      {isAlreadyOptimal ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(74,144,80,0.08)', borderRadius: 10, border: '1px solid rgba(74,144,80,0.18)' }}>
          <span style={{ fontSize: 14 }}>✅</span>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#3A7040', fontWeight: 600 }}>
            {currentImageType === 'photo' ? 'Photo mode is already selected — great choice for this image' : 'Graphic mode selected and this image looks simple enough'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Auto-optimize CTA */}
          <button
            onClick={onAutoOptimize}
            style={{
              width: '100%', padding: '10px 14px',
              background: levelColor, color: 'white',
              border: 'none', borderRadius: 10,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            ✨ Auto-optimize for best result
            <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
              (switches to {complexity.recommendation === 'photo' ? 'Photo' : 'Graphic'} · adjusts colours)
            </span>
          </button>

          {/* Manual options row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              onClick={() => onSetImageType('photo')}
              style={{
                padding: '8px 10px',
                background: currentImageType === 'photo' ? 'rgba(74,144,80,0.08)' : 'white',
                border: `1.5px solid ${currentImageType === 'photo' ? '#4A9050' : '#E4D9C8'}`,
                borderRadius: 10, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                color: currentImageType === 'photo' ? '#3A7040' : '#2C2218',
                fontWeight: currentImageType === 'photo' ? 700 : 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              📷 Photo mode
              {complexity.recommendation === 'photo' && (
                <span style={{ fontSize: 9, color: levelColor, fontWeight: 700 }}>(recommended)</span>
              )}
            </button>
            <button
              onClick={() => onSetImageType('graphic')}
              style={{
                padding: '8px 10px',
                background: currentImageType === 'graphic' ? 'rgba(196,97,74,0.06)' : 'white',
                border: `1.5px solid ${currentImageType === 'graphic' ? '#C4614A' : '#E4D9C8'}`,
                borderRadius: 10, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                color: currentImageType === 'graphic' ? '#C4614A' : '#9A8878',
                fontWeight: currentImageType === 'graphic' ? 700 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              🎨 Graphic anyway
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// BUILD_MARKER_1774196984
