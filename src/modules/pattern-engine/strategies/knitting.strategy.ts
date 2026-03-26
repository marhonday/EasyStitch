import { PatternData, ColorEntry, StitchStyle } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'
import { cleanPattern } from '../cleanPattern'

/**
 * Knitting colorwork strategies.
 *
 * Both stranded and intarsia use the same square grid generation as single
 * crochet — the visual difference (rectangular stitches) is handled entirely
 * in the renderer via cellWidthMultiplier, NOT in the grid data itself.
 *
 * knittingStranded — Fair Isle / carry-yarn technique. Stitches pull square
 *   due to two-yarn tension. cellWidthMultiplier = 1.0 (square rendering).
 *
 * knittingIntarsia — Separate yarn sections, standard stockinette tension.
 *   Stitches are wider than tall. cellWidthMultiplier = 1.25 at render time.
 */

function countFromGrid(grid: PatternData['grid'], paletteSize: number): number[] {
  const counts = new Array<number>(paletteSize).fill(0)
  for (const row of grid) for (const cell of row) counts[cell.colorIndex]++
  return counts
}

function activeColorCount(grid: PatternData['grid']): number {
  const seen = new Set<number>()
  for (const row of grid) for (const cell of row) seen.add(cell.colorIndex)
  return seen.size
}

class KnittingStrategy implements StitchStrategy {
  constructor(
    public readonly id:          StitchStyle,
    public readonly displayName: string,
    public readonly description: string,
  ) {}

  readonly traversalOrder = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle, imageType, maxColors } = settings

    const rawGrid   = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)
    const isGraphic = imageType === 'graphic'
    const shouldSmooth = !isGraphic && maxColors <= 5
    const smoothed  = shouldSmooth ? smoothGrid(rawGrid, palette) : rawGrid
    const shouldClean  = !isGraphic && maxColors <= 3
    const { grid }  = shouldClean ? cleanPattern(smoothed, palette) : { grid: smoothed }

    const counts = countFromGrid(grid, palette.length)
    const annotatedPalette: ColorEntry[] = palette.map((entry, i) => ({
      ...entry,
      label:       entry.label ?? hexToColorName(entry.hex),
      stitchCount: counts[i],
    }))

    return {
      grid,
      palette: annotatedPalette,
      meta: {
        width:          pixelGrid.width,
        height:         pixelGrid.height,
        colorCount:     activeColorCount(grid),
        stitchStyle,
        traversalOrder: this.traversalOrder,
        totalStitches:  pixelGrid.width * pixelGrid.height,
        generatedAt:    new Date().toISOString(),
      },
    }
  }
}

export const knittingStrandedStrategy = new KnittingStrategy(
  'knittingStranded',
  'Stranded / Fair Isle',
  'Carry both yarns across every row',
)

export const knittingIntarsiaStrategy = new KnittingStrategy(
  'knittingIntarsia',
  'Intarsia / Standard',
  'Separate yarn sections per colour area',
)

/** Width multiplier for rendering: how much wider a stitch is than it is tall */
export const KNITTING_CELL_RATIO: Record<'knittingStranded' | 'knittingIntarsia', number> = {
  knittingStranded: 1.0,    // two-yarn tension squares the stitch
  knittingIntarsia: 1.25,   // standard stockinette — stitches ~25% wider than tall
}
