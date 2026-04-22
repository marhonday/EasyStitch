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
    // Thresholds kept low — the full-res photo palette engine already produces
    // clean colours. Smoothing/cleaning at higher counts was discarding real
    // detail (fur, skin tones) that the user explicitly asked for via the slider.
    const shouldSmoothPhoto     = !isGraphic && maxColors <= 5
    const smoothed  = shouldSmoothPhoto ? smoothGrid(rawGrid, palette) : rawGrid
    const shouldCleanPhotoNoise = !isGraphic && maxColors <= 3
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
