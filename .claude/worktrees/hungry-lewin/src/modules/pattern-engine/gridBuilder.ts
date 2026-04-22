/**
 * pattern-engine/gridBuilder.ts
 *
 * Converts a flat ColorMap into a 2D Cell[][] grid suitable for rendering.
 *
 * This is intentionally a pure data transformation with no rendering logic.
 * The grid can be consumed by:
 * - PatternGrid (React component, canvas/SVG render)
 * - renderGrid (preview-rendering module)
 * - gridToPDF (pdf-export module)
 *
 * CROCHET-STYLE BRANCH:
 * - Graphghan (current): row 0 = top of image, standard left-to-right traversal
 * - C2C: cells are read diagonally. The grid data is identical, but the
 *   traversal order exported to PDF/instructions changes.
 *   → buildC2CTraversalOrder(grid) would return diagonal index sequences
 * - Tapestry: same grid, but a post-pass validates row colour constraints
 *   → validateTapestryRows(grid, palette) would flag or fix constraint violations
 */

import { Cell, ColorEntry, ColorMap } from '@/types/pattern'

/**
 * Build a 2D Cell grid from a flat ColorMap.
 *
 * Row 0 = top of the image (as seen on screen).
 * Each cell carries both colorIndex and the symbol string (copied from palette)
 * so renderers don't need to look up the palette per cell.
 */
export function buildGrid(
  colorMap: ColorMap,
  palette:  ColorEntry[],
  width:    number,
  height:   number
): Cell[][] {
  const grid: Cell[][] = []

  for (let row = 0; row < height; row++) {
    const gridRow: Cell[] = []
    for (let col = 0; col < width; col++) {
      const idx        = row * width + col
      const colorIndex = colorMap[idx]
      const color      = palette[colorIndex]
      gridRow.push({
        colorIndex,
        symbol: color?.symbol ?? '?',
      })
    }
    grid.push(gridRow)
  }

  return grid
}

/**
 * Count how many stitches of each colour appear in the grid.
 * Useful for the "stitch count per colour" section in the PDF.
 *
 * Returns an array parallel to the palette: counts[i] = stitches for palette[i].
 */
export function countStitchesPerColor(
  colorMap: ColorMap,
  paletteSize: number
): number[] {
  const counts = new Array<number>(paletteSize).fill(0)
  for (let i = 0; i < colorMap.length; i++) {
    counts[colorMap[i]]++
  }
  return counts
}

// CROCHET-STYLE BRANCH (C2C):
// export function buildC2CTraversalOrder(width: number, height: number): number[][] {
//   // Returns arrays of flat indices in diagonal reading order.
//   // Diagonal d covers cells where row + col === d.
//   const diagonals: number[][] = []
//   for (let d = 0; d < width + height - 1; d++) {
//     const diag: number[] = []
//     for (let row = 0; row < height; row++) {
//       const col = d - row
//       if (col >= 0 && col < width) diag.push(row * width + col)
//     }
//     diagonals.push(diag)
//   }
//   return diagonals
// }

// CROCHET-STYLE BRANCH (Tapestry):
// export function validateTapestryRows(grid: Cell[][]): { row: number; colorCount: number }[] {
//   // Tapestry crochet typically carries max 2 yarns per row.
//   // Returns rows that violate this constraint so the engine can simplify them.
//   return grid.map((row, i) => ({
//     row: i,
//     colorCount: new Set(row.map(c => c.colorIndex)).size,
//   })).filter(r => r.colorCount > 2)
// }
