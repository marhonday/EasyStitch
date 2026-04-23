'use client'

export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useRowProgress } from '@/hooks/useRowProgress'
import Header             from '@/components/layout/Header'
import StepIndicator      from '@/components/ui/StepIndicator'
import LoadingSpinner     from '@/components/ui/LoadingSpinner'
import PatternCanvas      from '@/components/preview/PatternCanvas'
import ColorLegend        from '@/components/preview/ColorLegend'
import PatternMetadata    from '@/components/preview/PatternMetadata'
import OriginalImageThumb from '@/components/preview/OriginalImageThumb'
import RowInstructions    from '@/components/preview/RowInstructions'
import { usePattern }     from '@/context/PatternContext'
import { isUnlocked } from '@/lib/unlock'
import { drawPatternToCanvas } from '@/modules/preview-rendering/canvasRenderer'
import { ColorEntry }     from '@/types/pattern'
import { createTemplate, addVariant, getAllTemplates, exportLibraryJson } from '@/lib/shopStore'
import {
  applyPersonalizationToPattern,
  getPersonalizationCharLimit,
  getFontMeta,
  recommendedFont,
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

  const pngCanvasRef        = useRef<HTMLCanvasElement>(null)
  const personPreviewRef    = useRef<HTMLCanvasElement>(null)

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

  // ── Row progress tracking (auto-persisted to localStorage) ──────────
  // Key is stable for the same generated pattern so progress survives
  // a browser close/reopen on the same device.
  const patternKey = useMemo(() => {
    if (!patternData) return ''
    const { stitchStyle, width, height, colorCount, generatedAt } = patternData.meta
    return `${stitchStyle}_${width}x${height}_c${colorCount}_${generatedAt}`
  }, [patternData])

  const {
    completedRows,
    toggleRow:     handleToggleRow,
    resetProgress: handleResetProgress,
  } = useRowProgress(patternKey)

  // Human-readable label used in the email session-save
  const patternLabel = useMemo(() => {
    if (!patternData) return ''
    const { stitchStyle, width, height } = patternData.meta
    const styleLabel = stitchStyle
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim()
    return `${width}×${height} ${styleLabel}`
  }, [patternData])

  const totalRows = personalizedPattern?.meta.height ?? 0

  const currentRowNumber = useMemo(() => {
    for (let i = 1; i <= totalRows; i++) {
      if (!completedRows.has(i)) return i
    }
    return totalRows + 1  // all done
  }, [completedRows, totalRows])

  // Map instruction row number → canvas grid row index (0 = top of canvas)
  // Instruction Row 1 = bottom of grid = grid[totalRows - 1]
  const highlightGridRow = useMemo(() => {
    if (totalRows === 0 || currentRowNumber > totalRows) return undefined
    return totalRows - currentRowNumber
  }, [totalRows, currentRowNumber])

  function handleInlineDownloadPng() {
    if (!personalizedPattern || !pngCanvasRef.current) return
    drawPatternToCanvas(pngCanvasRef.current, personalizedPattern, { cellSize: 20, gap: 1, showSymbols: true })
    const dataUrl = pngCanvasRef.current.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = 'easystitch-pattern.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const textCharLimit = useMemo(() => {
    if (!patternData) return 24
    return getPersonalizationCharLimit(patternData.meta.width, state.personalization.fontStyle)
  }, [patternData, state.personalization.fontStyle])

  // ── Live personalization preview ─────────────────────────────────────
  useEffect(() => {
    if (!personPreviewRef.current || !personalizedPattern || !state.personalization.enabled) return
    const { titleText, dateText, placement } = state.personalization
    if (!titleText.trim() && !dateText.trim()) return
    const grid = personalizedPattern.grid
    const totalH = grid.length
    // Show ~9 rows from the text edge so the stitched letters are visible
    const previewRows = Math.min(9, Math.floor(totalH * 0.35))
    const slice = placement === 'above'
      ? grid.slice(0, previewRows)
      : grid.slice(totalH - previewRows)
    const miniPattern = { ...personalizedPattern, grid: slice, meta: { ...personalizedPattern.meta, height: slice.length } }
    drawPatternToCanvas(personPreviewRef.current, miniPattern, { cellSize: 10, gap: 0, showSymbols: false })
  }, [personalizedPattern, state.personalization, personPreviewRef])

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

  // ── Admin: Save to Shop ───────────────────────────────────────────────
  const [isAdmin,        setIsAdmin]        = useState(false)
  const [showShopModal,  setShowShopModal]  = useState(false)
  const [shopTitle,      setShopTitle]      = useState('')
  const [shopCategory,   setShopCategory]   = useState('sports')
  const [shopDesc,       setShopDesc]       = useState('')
  const [shopTags,       setShopTags]       = useState('')
  const [shopAddToId,    setShopAddToId]    = useState('__new__')
  const [shopSizeLabel,  setShopSizeLabel]  = useState('')
  const [shopPrice,      setShopPrice]      = useState('2.00')
  const [shopSaved,      setShopSaved]      = useState(false)
  const thumbCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fromUrl = new URLSearchParams(window.location.search).get('admin') === '1'
      if (fromUrl) sessionStorage.setItem('cw_admin', '1')
      setIsAdmin(fromUrl || sessionStorage.getItem('cw_admin') === '1')
    }
  }, [])

  // Grid line colour for the preview canvas
  const [gridLineColor, setGridLineColor] = useState<string>('#FFFFFF')

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
      <canvas ref={pngCanvasRef} style={{ display: 'none' }} aria-hidden />

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{
              fontSize: 11, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#6B5744', fontFamily: "'DM Sans', sans-serif",
              margin: 0,
            }}>
              Pattern Grid
            </p>
            {/* Grid line colour picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878' }}>Grid lines:</span>
              {[
                { color: '#FFFFFF', label: 'None' },
                { color: '#D4CCC4', label: 'Light' },
                { color: '#8C7B6E', label: 'Medium' },
                { color: '#2C2218', label: 'Dark' },
              ].map(({ color, label }) => (
                <button
                  key={color}
                  title={label}
                  onClick={() => setGridLineColor(color)}
                  style={{
                    width: 18, height: 18, borderRadius: 5,
                    background: color,
                    border: gridLineColor === color
                      ? '2px solid #C4614A'
                      : '1.5px solid #D4CCC4',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                    boxShadow: gridLineColor === color ? '0 0 0 2px rgba(196,97,74,0.2)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
          <PatternCanvas
            pattern={personalizedPattern!}
            cellSize={14}
            cellOverrides={cellOverrides}
            paletteOverrides={personalizedPattern!.palette}
            onCellTap={handleCellTap}
            highlightRow={highlightGridRow}
            gapColor={gridLineColor}
          />

          {/* Grid-line disclaimer */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 7,
            background: 'rgba(196,97,74,0.07)',
            border: '1px solid rgba(196,97,74,0.18)',
            borderRadius: 10, padding: '8px 12px',
            marginTop: 6,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, color: '#7A4A38', lineHeight: 1.5,
            }}>
              <strong>The grid lines are counting guides only</strong> — your finished piece will have no gaps or spaces between stitches. If the background is white or cream, those areas are simply unstitched fabric.
            </p>
          </div>

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

        <ColorLegend
          palette={personalizedPattern!.palette}
          totalStitches={personalizedPattern!.meta.totalStitches}
          onColorChange={handleColorChange}
          hasOverrides={Object.keys(colorOverrides).length > 0}
          onResetColors={handleClearOverrides}
        />

        <RowInstructions
          pattern={personalizedPattern!}
          completedRows={completedRows}
          onToggleRow={handleToggleRow}
          onResetProgress={handleResetProgress}
          currentRowNumber={currentRowNumber}
          patternLabel={patternLabel}
        />

        <PatternMetadata meta={personalizedPattern!.meta} />

        {/* ── Add Name / Date — final finishing touch ──────────────────── */}
        <div
          id="personalization-section"
          style={{ background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(44,34,24,0.07)', padding: '16px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#2C2218' }}>
              ✏️ Add a Name or Date
            </p>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C4614A', background: 'rgba(196,97,74,0.08)', borderRadius: 6, padding: '2px 7px' }}>
              Last step
            </span>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6B5744', marginBottom: 12, lineHeight: 1.5 }}>
            Stitch a name, date or dedication directly into the pattern border.
          </p>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: state.personalization.enabled ? 14 : 0 }}>
            <input
              type="checkbox"
              checked={state.personalization.enabled}
              onChange={(e) => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { enabled: e.target.checked } })}
            />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#2C2218' }}>
              Enable personalisation
            </span>
          </label>

          {state.personalization.enabled && (
            <div style={{ display: 'grid', gap: 12 }}>

              {/* Font style picker */}
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#6B5744', marginBottom: 8 }}>
                  Font style
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {(['block', 'bold', 'slim'] as const).map((style) => {
                    const meta    = getFontMeta(style)
                    const recFont = recommendedFont(patternData!.meta.width)
                    const isActive = state.personalization.fontStyle === style
                    const isRec    = recFont === style
                    return (
                      <button
                        key={style}
                        onClick={() => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { fontStyle: style } })}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '10px 6px', borderRadius: 14, cursor: 'pointer',
                          border: `2px solid ${isActive ? '#C4614A' : '#E4D9C8'}`,
                          background: isActive ? 'rgba(196,97,74,0.06)' : 'white',
                          position: 'relative',
                        }}
                      >
                        {isRec && (
                          <span style={{
                            position: 'absolute', top: -8, right: -4,
                            fontFamily: "'DM Sans', sans-serif", fontSize: 9,
                            background: '#C4614A', color: 'white',
                            borderRadius: 6, padding: '1px 5px',
                          }}>
                            Best fit
                          </span>
                        )}
                        <span style={{
                          fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13,
                          color: isActive ? '#C4614A' : '#2C2218',
                          letterSpacing: style === 'slim' ? '-0.5px' : style === 'bold' ? '1px' : '0px',
                          fontStretch: style === 'slim' ? 'condensed' : 'normal',
                        }}>
                          {meta.label}
                        </span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#9A8878', textAlign: 'center', lineHeight: 1.3 }}>
                          {meta.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Text inputs */}
              <div>
                <input
                  value={state.personalization.titleText}
                  onChange={(e) => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { titleText: e.target.value.slice(0, textCharLimit) } })}
                  maxLength={textCharLimit}
                  placeholder="Name or title (optional)"
                  style={{ width: '100%', border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, boxSizing: 'border-box' }}
                />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#C8BFB0', marginTop: 3 }}>
                  Max {textCharLimit} characters at this grid size &amp; font
                </p>
              </div>
              <div>
                <input
                  value={state.personalization.dateText}
                  onChange={(e) => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { dateText: e.target.value.slice(0, textCharLimit) } })}
                  maxLength={textCharLimit}
                  placeholder="Date or dedication (optional)"
                  style={{ width: '100%', border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              {/* Live preview + size disclosure */}
              {(state.personalization.titleText.trim() || state.personalization.dateText.trim()) && (
                <div style={{ background: '#FAF6EF', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: '#9A8878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Preview
                  </p>
                  <canvas
                    ref={personPreviewRef}
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 6, imageRendering: 'pixelated' }}
                  />
                  {/* Size change disclosure */}
                  {patternData && personalizedPattern && personalizedPattern.meta.height > patternData.meta.height && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                        {patternData.meta.width}×{patternData.meta.height}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C8BFB0' }}>→</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4614A' }}>
                        {personalizedPattern.meta.width}×{personalizedPattern.meta.height}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#9A8878', background: 'rgba(196,97,74,0.08)', borderRadius: 6, padding: '1px 6px' }}>
                        +{personalizedPattern.meta.height - patternData.meta.height} rows for name panel
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Placement */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['below', 'above'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { placement: p } })}
                    style={{
                      padding: '9px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${state.personalization.placement === p ? '#C4614A' : '#E4D9C8'}`,
                      background: state.personalization.placement === p ? 'rgba(196,97,74,0.06)' : 'white',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                      color: state.personalization.placement === p ? '#C4614A' : '#6B5744',
                      fontWeight: state.personalization.placement === p ? 600 : 400,
                    }}
                  >
                    {p === 'below' ? 'Place below ↓' : 'Place above ↑'}
                  </button>
                ))}
              </div>

              {/* Colour */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                <select
                  value={`${state.personalization.colorMode}:${state.personalization.paletteColorIndex}`}
                  onChange={(e) => {
                    const [mode, idx] = e.target.value.split(':')
                    dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { colorMode: mode as 'palette' | 'custom', paletteColorIndex: Number(idx) || 0 } })
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
                  style={{ width: 44, height: 44, border: '1.5px solid #E4D9C8', borderRadius: 10, padding: 2, cursor: 'pointer' }}
                />
              </div>

            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(122,158,126,0.1)',
          borderRadius: 16, padding: '14px 16px',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
          <p style={{ fontSize: 15, color: '#3D2C1E', lineHeight: 1.655, fontFamily: "'DM Sans', sans-serif" }}>
            Work from the <strong>bottom-left corner</strong>, one row at a time.
            Each symbol = one stitch in that colour.
          </p>
        </div>

      </section>

      {/* Hidden thumbnail canvas for admin Save to Shop */}
      <canvas ref={thumbCanvasRef} style={{ display: 'none' }} aria-hidden />

      {/* ── Admin: Save to Shop modal ──────────────────────────────────── */}
      {isAdmin && showShopModal && patternData && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(44,34,24,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowShopModal(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 430,
            background: 'white', borderRadius: '20px 20px 0 0',
            padding: '20px 18px max(24px, env(safe-area-inset-bottom))',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: '#2C2218' }}>🛍 Save to Shop</p>
              <button onClick={() => setShowShopModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9A8878', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {shopSaved ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#4A9050', marginBottom: 8 }}>✓ Saved to shop!</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { setShowShopModal(false); router.push('/shop') }} style={{ padding: '9px 18px', background: '#4A9050', color: 'white', border: 'none', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View shop →</button>
                  <button
                    onClick={() => {
                      const json = exportLibraryJson()
                      const blob = new Blob([json], { type: 'application/json' })
                      const url  = URL.createObjectURL(blob)
                      const a    = document.createElement('a'); a.href = url; a.download = 'shopTemplates.json'
                      document.body.appendChild(a); a.click(); document.body.removeChild(a)
                      setTimeout(() => URL.revokeObjectURL(url), 1000)
                    }}
                    style={{ padding: '9px 18px', background: '#2C2218', color: 'white', border: 'none', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    📥 Export Library JSON
                  </button>
                </div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878', marginTop: 10, lineHeight: 1.5 }}>
                  Replace <code>src/data/shopTemplates.json</code> with the downloaded file, then push to deploy.
                </p>
              </div>
            ) : (
              <>
                {/* Add to existing or new */}
                <select value={shopAddToId} onChange={e => setShopAddToId(e.target.value)} style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218' }}>
                  <option value="__new__">➕ Create new template</option>
                  {getAllTemplates().map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.variants.length} variant{t.variants.length !== 1 ? 's' : ''})</option>
                  ))}
                </select>

                {shopAddToId === '__new__' && (
                  <>
                    <input value={shopTitle} onChange={e => setShopTitle(e.target.value)} placeholder="Pattern title  e.g. Football C2C Blanket" style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2218' }} />
                    <textarea value={shopDesc} onChange={e => setShopDesc(e.target.value)} placeholder="Short description (optional)" rows={2} style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12, resize: 'none' }} />
                    <input value={shopTags} onChange={e => setShopTags(e.target.value)} placeholder="Tags: football, sports, boy" style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }} />
                    <select value={shopCategory} onChange={e => setShopCategory(e.target.value)} style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                      {['sports','animals','holidays','names','baby','nature','other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                    </select>
                  </>
                )}

                <input value={shopSizeLabel} onChange={e => setShopSizeLabel(e.target.value)} placeholder={`Size label  e.g. Throw ${patternData.meta.width}×${patternData.meta.height}`} style={{ border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6B5744' }}>$ Price:</span>
                  <input type="number" min="0.50" step="0.50" value={shopPrice} onChange={e => setShopPrice(e.target.value)} style={{ width: 80, border: '1.5px solid #E4D9C8', borderRadius: 10, padding: '8px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9A8878' }}>
                    {patternData.meta.width}×{patternData.meta.height} · {patternData.meta.stitchStyle}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (!patternData) return
                    // Generate small thumbnail
                    let thumbnail = ''
                    if (thumbCanvasRef.current) {
                      drawPatternToCanvas(thumbCanvasRef.current, patternData, { cellSize: 4, gap: 0, showSymbols: false })
                      thumbnail = thumbCanvasRef.current.toDataURL('image/jpeg', 0.5)
                    }
                    const variant = {
                      label:       shopSizeLabel || `${patternData.meta.width}×${patternData.meta.height}`,
                      width:       patternData.meta.width,
                      height:      patternData.meta.height,
                      stitchStyle: patternData.meta.stitchStyle,
                      price:       Math.round(parseFloat(shopPrice) * 100),
                      patternData,
                    }
                    if (shopAddToId === '__new__') {
                      createTemplate({
                        title:                shopTitle || 'Untitled Pattern',
                        description:          shopDesc,
                        tags:                 shopTags.split(',').map(t => t.trim()).filter(Boolean),
                        category:             shopCategory,
                        thumbnail,
                        allowPersonalization: true,
                        variant,
                      })
                    } else {
                      addVariant(shopAddToId, variant)
                    }
                    setShopSaved(true)
                  }}
                  disabled={shopAddToId === '__new__' && !shopTitle.trim()}
                  style={{
                    width: '100%', padding: '13px',
                    background: (shopAddToId !== '__new__' || shopTitle.trim()) ? '#2C2218' : '#C8BFB0',
                    color: 'white', border: 'none', borderRadius: 12,
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                    cursor: (shopAddToId !== '__new__' || shopTitle.trim()) ? 'pointer' : 'not-allowed',
                  }}
                >
                  Save to Shop Library
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
          onClick={() => {
            dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { enabled: true } })
            setTimeout(() => {
              document.getElementById('personalization-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 50)
          }}
          style={{
            padding: '9px 20px', background: 'white', color: '#6B5744',
            border: '1.5px solid #E4D9C8', borderRadius: 20,
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          + Add a Name or Date
        </button>
        {isAdmin && (
          <button
            onClick={() => { setShopSaved(false); setShopTitle(''); setShowShopModal(true) }}
            style={{
              width: '100%', padding: '12px 24px',
              background: '#2C2218', color: 'white',
              border: 'none', borderRadius: 14,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            🛍 Save to Shop (admin)
          </button>
        )}
        <button
          onClick={() => router.push(isUnlocked() ? '/export' : '/unlock?return=/export')}
          style={{
            width: '100%', padding: '17px 24px',
            background: '#C4614A', color: 'white',
            border: 'none', borderRadius: 16,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(196,97,74,0.28)',
          }}
        >
          {isUnlocked() ? 'Get Full Pattern Instructions →' : '🔓 Unlock Full Pattern — $2 →'}
        </button>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9A8878', textAlign: 'center', margin: 0 }}>
          Row-by-row steps · Printable PDF · Track your progress
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            onClick={() => router.push('/settings')}
            style={{
              background: 'none', border: 'none', padding: '2px 8px',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12,
              color: '#9A8878', cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            ← Adjust settings
          </button>
          <button
            onClick={handleInlineDownloadPng}
            style={{
              background: 'none', border: 'none', padding: '2px 8px',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12,
              color: '#B8AAA0', cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Download Preview (low detail)
          </button>
        </div>
      </div>
    </main>
  )
}
