import { PatternData, ColorEntry } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'
import { cleanPattern } from '../cleanPattern'

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

class C2CStrategy implements StitchStrategy {
  readonly id             = 'c2c' as const
  readonly displayName    = 'Corner to Corner'
  readonly description    = 'Diagonal stitch blocks — intermediate level'
  readonly traversalOrder = 'diagonal' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle, imageType, maxColors } = settings

    const rawGrid   = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)
    const isGraphic = imageType === 'graphic'
    const smoothed  = isGraphic ? rawGrid : smoothGrid(rawGrid, palette)
    const shouldCleanPhotoNoise = !isGraphic && maxColors <= 10
    const { grid }  = shouldCleanPhotoNoise ? cleanPattern(smoothed, palette) : { grid: smoothed }

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

export const c2cStrategy = new C2CStrategy()
