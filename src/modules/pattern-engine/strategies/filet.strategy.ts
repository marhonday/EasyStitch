import { PatternData, ColorEntry, StitchStyle } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'

class FiletStrategy implements StitchStrategy {
  readonly id: StitchStyle = 'filetCrochet'
  readonly displayName = 'Filet Crochet'
  readonly description = 'Open mesh grid — filled blocks and open spaces'
  readonly traversalOrder = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, pixelGrid } = input
    // Binary palette only — take first 2 entries (dark = filled, light = open)
    const binaryPalette = palette.slice(0, 2)
    const grid = buildGrid(colorMap, binaryPalette, pixelGrid.width, pixelGrid.height)
    // Count stitches
    const counts = new Array<number>(binaryPalette.length).fill(0)
    for (const row of grid) for (const cell of row) counts[cell.colorIndex]++
    const annotatedPalette: ColorEntry[] = binaryPalette.map((entry, i) => ({
      ...entry,
      label: i === 0 ? 'Filled (dc block)' : 'Open (ch-2 space)',
      stitchCount: counts[i],
    }))
    const seen = new Set<number>()
    for (const row of grid) for (const cell of row) seen.add(cell.colorIndex)
    return {
      grid,
      palette: annotatedPalette,
      meta: {
        width: pixelGrid.width,
        height: pixelGrid.height,
        colorCount: seen.size,
        stitchStyle: 'filetCrochet',
        traversalOrder: 'rowByRow',
        totalStitches: pixelGrid.width * pixelGrid.height,
        generatedAt: new Date().toISOString(),
      },
    }
  }
}

export const filetStrategy = new FiletStrategy()
