import { PatternData, ColorEntry } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'
import {
  mergeSimilarColors,
  removeSmallClusters,
  thickenDarkAreas,
  compactPalette,
} from './knitting.strategy'

/**
 * Mosaic crochet strategy — simplified stranded colorwork pipeline.
 *
 * Mosaic (overlay/slip-stitch) works 2 colours per row: one active, one resting.
 * This means the grid must read as bold, high-contrast shapes — NOT photo gradients.
 *
 * Pipeline (mirrors stranded knitting, stricter constraints):
 *   1. buildGrid
 *   2. Aggressively merge similar colours → target 2–3 max (ΔE < 25)
 *   3. smoothGrid — removes single-pixel speckle
 *   4. thickenDarkAreas — bold outlines, readable at distance
 *   5. removeSmallClusters (min 8) — isolated cells force row colour-changes; remove them
 *   6. compactPalette — colour key built from final grid only (fixes ghost-colour bug)
 */

const MOSAIC_MAX_COLORS = 3  // hard cap — mosaic is a 2-colour-per-row technique

class MosaicStrategy implements StitchStrategy {
  readonly id             = 'mosaic' as const
  readonly displayName    = 'Mosaic'
  readonly description    = 'Two-colour slip-stitch overlay'
  readonly traversalOrder = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle, maxColors } = settings

    // Respect user's chosen count but cap at MOSAIC_MAX_COLORS
    const targetColors = Math.min(maxColors, MOSAIC_MAX_COLORS)

    const rawGrid = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)

    // 1. Aggressively collapse near-duplicate shades down to target count
    //    ΔE threshold 25 — very aggressive merge befitting a 2-colour technique
    const { grid: merged, palette: mergedPalette } =
      mergeSimilarColors(rawGrid, palette, targetColors, 25)

    // 2. Smooth — removes single-pixel noise before shape work
    const smoothed = smoothGrid(merged, mergedPalette)

    // 3. Thicken dark regions — keeps bold graphic outlines readable
    const thickened = thickenDarkAreas(smoothed, mergedPalette, 2)

    // 4. Remove small isolated clusters (min 8 cells) — crucial for mosaic
    //    because isolated colour cells force unnecessary row colour-changes
    const cleaned = removeSmallClusters(thickened, mergedPalette, 8)

    // 5. Compact — colour key is built from the final grid only
    const { grid, palette: finalPalette } = compactPalette(cleaned, mergedPalette)

    const counts = new Array<number>(finalPalette.length).fill(0)
    for (const row of grid) for (const cell of row) counts[cell.colorIndex]++

    const seen = new Set<number>()
    for (const row of grid) for (const cell of row) seen.add(cell.colorIndex)

    const annotatedPalette: ColorEntry[] = finalPalette.map((entry, i) => ({
      ...entry,
      label:       entry.label ?? hexToColorName(entry.hex),
      stitchCount: counts[i],
    }))

    return {
      grid,
      palette: annotatedPalette,
      meta: {
        width:           pixelGrid.width,
        height:          pixelGrid.height,
        colorCount:      seen.size,
        requestedColors: maxColors,
        stitchStyle,
        traversalOrder:  this.traversalOrder,
        totalStitches:   pixelGrid.width * pixelGrid.height,
        generatedAt:     new Date().toISOString(),
      },
    }
  }
}

export const mosaicStrategy = new MosaicStrategy()
