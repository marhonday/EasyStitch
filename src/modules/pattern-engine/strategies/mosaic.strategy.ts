import { PatternData, Cell, ColorEntry } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'

/**
 * Mosaic crochet strategy.
 *
 * Mosaic (overlay/slip-stitch) uses a 1:1 square grid — identical geometry
 * to single crochet. The distinction is in the technique: only 2 colours are
 * worked per row (one active, one resting), and a DC is dropped into a stitch
 * 2 rows below to create the overlay pattern.
 *
 * For grid generation purposes the output is the same square pixel grid as SC.
 * The stitch style label, PDF instructions, and yarn estimate differ.
 *
 * Colour constraint: mosaic works best with a limited palette (2–4 colours).
 * We clamp maxColors to 4 to guide the engine toward mosaic-appropriate output.
 */

function countFromGrid(grid: Cell[][], paletteSize: number): number[] {
  const counts = new Array<number>(paletteSize).fill(0)
  for (const row of grid) for (const cell of row) counts[cell.colorIndex]++
  return counts
}

function activeColorCount(grid: Cell[][]): number {
  const seen = new Set<number>()
  for (const row of grid) for (const cell of row) seen.add(cell.colorIndex)
  return seen.size
}

class MosaicStrategy implements StitchStrategy {
  readonly id             = 'mosaic' as const
  readonly displayName    = 'Mosaic'
  readonly description    = 'Two-colour slip-stitch overlay'
  readonly traversalOrder = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle } = settings

    // Clamp to 4 colours max — mosaic reads best with a tight palette
    const clampedColorMap = colorMap.map(idx => Math.min(idx, Math.min(palette.length, 4) - 1))

    const rawGrid = buildGrid(clampedColorMap, palette, pixelGrid.width, pixelGrid.height)
    const grid    = smoothGrid(rawGrid, palette)

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

export const mosaicStrategy = new MosaicStrategy()
