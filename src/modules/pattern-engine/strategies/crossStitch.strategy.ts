import { PatternData, ColorEntry, StitchStyle } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'
import { cleanPattern } from '../cleanPattern'

class CrossStitchStrategy implements StitchStrategy {
  readonly id: StitchStyle = 'crossStitch'
  readonly displayName = 'Cross Stitch'
  readonly description = 'Square grid for Aida cloth embroidery'
  readonly traversalOrder = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle, imageType, maxColors } = settings
    const rawGrid  = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)
    const isGraphic = imageType === 'graphic'
    const smoothed = (!isGraphic && maxColors <= 8) ? smoothGrid(rawGrid, palette) : rawGrid
    const { grid } = (!isGraphic && maxColors <= 4) ? cleanPattern(smoothed, palette) : { grid: smoothed }
    const counts = new Array<number>(palette.length).fill(0)
    for (const row of grid) for (const cell of row) counts[cell.colorIndex]++
    const annotatedPalette: ColorEntry[] = palette.map((entry, i) => ({
      ...entry,
      label: entry.label ?? hexToColorName(entry.hex),
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
        stitchStyle: 'crossStitch',
        traversalOrder: 'rowByRow',
        totalStitches: pixelGrid.width * pixelGrid.height,
        generatedAt: new Date().toISOString(),
      },
    }
  }
}

export const crossStitchStrategy = new CrossStitchStrategy()
