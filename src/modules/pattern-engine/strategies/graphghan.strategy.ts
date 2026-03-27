import { PatternData, ColorEntry } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'
import { cleanPattern } from '../cleanPattern'
import { compactPalette } from './knitting.strategy'

function activeColorCount(grid: PatternData['grid']): number {
  const seen = new Set<number>()
  for (const row of grid) for (const cell of row) seen.add(cell.colorIndex)
  return seen.size
}

class GraphghanStrategy implements StitchStrategy {
  readonly id             = 'graphghan' as const
  readonly displayName    = 'Simple Blocks'
  readonly description    = 'Filled square cells — great for beginners'
  readonly traversalOrder = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { colorMap, palette, settings, pixelGrid } = input
    const { stitchStyle, imageType, maxColors } = settings

    const rawGrid   = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)
    const isGraphic = imageType === 'graphic'
    const smoothed  = isGraphic ? rawGrid : smoothGrid(rawGrid, palette)
    const { grid: cleaned, mergedCount } = isGraphic
      ? { grid: smoothed, mergedCount: 0 }
      : cleanPattern(smoothed, palette)

    const { grid, palette: finalPalette } = compactPalette(cleaned, palette)

    const counts = new Array<number>(finalPalette.length).fill(0)
    for (const row of grid) for (const cell of row) counts[cell.colorIndex]++

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
        colorCount:      activeColorCount(grid),
        requestedColors: maxColors,
        stitchStyle,
        traversalOrder:  this.traversalOrder,
        totalStitches:   pixelGrid.width * pixelGrid.height,
        generatedAt:     new Date().toISOString(),
        noiseCleaned:    mergedCount,
      },
    }
  }
}

export const graphghanStrategy = new GraphghanStrategy()
