/**
 * removeColor.ts
 *
 * Shared utility: remove one palette entry from a PatternData by merging
 * all its cells into the nearest remaining colour, then compact the palette.
 *
 * Used by the interactive colour palette editor on every export page.
 */

import { PatternData } from '@/types/pattern'

export function removeColorFromPattern(pattern: PatternData, removeIdx: number): PatternData {
  const { grid, palette } = pattern
  if (palette.length <= 1) return pattern  // can't remove the only colour

  // Find nearest remaining colour by RGB distance
  const rem = palette[removeIdx]
  let nearestIdx = 0
  let nearestDist = Infinity
  for (let i = 0; i < palette.length; i++) {
    if (i === removeIdx) continue
    const e = palette[i]
    const d = (rem.r - e.r) ** 2 + (rem.g - e.g) ** 2 + (rem.b - e.b) ** 2
    if (d < nearestDist) { nearestDist = d; nearestIdx = i }
  }

  // Remap removed cells → nearest, then shift indices above removeIdx down by 1
  const newPalette = palette.filter((_, i) => i !== removeIdx)
  const newGrid = grid.map(row =>
    row.map(cell => {
      const ci = cell.colorIndex === removeIdx ? nearestIdx : cell.colorIndex
      const ni = ci > removeIdx ? ci - 1 : ci
      return { colorIndex: ni, symbol: newPalette[ni].symbol }
    })
  )

  // Recount stitches
  const counts = new Array(newPalette.length).fill(0)
  for (const row of newGrid) for (const cell of row) counts[cell.colorIndex]++
  const finalPalette = newPalette.map((e, i) => ({ ...e, stitchCount: counts[i] }))

  return {
    ...pattern,
    grid: newGrid,
    palette: finalPalette,
    meta: {
      ...pattern.meta,
      colorCount: finalPalette.filter(e => (e.stitchCount ?? 0) > 0).length,
    },
  }
}
