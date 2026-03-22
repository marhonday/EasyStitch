import { PatternData, Cell, ColorEntry } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'

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

class TapestryStrategy implements StitchStrategy {
  readonly id             = 'tapestry' as const
  readonly displayName    = 'Tapestry'
  readonly description    = 'Colour-carry technique — advanced'
  readonly traversalOrder = 'rowConstrained' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle } = settings

    const rawGrid = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)
    let grid = smoothGrid(rawGrid, palette)

    const MAX_CARRIED = 3
    grid = simplifyTapestryRows(grid, MAX_CARRIED, palette)

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
