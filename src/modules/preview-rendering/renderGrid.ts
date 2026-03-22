/**
 * preview-rendering/renderGrid.ts
 *
 * Converts PatternData into a flat list of positioned RenderCells.
 * This is a pure data transform — no DOM, no canvas, no React.
 *
 * Consumers:
 * - PatternGrid component (maps RenderCells to <div> or <canvas> draw calls)
 * - gridToPDF (maps RenderCells to PDF rect/circle primitives)
 *
 * CROCHET-STYLE BRANCH (C2C):
 * A C2C renderer would call buildC2CTraversalOrder() from gridBuilder and
 * re-index the RenderCells with diagonal x/y offsets + diamond shapes.
 * The PatternData grid itself doesn't change — only how cells are positioned.
 */

import { PatternData, Cell, ColorEntry } from '@/types/pattern'
import { getStitchHints, StitchRenderHints } from '../pattern-engine/stitchMapper'

// ─── Output types ─────────────────────────────────────────────────────────────

export interface RenderCell {
  /** Pixel offset from top-left of the grid */
  x:      number
  y:      number
  /** Pixel dimensions */
  width:  number
  height: number
  /** Fill colour */
  hex:    string
  /** Symbol character (empty string if style hides symbols) */
  symbol: string
  /** Row and column in the original grid (useful for tooltips, accessibility) */
  row:    number
  col:    number
  /** Index into the palette (for highlighting / selection) */
  colorIndex: number
}

export interface RenderPayload {
  cells:       RenderCell[]
  totalWidth:  number
  totalHeight: number
  cellSize:    number
  hints:       StitchRenderHints
  /** Gap between cells in pixels (0 for tight grids, 1–2 for open styles) */
  gap:         number
}

// ─── Main render function ─────────────────────────────────────────────────────

/**
 * Flatten a PatternData grid into positioned RenderCells at the given cell size.
 *
 * @param pattern  - The PatternData from generatePattern()
 * @param cellSize - Pixel size of each cell (e.g. 14 for preview, 24 for PDF)
 * @param gap      - Gap between cells in pixels (default: 1)
 */
export function renderGrid(
  pattern:  PatternData,
  cellSize: number,
  gap = 1
): RenderPayload {
  const { grid, palette, meta } = pattern
  const hints = getStitchHints(meta.stitchStyle)
  const stride = cellSize + gap

  const cells: RenderCell[] = []

  for (let row = 0; row < grid.length; row++) {
    const gridRow = grid[row]
    for (let col = 0; col < gridRow.length; col++) {
      const cell:  Cell       = gridRow[col]
      const color: ColorEntry = palette[cell.colorIndex]

      cells.push({
        x:          col * stride,
        y:          row * stride,
        width:      cellSize,
        height:     cellSize,
        hex:        color?.hex    ?? '#cccccc',
        symbol:     hints.showSymbol ? (cell.symbol ?? '') : '',
        row,
        col,
        colorIndex: cell.colorIndex,
      })
    }
  }

  const totalWidth  = meta.width  * stride - gap
  const totalHeight = meta.height * stride - gap

  return { cells, totalWidth, totalHeight, cellSize, hints, gap }
}

// ─── Utility: filter cells by colour ─────────────────────────────────────────

/**
 * Return only cells matching a specific palette index.
 * Useful for "highlight this colour" interactions in the preview.
 */
export function filterCellsByColor(
  payload:    RenderPayload,
  colorIndex: number
): RenderCell[] {
  return payload.cells.filter(c => c.colorIndex === colorIndex)
}
