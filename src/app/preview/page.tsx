'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import Header             from '@/components/layout/Header'
import StepIndicator      from '@/components/ui/StepIndicator'
import LoadingSpinner     from '@/components/ui/LoadingSpinner'
import PatternCanvas      from '@/components/preview/PatternCanvas'
import ColorLegend        from '@/components/preview/ColorLegend'
import PatternMetadata    from '@/components/preview/PatternMetadata'
import OriginalImageThumb from '@/components/preview/OriginalImageThumb'
import RowInstructions    from '@/components/preview/RowInstructions'
import { usePattern }     from '@/context/PatternContext'
import { ColorEntry }     from '@/types/pattern'
import {
  applyPersonalizationToPattern,
  getPersonalizationCharLimit,
} from '@/modules/personalization/personalizePattern'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

export default function PreviewPage() {
  const router            = useRouter()
  const { state, dispatch } = usePattern()
  const { patternData, rawImage, isGenerating } = state

  // Custom palette overrides — user can swap any color
  const [colorOverrides, setColorOverrides] = useState<Record<number, string>>({})

  // Merge overrides into the base palette
  const activePalette = useMemo((): ColorEntry[] => {
    if (!patternData) return []
    return patternData.palette.map((entry, i) => {
      if (!colorOverrides[i]) return entry
      const hex = colorOverrides[i]
      const { r, g, b } = hexToRgb(hex)
      return { ...entry, hex, r, g, b }
    })
  }, [patternData, colorOverrides])

  // Build an active pattern with swapped colors for canvas + instructions
  const activePattern = useMemo(() => {
    if (!patternData) return null
    return { ...patternData, palette: activePalette }
  }, [patternData, activePalette])

  const personalizedPattern = useMemo(() => {
    if (!activePattern) return null
    return applyPersonalizationToPattern(activePattern, state.personalization)
  }, [activePattern, state.personalization])

  const textCharLimit = useMemo(() => {
    if (!patternData) return 24
    return getPersonalizationCharLimit(patternData.meta.width, state.personalization.fontStyle)
  }, [patternData, state.personalization.fontStyle])

  useEffect(() => {
    const nextTitle = state.personalization.titleText.slice(0, textCharLimit)
    const nextDate = state.personalization.dateText.slice(0, textCharLimit)
    if (nextTitle !== state.personalization.titleText || nextDate !== state.personalization.dateText) {
      dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { titleText: nextTitle, dateText: nextDate } })
    }
  }, [dispatch, state.personalization.titleText, state.personalization.dateText, textCharLimit])

  function handleColorChange(paletteIndex: number, newHex: string) {
    setColorOverrides(prev => ({ ...prev, [paletteIndex]: newHex }))
  }

  // Cell-level overrides — user can tap individual grid cells to recolor
  const [cellOverrides, setCellOverrides] = useState<Map<string, number>>(new Map())
  const [cellPopover, setCellPopover] = useState<{
    row: number; col: number; x: number; y: number
  } | null>(null)

  function handleCellTap(row: number, col: number, screenX: number, screenY: number) {
    setCellPopover({ row, col, x: screenX, y: screenY })
  }

  function handleCellColorPick(colorIndex: number) {
    if (!cellPopover) return
    const key = `${cellPopover.row},${cellPopover.col}`
    setCellOverrides(prev => {
      const next = new Map(prev)
      next.set(key, colorIndex)
      return next
    })
    setCellPopover(null)
  }

  function handleClearOverrides() {
    setCellOverrides(new Map())
    setColorOverrides({})
  }

  if (isGenerating) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
        <Header />
        <StepIndicator />
        <LoadingSpinner message="Counting your stitches…" />
      </main>
    )
  }

  if (!patternData) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧶</div>
            <p style={{ fontSize: 14, color: '#6B5744', marginBottom: 20, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
              No pattern yet — choose your settings to generate one.
            </p>
            <button
              onClick={() => router.push('/settings')}
              style={{
                background: '#C4614A', color: 'white', border: 'none',
                borderRadius: 14, padding: '14px 28px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(196,97,74,0.28)',
              }}
            >
              Go to Settings
            </button>
          </div>
        </div>
      </main>
    )
  }

  const imageToShow = rawImage

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF6EF' }}>
      <Header />
      <StepIndicator />

      <section style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        gap: 14,
        padding: '8px 18px 220px',
        overflowY: 'auto',
      }}>

        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24, fontWeight: 700,
            color: '#2C2218', lineHeight: 1.25, marginBottom: 4,
          }}>
            Your pattern is ready!
          </h1>
          <p style={{ fontSize: 13, color: '#6B5744', fontFamily: "'DM Sans', sans-serif" }}>
            {patternData.meta.width}×{patternData.meta.height} grid · {patternData.palette.length} colours
          </p>
          {(patternData.meta.noiseCleaned ?? 0) > 0 && (
            <p style={{ fontSize: 12, color: '#4A9050', fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
              ✓ Background noise cleaned up automatically
            </p>
          )}
        </div>

        <OriginalImageThumb originalSrc={imageToShow} pattern={activePattern!} />

        <div>
          <p style={{
            fontSize: 11, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#6B5744', fontFamily: "'DM Sans', sans-serif",
            marginBottom: 8,
          }}>
            Pattern Grid
          </p>
          <PatternCanvas
            pattern={personalizedPattern!}
            cellSize={14}
            cellOverrides={cellOverrides}
            paletteOverrides={personalizedPattern!.palette}
            onCellTap={handleCellTap}
          />

          {/* Cell color picker popover */}
          {cellPopover && (
            <div
              style={{
                position:     'fixed',
                left:         Math.min(cellPopover.x, window.innerWidth - 180),
                top:          cellPopover.y + 12,
                zIndex:       100,
                background:   'white',
                borderRadius: 14,
                boxShadow:    '0 8px 32px rgba(44,34,24,0.18)',
                padding:      '10px',
                display:      'flex',
                flexWrap:     'wrap',
                gap:          8,
                maxWidth:     180,
              }}
            >
              <div style={{ width: '100%', fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', marginBottom: 2 }}>
                Pick colour for cell
              </div>
              {personalizedPattern!.palette.filter(e => (e.stitchCount ?? 0) > 0).map((entry, i) => {
                const realIdx = personalizedPattern!.palette.indexOf(entry)
                return (
                  <button
                    key={realIdx}
                    onClick={() => handleCellColorPick(realIdx)}
                    title={entry.label ?? `Colour ${realIdx + 1}`}
                    style={{
                      width:        32,
                      height:       32,
                      borderRadius: 8,
                      background:   entry.hex,
                      border:       '2px solid rgba(0,0,0,0.1)',
                      cursor:       'pointer',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      fontSize:     12,
                      color:        'rgba(255,255,255,0.9)',
                    }}
                  >
                    {entry.symbol}
                  </button>
                )
              })}
              <button
                onClick={() => setCellPopover(null)}
                style={{
                  width: '100%', padding: '4px',
                  background: 'none', border: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11, color: '#C8BFB0',
                  cursor: 'pointer', marginTop: 2,
                }}
              >
                Cancel
              </button>
              {cellOverrides.size > 0 && (
                <button
                  onClick={() => { handleClearOverrides(); setCellPopover(null) }}
                  style={{
                    width: '100%', padding: '4px',
                    background: 'none', border: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11, color: '#C4614A',
                    cursor: 'pointer',
                  }}
                >
                  Clear all cell edits ({cellOverrides.size})
                </button>
              )}
            </div>
          )}

          {/* Tap outside popover to dismiss */}
          {cellPopover && (
            <div
              onClick={() => setCellPopover(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            />
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 4px rgba(44,34,24,0.06)', padding: '14px 16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={state.personalization.enabled}
              onChange={(e) => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { enabled: e.target.checked } })}
            />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2218' }}>
              Add name or date to pattern
            </span>
          </label>

          {state.personalization.enabled && (
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              <input
                value={state.personalization.titleText}
                onChange={(e) => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { titleText: e.target.value.slice(0, textCharLimit) } })}
                maxLength={textCharLimit}
                placeholder="Name / Title (optional)"
                style={{ width: '100%', border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
              />
              <p style={{ marginTop: -4, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                Name/Title max for this grid: {textCharLimit} characters
              </p>
              <input
                value={state.personalization.dateText}
                onChange={(e) => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { dateText: e.target.value.slice(0, textCharLimit) } })}
                maxLength={textCharLimit}
                placeholder="Date / Birthday (optional)"
                style={{ width: '100%', border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
              />
              <p style={{ marginTop: -4, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                Date/Birthday max for this grid: {textCharLimit} characters
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select
                  value={state.personalization.fontStyle}
                  onChange={(e) => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { fontStyle: e.target.value as typeof state.personalization.fontStyle } })}
                  style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}
                >
                  <option value="pressStart2P" style={{ fontFamily: "'Press Start 2P', cursive" }}>Press Start 2P</option>
                  <option value="vt323" style={{ fontFamily: "'VT323', monospace" }}>VT323</option>
                  <option value="silkscreen" style={{ fontFamily: "'Silkscreen', sans-serif" }}>Silkscreen</option>
                  <option value="audiowide" style={{ fontFamily: "'Audiowide', cursive" }}>Audiowide</option>
                </select>
                <select
                  value={state.personalization.placement}
                  onChange={(e) => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { placement: e.target.value as 'above' | 'below' } })}
                  style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}
                >
                  <option value="below">Place below grid</option>
                  <option value="above">Place above grid</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <select
                  value={`${state.personalization.colorMode}:${state.personalization.paletteColorIndex}`}
                  onChange={(e) => {
                    const [mode, idx] = e.target.value.split(':')
                    dispatch({
                      type: 'UPDATE_PERSONALIZATION',
                      payload: { colorMode: mode as 'palette' | 'custom', paletteColorIndex: Number(idx) || 0 },
                    })
                  }}
                  style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}
                >
                  {activePalette.map((p, idx) => (
                    <option key={idx} value={`palette:${idx}`}>Palette {idx + 1} ({p.hex})</option>
                  ))}
                  <option value={`custom:${state.personalization.paletteColorIndex}`}>Custom colour…</option>
                </select>
                <input
                  type="color"
                  value={state.personalization.customColor}
                  onChange={(e) => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { customColor: e.target.value, colorMode: 'custom' } })}
                  style={{ width: 44, height: 40, border: '1.5px solid #E4D9C8', borderRadius: 10, padding: 2 }}
                />
              </div>
            </div>
          )}
        </div>

        <ColorLegend
          palette={personalizedPattern!.palette}
          totalStitches={personalizedPattern!.meta.totalStitches}
          onColorChange={handleColorChange}
          hasOverrides={Object.keys(colorOverrides).length > 0}
          onResetColors={handleClearOverrides}
        />

        <RowInstructions pattern={personalizedPattern!} />

        <PatternMetadata meta={personalizedPattern!.meta} />

        <div style={{
          background: 'rgba(122,158,126,0.1)',
          borderRadius: 16, padding: '14px 16px',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
          <p style={{ fontSize: 13, color: '#6B5744', lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
            Work from the <strong>bottom-left corner</strong>, one row at a time.
            Each symbol = one stitch in that colour.
          </p>
        </div>

      </section>

      {/* Fixed bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        padding: '12px 18px max(18px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, #FAF6EF 85%, transparent)',
        zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
      }}>
        <button
          style={{
            padding: '9px 20px', background: 'white', color: '#6B5744',
            border: '1.5px solid #E4D9C8', borderRadius: 20,
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          + Add a Name or Date
        </button>
        <button
          onClick={() => router.push('/export')}
          style={{
            width: '100%', padding: '17px 24px',
            background: '#C4614A', color: 'white',
            border: 'none', borderRadius: 16,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(196,97,74,0.28)',
          }}
        >
          Get Full Pattern Instructions →
        </button>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', textAlign: 'center', margin: 0 }}>
          Row-by-row steps · Printable PDF · Track your progress
        </p>
        <button
          onClick={() => router.push('/export')}
          style={{
            background: 'none', border: 'none', padding: '2px 8px',
            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
            color: '#B8AAA0', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Download Preview (low detail)
        </button>
      </div>
    </main>
  )
}
