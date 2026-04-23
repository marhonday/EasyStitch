'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { getTemplateBySlug, ShopTemplate, ShopVariant } from '@/lib/shopStore'
import { usePattern } from '@/context/PatternContext'
import { applyPersonalizationToPattern, getPersonalizationCharLimit, recommendedFont } from '@/modules/personalization/personalizePattern'
import { drawPatternToCanvas } from '@/modules/preview-rendering/canvasRenderer'
import { PersonalizationSettings, ColorEntry } from '@/types/pattern'
import { isUnlocked } from '@/lib/unlock'

const DEFAULT_PERSONALIZATION: PersonalizationSettings = {
  enabled:          false,
  titleText:        '',
  dateText:         '',
  fontStyle:        'slim',
  placement:        'below',
  colorMode:        'palette',
  paletteColorIndex: 0,
  customColor:      '#2c2218',
}

// ── Popular sports team colour presets ────────────────────────────────────────
const PRESET_COLORS = [
  // Neutrals
  '#FFFFFF', '#F5F0E8', '#000000', '#1C1C1C', '#4A4A4A',
  // Reds
  '#C8102E', '#D50A0A', '#A71930', '#BD3039', '#CE1141',
  // Blues
  '#003594', '#013369', '#002244', '#0B2265', '#006BB6', '#00538C', '#003087',
  // Greens
  '#006400', '#203731', '#007A33', '#003831', '#154734',
  // Yellows / Golds
  '#FFB612', '#FDB927', '#FFCD00', '#E5A823', '#CFB87C',
  // Oranges
  '#FF6B35', '#FF7900', '#E84D1C', '#F76900',
  // Purples
  '#4B2E84', '#552583', '#1D1160', '#4F2683',
  // Browns (baseball / football)
  '#8B4513', '#6B3A2A', '#3B1F0A', '#5C3317',
  // Sport specific
  '#F58426', // basketball orange
  '#1B5E20', // field green
  '#8D6E63', // baseball dirt
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r
    ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
    : { r: 0, g: 0, b: 0 }
}

function applyPaletteOverrides(
  palette: ColorEntry[],
  overrides: Record<number, string>,
): ColorEntry[] {
  if (Object.keys(overrides).length === 0) return palette
  return palette.map((entry, i) =>
    overrides[i]
      ? { ...entry, hex: overrides[i], ...hexToRgb(overrides[i]) }
      : entry
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShopProductPage() {
  const params   = useParams()
  const router   = useRouter()
  const slug     = typeof params.slug === 'string' ? params.slug : ''
  const { dispatch } = usePattern()

  const [template,        setTemplate]        = useState<ShopTemplate | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ShopVariant | null>(null)
  const [personalization, setPersonalization] = useState<PersonalizationSettings>(DEFAULT_PERSONALIZATION)
  const [paletteOverrides, setPaletteOverrides] = useState<Record<number, string>>({})
  const [activeSwatch,    setActiveSwatch]    = useState<number | null>(null)
  const [busy,            setBusy]            = useState(false)
  const [err,             setErr]             = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const t = getTemplateBySlug(slug)
    if (!t) { router.replace('/shop'); return }
    setTemplate(t)
    const sorted = [...t.variants].sort((a, b) => a.price - b.price)
    setSelectedVariant(sorted[0] ?? null)
  }, [slug, router])

  // Reset colour overrides when variant changes
  useEffect(() => {
    setPaletteOverrides({})
    setActiveSwatch(null)
  }, [selectedVariant?.id])

  // Auto-set recommended font when variant changes
  useEffect(() => {
    if (!selectedVariant) return
    setPersonalization(prev => ({
      ...prev,
      fontStyle: recommendedFont(selectedVariant.width),
    }))
  }, [selectedVariant])

  // Pattern with personalization + colour overrides applied
  const previewPattern = useMemo(() => {
    if (!selectedVariant) return null
    const base = applyPersonalizationToPattern(selectedVariant.patternData, personalization)
    return {
      ...base,
      palette: applyPaletteOverrides(base.palette, paletteOverrides),
    }
  }, [selectedVariant, personalization, paletteOverrides])

  // Draw canvas preview
  useEffect(() => {
    if (!previewPattern || !canvasRef.current) return
    const cellSize = Math.max(2, Math.floor(280 / previewPattern.meta.width))
    drawPatternToCanvas(canvasRef.current, previewPattern, { cellSize, gap: 0, showSymbols: false })
  }, [previewPattern])

  const charLimit = useMemo(() =>
    selectedVariant ? getPersonalizationCharLimit(selectedVariant.width, personalization.fontStyle) : 20,
    [selectedVariant, personalization.fontStyle]
  )

  function updatePersonalization(patch: Partial<PersonalizationSettings>) {
    setPersonalization(prev => ({ ...prev, ...patch }))
  }

  function setSwatchColor(index: number, hex: string) {
    setPaletteOverrides(prev => ({ ...prev, [index]: hex }))
  }

  function resetColors() {
    setPaletteOverrides({})
    setActiveSwatch(null)
  }

  async function handleBuy() {
    if (!selectedVariant || !previewPattern) return
    setBusy(true)
    setErr(null)

    if (isUnlocked()) {
      dispatch({ type: 'SET_PATTERN_DATA', payload: previewPattern })
      router.push('/export')
      return
    }

    try {
      dispatch({ type: 'SET_PATTERN_DATA', payload: previewPattern })
      const res  = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ returnUrl: '/export', tier: 'photo' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setErr(data.error ?? 'Could not start checkout.')
        setBusy(false)
      }
    } catch {
      setErr('Network error — please try again.')
      setBusy(false)
    }
  }

  if (!template || !selectedVariant) {
    return (
      <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #E4D9C8', borderTopColor: '#C4614A', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </main>
    )
  }

  const variantsSorted    = [...template.variants].sort((a, b) => a.price - b.price)
  const hasPersonalization = template.allowPersonalization
  const nameAdded         = personalization.enabled && (personalization.titleText.trim() || personalization.dateText.trim())
  const addedRows         = previewPattern && selectedVariant
    ? previewPattern.meta.height - selectedVariant.patternData.meta.height
    : 0
  const hasOverrides      = Object.keys(paletteOverrides).length > 0
  const currentPalette    = previewPattern?.palette ?? selectedVariant.patternData.palette

  return (
    <main style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 200px' }}>

        {/* Title */}
        <div style={{ width: '100%', maxWidth: 420, marginBottom: 18 }}>
          <button onClick={() => router.push('/shop')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', cursor: 'pointer', padding: 0, marginBottom: 10 }}>
            ← Back to shop
          </button>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#2C2218', marginBottom: 6 }}>
            {template.title}
          </h1>
          {template.description && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744', lineHeight: 1.65 }}>
              {template.description}
            </p>
          )}
          {template.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {template.tags.map(tag => (
                <span key={tag} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C4614A', background: 'rgba(196,97,74,0.08)', borderRadius: 8, padding: '2px 8px' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pattern preview canvas */}
        <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, border: '1.5px solid #EDE4D8', padding: '14px', marginBottom: 16, overflow: 'hidden' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Pattern preview{nameAdded ? ' — with name panel' : ''}{hasOverrides ? ' — custom colours' : ''}
          </p>
          <div style={{ overflowX: 'auto', borderRadius: 10, background: '#FAF6EF', padding: 8 }}>
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', imageRendering: 'pixelated' }} />
          </div>
          {previewPattern && (
            <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                {selectedVariant.patternData.meta.width}×{selectedVariant.patternData.meta.height}
                {addedRows > 0 && (
                  <> → <strong style={{ color: '#C4614A' }}>{previewPattern.meta.width}×{previewPattern.meta.height}</strong> <span style={{ color: '#C4614A' }}>(+{addedRows} rows)</span></>
                )}
              </span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                {previewPattern.meta.colorCount} colours
              </span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                {selectedVariant.stitchStyle}
              </span>
            </div>
          )}
        </div>

        {/* Size selector */}
        <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, border: '1.5px solid #EDE4D8', padding: '16px', marginBottom: 14 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Choose your size
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {variantsSorted.map(v => {
              const isSelected = selectedVariant.id === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${isSelected ? '#C4614A' : '#EDE4D8'}`,
                    background: isSelected ? 'rgba(196,97,74,0.06)' : 'white',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: isSelected ? '#C4614A' : '#2C2218', marginBottom: 2 }}>
                      {v.label || `${v.width}×${v.height}`}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                      {v.width}×{v.height} · {v.stitchStyle} · {(v.width * v.height).toLocaleString()} stitches
                    </p>
                  </div>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: isSelected ? '#C4614A' : '#6B5744' }}>
                    ${(v.price / 100).toFixed(2)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Colour customiser ─────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, border: '1.5px solid #EDE4D8', padding: '16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                🎨 Customise Colours
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 2 }}>
                Tap any swatch to swap it to your team colours
              </p>
            </div>
            {hasOverrides && (
              <button
                onClick={resetColors}
                style={{ background: 'none', border: '1.5px solid #EDE4D8', borderRadius: 8, padding: '5px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', cursor: 'pointer' }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Palette swatches */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: activeSwatch !== null ? 16 : 0 }}>
            {currentPalette.map((entry, i) => {
              const isActive   = activeSwatch === i
              const overridden = !!paletteOverrides[i]
              return (
                <button
                  key={i}
                  onClick={() => setActiveSwatch(isActive ? null : i)}
                  title={entry.label ?? entry.hex}
                  style={{
                    width: 44, height: 44,
                    borderRadius: '50%',
                    background: entry.hex,
                    border: isActive
                      ? '3px solid #C4614A'
                      : overridden
                        ? '3px solid #7C5CBF'
                        : '2px solid #EDE4D8',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 0 3px rgba(196,97,74,0.20)' : 'none',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'transform 0.1s',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  {overridden && !isActive && (
                    <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: 10, lineHeight: 1 }}>✏️</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Colour picker panel — shown when a swatch is active */}
          {activeSwatch !== null && (
            <div style={{ background: '#FAF6EF', borderRadius: 14, padding: '14px', border: '1px solid #EDE4D8' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Team colour presets
              </p>

              {/* Preset grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                {PRESET_COLORS.map(hex => {
                  const isSelected = (paletteOverrides[activeSwatch] ?? currentPalette[activeSwatch]?.hex) === hex
                  return (
                    <button
                      key={hex}
                      onClick={() => setSwatchColor(activeSwatch, hex)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: hex,
                        border: isSelected ? '3px solid #C4614A' : '1.5px solid rgba(0,0,0,0.12)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                        transition: 'transform 0.1s',
                      }}
                    />
                  )
                })}
              </div>

              {/* Custom colour input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', flexShrink: 0 }}>
                  Custom:
                </label>
                <input
                  type="color"
                  value={paletteOverrides[activeSwatch] ?? currentPalette[activeSwatch]?.hex ?? '#000000'}
                  onChange={e => setSwatchColor(activeSwatch, e.target.value)}
                  style={{ width: 44, height: 36, borderRadius: 8, border: '1.5px solid #E4D9C8', cursor: 'pointer', padding: 2, background: 'white' }}
                />
                <button
                  onClick={() => setActiveSwatch(null)}
                  style={{ marginLeft: 'auto', background: '#C4614A', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Done ✓
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Personalization */}
        {hasPersonalization && (
          <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, border: '1.5px solid #EDE4D8', padding: '16px', marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: personalization.enabled ? 14 : 0 }}>
              <input
                type="checkbox"
                checked={personalization.enabled}
                onChange={e => updatePersonalization({ enabled: e.target.checked })}
              />
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#2C2218' }}>
                  ✏️ Add a name or date
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                  Stitched pixel letters added as a clean panel — image untouched
                </p>
              </div>
            </label>

            {personalization.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Font style */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {(['block', 'slim', 'bold'] as const).map(style => (
                    <button
                      key={style}
                      onClick={() => updatePersonalization({ fontStyle: style })}
                      style={{
                        padding: '8px 6px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${personalization.fontStyle === style ? '#C4614A' : '#E4D9C8'}`,
                        background: personalization.fontStyle === style ? 'rgba(196,97,74,0.06)' : 'white',
                        fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                        color: personalization.fontStyle === style ? '#C4614A' : '#6B5744',
                        fontWeight: personalization.fontStyle === style ? 700 : 400,
                      }}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Name input */}
                <div>
                  <input
                    value={personalization.titleText}
                    onChange={e => updatePersonalization({ titleText: e.target.value.slice(0, charLimit).toUpperCase() })}
                    placeholder="Name or title (e.g. MICHAEL)"
                    maxLength={charLimit}
                    style={{
                      width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218',
                      background: '#FAF6EF', border: '1.5px solid #E4D9C8',
                      borderRadius: 10, outline: 'none',
                    }}
                  />
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C8BFB0', marginTop: 3 }}>
                    {personalization.titleText.length}/{charLimit} characters
                  </p>
                </div>

                {/* Date input */}
                <input
                  value={personalization.dateText}
                  onChange={e => updatePersonalization({ dateText: e.target.value.slice(0, charLimit).toUpperCase() })}
                  placeholder="Date or dedication (optional)"
                  maxLength={charLimit}
                  style={{
                    width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218',
                    background: '#FAF6EF', border: '1.5px solid #E4D9C8',
                    borderRadius: 10, outline: 'none',
                  }}
                />

                {/* Placement */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {(['below', 'above'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => updatePersonalization({ placement: p })}
                      style={{
                        padding: '8px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${personalization.placement === p ? '#C4614A' : '#E4D9C8'}`,
                        background: personalization.placement === p ? 'rgba(196,97,74,0.06)' : 'white',
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                        color: personalization.placement === p ? '#C4614A' : '#6B5744',
                        fontWeight: personalization.placement === p ? 600 : 400,
                      }}
                    >
                      {p === 'below' ? 'Name below ↓' : 'Name above ↑'}
                    </button>
                  ))}
                </div>

                {nameAdded && addedRows > 0 && (
                  <div style={{ background: 'rgba(196,97,74,0.06)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>📐</span>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744' }}>
                      Pattern grows to <strong>{previewPattern?.meta.width}×{previewPattern?.meta.height}</strong> — {addedRows} rows added for the name panel. Image is untouched.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* What's included */}
        <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, border: '1.5px solid #EDE4D8', padding: '16px', marginBottom: 14 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            What&apos;s included
          </p>
          {[
            { emoji: '📄', text: 'Full printable PDF — chart, colour key, row-by-row instructions' },
            { emoji: '🖼️', text: 'Pattern image (PNG) — zoom in and stitch from your phone' },
            { emoji: '💾', text: 'Instant download — no account required' },
            { emoji: '📋', text: 'Progress tracker — mark rows done as you go' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', lineHeight: 1.5 }}>{item.text}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Sticky buy bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        padding: '14px 20px max(20px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, #FAF6EF 75%, transparent)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#2C2218' }}>
            ${(selectedVariant.price / 100).toFixed(2)}
          </span>
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#C4614A', lineHeight: 1 }}>
              {selectedVariant.label || `${selectedVariant.width}×${selectedVariant.height}`}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 2 }}>
              {hasOverrides && nameAdded ? '+ custom colours & name' : hasOverrides ? '+ custom colours' : nameAdded ? '+ personalised name' : ''}
            </p>
          </div>
        </div>

        <button
          onClick={handleBuy}
          disabled={busy}
          style={{
            width: '100%', padding: '17px 24px',
            background: busy ? '#E4D9C8' : '#C4614A',
            color: busy ? '#B8AAA0' : 'white',
            border: 'none', borderRadius: 16,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: busy ? 'none' : '0 4px 20px rgba(196,97,74,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          {busy ? (
            <>
              <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              Redirecting to payment…
            </>
          ) : (
            `🔓 Buy & Download — $${(selectedVariant.price / 100).toFixed(2)}`
          )}
        </button>

        {err && <p style={{ textAlign: 'center', marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C4614A' }}>{err}</p>}

        <p style={{ textAlign: 'center', marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#B8AAA0' }}>
          Secure payment via Stripe · instant download · enter promo codes at checkout
        </p>

        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </main>
  )
}
