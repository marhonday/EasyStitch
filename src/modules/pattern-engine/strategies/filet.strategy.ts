import { PatternData, ColorEntry, StitchStyle } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { COLOR_SYMBOLS } from '@/lib/constants'

/**
 * Filet crochet strategy.
 *
 * Bypasses the standard palette/colorMap from the quantizer entirely.
 * `processImageForFilet` already delivers a clean binary B&W image where
 * dark pixels (luminance < 128) = filled blocks and light pixels = open mesh.
 * After JPEG compression and grid-resize the values aren't exactly 0/255, so
 * we re-threshold the pixelGrid directly — this is more reliable than relying
 * on applyBackgroundPreference (which injects a 3rd "true white" palette entry
 * that the old palette.slice(0,2) approach missed, causing blank-canvas bugs).
 */
class FiletStrategy implements StitchStrategy {
  readonly id: StitchStyle = 'filetCrochet'
  readonly displayName = 'Filet Crochet'
  readonly description = 'Open mesh grid — filled blocks and open spaces'
  readonly traversalOrder = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { pixelGrid } = input
    const { data, width, height } = pixelGrid

    // Fixed 2-colour palette — colours match the preprocessed B&W values
    const binaryPalette: ColorEntry[] = [
      { r: 20,  g: 20,  b: 20,  hex: '#141414', symbol: COLOR_SYMBOLS[0] ?? '■' },
      { r: 245, g: 245, b: 245, hex: '#f5f5f5', symbol: COLOR_SYMBOLS[1] ?? '□' },
    ]

    // Directly threshold each pixel: luminance < 128 → filled (index 0), else open (index 1)
    const grid: Cell[][] = []
    let filledCount = 0
    let openCount   = 0

    for (let row = 0; row < height; row++) {
      const gridRow: Cell[] = []
      for (let col = 0; col < width; col++) {
        const i   = (row * width + col) * 4
        const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
        const idx = lum < 128 ? 0 : 1
        if (idx === 0) filledCount++; else openCount++
        gridRow.push({ colorIndex: idx, symbol: binaryPalette[idx].symbol })
      }
      grid.push(gridRow)
    }

    const annotatedPalette: ColorEntry[] = [
      { ...binaryPalette[0], label: 'Filled (dc block)', stitchCount: filledCount },
      { ...binaryPalette[1], label: 'Open (ch-2 space)', stitchCount: openCount  },
    ]

    return {
      grid,
      palette: annotatedPalette,
      meta: {
        width,
        height,
        colorCount:      filledCount > 0 && openCount > 0 ? 2 : 1,
        requestedColors: 2,
        stitchStyle:     'filetCrochet',
        traversalOrder:  'rowByRow',
        totalStitches:   width * height,
        generatedAt:     new Date().toISOString(),
      },
    }
  }
}

// Cell type needed locally (imported from types in the rest of the app)
interface Cell { colorIndex: number; symbol: string }

export const filetStrategy = new FiletStrategy()
