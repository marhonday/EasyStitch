/**
 * smoothGrid.ts
 *
 * Noise-reduction pass with detail protection.
 *
 * Two-pass majority-vote filter — each cell adopts its neighbors' color
 * if 3+ of 4 agree. This removes isolated single-cell speckles.
 *
 * DETAIL PROTECTION: Before smoothing, we identify "anchor" cells —
 * cells whose color differs significantly from the average of their
 * neighbors (high local contrast). These are eyes, noses, outlines,
 * fine stripes — real detail that must not be smoothed away.
 * Anchor cells are never reassigned, regardless of neighbor votes.
 *
 * This is the key fix for "dog face not recognizable": the dark eye
 * and nose pixels are high-contrast anchors and survive smoothing,
 * while the uniform tan fur patches clean up normally.
 */

import { Cell, ColorEntry } from '@/types/pattern'
import { rgbToLab, labDistance } from '../palette-reduction/colorUtils'

// A cell is an anchor (protected) if its color's ΔE from the average
// of its 4 neighbors exceeds this threshold.
// 18 ≈ clearly different color (eye vs fur, nose vs face)
const ANCHOR_DELTA_E = 18

export function smoothGrid(
  grid:    Cell[][],
  palette: ColorEntry[]
): Cell[][] {
  const height = grid.length
  if (height === 0) return grid
  const width = grid[0].length

  // Precompute LAB for each palette entry once
  const paletteLab = palette.map(e => rgbToLab(e.r, e.g, e.b))

  // Identify anchor cells — high local contrast, must not be overwritten
  const isAnchor: boolean[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      const cellLab = paletteLab[grid[r][c].colorIndex]
      if (!cellLab) return false

      const neighbors: number[] = []
      if (r > 0)          neighbors.push(grid[r - 1][c].colorIndex)
      if (r < height - 1) neighbors.push(grid[r + 1][c].colorIndex)
      if (c > 0)          neighbors.push(grid[r][c - 1].colorIndex)
      if (c < width  - 1) neighbors.push(grid[r][c + 1].colorIndex)

      if (neighbors.length === 0) return false

      // Average LAB of neighbors
      let avgL = 0, avgA = 0, avgB = 0
      for (const ni of neighbors) {
        const nl = paletteLab[ni]
        avgL += nl.L; avgA += nl.a; avgB += nl.b
      }
      const n = neighbors.length
      const avgLab = { L: avgL / n, a: avgA / n, b: avgB / n, r: 0, g: 0, bl: 0 }

      return labDistance(cellLab, avgLab) >= ANCHOR_DELTA_E
    })
  )

  // Two smoothing passes — second pass cleans cells created by first pass
  return smoothPass(smoothPass(grid, palette, paletteLab, isAnchor), palette, paletteLab, isAnchor)
}

function smoothPass(
  grid:       Cell[][],
  palette:    ColorEntry[],
  paletteLab: ReturnType<typeof rgbToLab>[],
  isAnchor:   boolean[][]
): Cell[][] {
  const height = grid.length
  const width  = grid[0].length
  const out: Cell[][] = grid.map(row => row.map(cell => ({ ...cell })))

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      // Never override anchor cells
      if (isAnchor[row][col]) continue

      const current = grid[row][col].colorIndex

      const neighbors: number[] = []
      if (row > 0)          neighbors.push(grid[row - 1][col].colorIndex)
      if (row < height - 1) neighbors.push(grid[row + 1][col].colorIndex)
      if (col > 0)          neighbors.push(grid[row][col - 1].colorIndex)
      if (col < width  - 1) neighbors.push(grid[row][col + 1].colorIndex)

      if (neighbors.length < 3) continue

      const freq = new Map<number, number>()
      for (const n of neighbors) freq.set(n, (freq.get(n) ?? 0) + 1)

      let dominantColor = current, dominantCount = 0
      for (const [color, count] of freq) {
        if (count > dominantCount) { dominantCount = count; dominantColor = color }
      }

      if (dominantCount >= 3 && dominantColor !== current) {
        const p = palette[dominantColor]
        out[row][col] = { colorIndex: dominantColor, symbol: p?.symbol ?? out[row][col].symbol }
      }
    }
  }

  return out
}
