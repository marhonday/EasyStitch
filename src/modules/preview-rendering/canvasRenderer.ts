/**
 * preview-rendering/canvasRenderer.ts
 *
 * Pure function that draws a PatternData grid onto an HTMLCanvasElement.
 * Respects stitch-style render hints: square, circle, or diamond cell shapes.
 */

import { PatternData } from '@/types/pattern'
import { getStitchHints } from '../pattern-engine/stitchMapper'

export interface DrawOptions {
  cellSize:             number
  gap:                  number
  showSymbols:          boolean
  /** >1 for knitting — stitches are wider than tall. Default 1 (square). */
  cellWidthMultiplier?: number
}

export const PREVIEW_DEFAULTS: DrawOptions = {
  cellSize:    14,
  gap:         1,
  showSymbols: false,
}

export const THUMBNAIL_DEFAULTS: DrawOptions = {
  cellSize:    6,
  gap:         0,
  showSymbols: false,
}

export function computeCanvasSize(
  pattern:  PatternData,
  options:  DrawOptions
): { width: number; height: number } {
  const cellW   = options.cellSize * (options.cellWidthMultiplier ?? 1)
  const cellH   = options.cellSize
  const strideX = cellW + options.gap
  const strideY = cellH + options.gap
  return {
    width:  pattern.meta.width  * strideX - options.gap,
    height: pattern.meta.height * strideY - options.gap,
  }
}

export function drawPatternToCanvas(
  canvas:  HTMLCanvasElement,
  pattern: PatternData,
  options: DrawOptions = PREVIEW_DEFAULTS
): { width: number; height: number } {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not acquire 2D canvas context')

  const { cellSize, gap, showSymbols } = options
  const cellW   = cellSize * (options.cellWidthMultiplier ?? 1)
  const cellH   = cellSize
  const strideX = cellW + gap
  const strideY = cellH + gap
  const { width, height } = computeCanvasSize(pattern, options)
  const hints = getStitchHints(pattern.meta.stitchStyle)

  canvas.width  = width
  canvas.height = height

  // Gap > 0: use a visible warm grey as the grid-line colour.
  // Gap = 0 (thumbnails): use the pattern's background colour instead.
  ctx.fillStyle = gap > 0 ? '#C8BEB2' : (pattern.meta.backgroundColor ?? '#FFFFFF')
  ctx.fillRect(0, 0, width, height)

  const { grid, palette } = pattern
  const radius = cellH * (hints.borderRadius ?? 0.1)

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell  = grid[row][col]
      const color = palette[cell.colorIndex]
      if (!color) continue

      const x = col * strideX
      const y = row * strideY

      ctx.fillStyle = color.hex

      if (hints.cellShape === 'circle') {
        // Draw an ellipse for non-square cells
        ctx.beginPath()
        ctx.ellipse(x + cellW / 2, y + cellH / 2, cellW / 2 - 0.5, cellH / 2 - 0.5, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (hints.cellShape === 'diamond') {
        const cx = x + cellW / 2
        const cy = y + cellH / 2
        ctx.beginPath()
        ctx.moveTo(cx, cy - cellH / 2 + 0.5)
        ctx.lineTo(cx + cellW / 2 - 0.5, cy)
        ctx.lineTo(cx, cy + cellH / 2 - 0.5)
        ctx.lineTo(cx - cellW / 2 + 0.5, cy)
        ctx.closePath()
        ctx.fill()
      } else if (radius > 0 && cellH >= 8) {
        ctx.beginPath()
        ctx.roundRect(x, y, cellW, cellH, radius)
        ctx.fill()
      } else {
        ctx.fillRect(x, y, cellW, cellH)
      }
    }
  }

  if (showSymbols && cellH >= 14 && hints.showSymbol) {
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.font         = `${Math.floor(cellH * 0.5)}px sans-serif`

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell  = grid[row][col]
        if (!cell.symbol) continue
        const x = col * strideX + cellW / 2
        const y = row * strideY + cellH / 2
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillText(cell.symbol, x, y)
      }
    }
  }

  return { width, height }
}

export function drawPatternThumbnail(
  canvas:  HTMLCanvasElement,
  pattern: PatternData
): void {
  drawPatternToCanvas(canvas, pattern, THUMBNAIL_DEFAULTS)
}
