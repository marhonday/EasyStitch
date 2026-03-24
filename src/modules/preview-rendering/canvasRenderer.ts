/**
 * preview-rendering/canvasRenderer.ts
 *
 * Pure function that draws a PatternData grid onto an HTMLCanvasElement.
 * Respects stitch-style render hints: square, circle, or diamond cell shapes.
 */

import { PatternData } from '@/types/pattern'
import { getStitchHints } from '../pattern-engine/stitchMapper'

export interface DrawOptions {
  cellSize:    number
  gap:         number
  showSymbols: boolean
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
  const stride = options.cellSize + options.gap
  return {
    width:  pattern.meta.width  * stride - options.gap,
    height: pattern.meta.height * stride - options.gap,
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
  const stride = cellSize + gap
  const { width, height } = computeCanvasSize(pattern, options)
  const hints = getStitchHints(pattern.meta.stitchStyle)

  canvas.width  = width
  canvas.height = height

  // Fill canvas with the pattern's chosen background colour.
  // backgroundColor is stamped into meta by generatePattern so it is always
  // accurate regardless of what colour was picked in Settings.
  ctx.fillStyle = pattern.meta.backgroundColor ?? '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  const { grid, palette } = pattern
  const radius = cellSize * (hints.borderRadius ?? 0.1)

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell  = grid[row][col]
      const color = palette[cell.colorIndex]
      if (!color) continue

      const x = col * stride
      const y = row * stride

      ctx.fillStyle = color.hex

      if (hints.cellShape === 'circle') {
        ctx.beginPath()
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 - 0.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (hints.cellShape === 'diamond') {
        const cx = x + cellSize / 2
        const cy = y + cellSize / 2
        const r  = cellSize / 2 - 0.5
        ctx.beginPath()
        ctx.moveTo(cx, cy - r)
        ctx.lineTo(cx + r, cy)
        ctx.lineTo(cx, cy + r)
        ctx.lineTo(cx - r, cy)
        ctx.closePath()
        ctx.fill()
      } else if (radius > 0 && cellSize >= 8) {
        ctx.beginPath()
        ctx.roundRect(x, y, cellSize, cellSize, radius)
        ctx.fill()
      } else {
        ctx.fillRect(x, y, cellSize, cellSize)
      }
    }
  }

  if (showSymbols && cellSize >= 14 && hints.showSymbol) {
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.font         = `${Math.floor(cellSize * 0.5)}px sans-serif`

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell  = grid[row][col]
        if (!cell.symbol) continue
        const x = col * stride + cellSize / 2
        const y = row * stride + cellSize / 2
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
