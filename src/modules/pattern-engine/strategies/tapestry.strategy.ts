import { PatternData, Cell, ColorEntry } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'
import { compactPalette } from './knitting.strategy'

function activeColorCount(grid: Cell[][]): number {
  const seen = new Set<number>()
  for (const row of grid) for (const cell of row) seen.add(cell.colorIndex)
  return seen.size
}

class TapestryStrategy implements StitchStrategy {
  readonly id             = 'tapestry' as const
  readonly displayName    = 'Tapestry'
  readonly description    = 'Colour-carry technique — advanced'
  readonly traversalOrder = 'rowConstrained' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle, maxColors } = settings

    const rawGrid   = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)
    const smoothed  = smoothGrid(rawGrid, palette)

    // Use palette.length (not maxColors) — applyBackgroundPreference in the
    // quantize step can add a background slot beyond maxColors (e.g. 5 entries
    // when user chose 4), so rows with all palette entries would still trigger
    // smearing if the cap was based on maxColors. palette.length is always the
    // true upper bound of distinct colors any row can contain.
    const MAX_CARRIED = Math.max(3, palette.length)
    const rowCapped   = simplifyTapestryRows(smoothed, MAX_CARRIED, palette)

    const { grid, palette: finalPalette } = compactPalette(rowCapped, palette)

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

function simplifyTapestryRows(
  grid:       Cell[][],
  maxCarried: number,
  palette:    ColorEntry[]
): Cell[][] {
  return grid.map(row => {
    const colorCounts = new Map<number, number>()
    for (const cell of row) {
      colorCounts.set(cell.colorIndex, (colorCounts.get(cell.colorIndex) ?? 0) + 1)
    }
    if (colorCounts.size <= maxCarried) return row
    const sorted   = [...colorCounts.entries()].sort((a, b) => b[1] - a[1])
    const kept     = new Set(sorted.slice(0, maxCarried).map(([idx]) => idx))
    const fallback = sorted[0][0]
    return row.map(cell =>
      kept.has(cell.colorIndex)
        ? cell
        : { ...cell, colorIndex: fallback, symbol: palette[fallback]?.symbol ?? cell.symbol }
    )
  })
}

export const tapestryStrategy = new TapestryStrategy()
