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

class SingleCrochetStrategy implements StitchStrategy {
  readonly id             = 'singleCrochet' as const
  readonly displayName    = 'Single Crochet'
  readonly description    = 'Dense, square stitches — tight and detailed'
  readonly traversalOrder = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle, imageType, maxColors } = settings

    const rawGrid   = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)
    const isGraphic = imageType === 'graphic'
    const shouldSmoothPhoto     = !isGraphic && maxColors <= 5
    const smoothed  = shouldSmoothPhoto ? smoothGrid(rawGrid, palette) : rawGrid
    const shouldCleanPhotoNoise = !isGraphic && maxColors <= 3
    const { grid: cleaned } = shouldCleanPhotoNoise
      ? cleanPattern(smoothed, palette)
      : { grid: smoothed }

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
      },
    }
  }
}

export const singleCrochetStrategy = new SingleCrochetStrategy()
