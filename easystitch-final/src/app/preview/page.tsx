'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
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
  const { state }         = usePattern()
  const { patternData, rawImage, enhancedImage, isGenerating } = state

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
            pattern={patternData}
            cellSize={14}
            cellOverrides={cellOverrides}
            paletteOverrides={activePalette}
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
              {activePalette.filter(e => (e.stitchCount ?? 0) > 0).map((entry, i) => {
                const realIdx = activePalette.indexOf(entry)
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
          palette={activePalette}
          totalStitches={patternData.meta.totalStitches}
          onColorChange={handleColorChange}
          hasOverrides={Object.keys(colorOverrides).length > 0}
          onResetColors={handleClearOverrides}
        />

        <RowInstructions pattern={activePattern!} />

        <PatternMetadata meta={patternData.meta} />

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
        padding: '14px 18px max(18px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, #FAF6EF 85%, transparent)',
        zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
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
          Export Pattern →
        </button>
        <button
          onClick={() => router.push('/settings')}
          style={{
            width: '100%', padding: '12px 16px', background: 'white', color: '#6B5744',
            border: '1.5px solid #E4D9C8', borderRadius: 14,
            fontFamily: "'DM Sans', sans-serif", fontSize: 14,
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          ✏️ Edit settings
        </button>
      </div>
    </main>
  )
}
