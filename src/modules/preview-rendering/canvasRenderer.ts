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
  /**
   * Colour of the 1 px gap lines between cells.
   * Default '#FFFFFF' (white — invisible against most backgrounds).
   * Pass a darker value to show visible grid lines for editing.
   */
  gapColor?:            string
  /**
   * Optional repeating watermark rendered ONTO the canvas (not CSS),
   * so it persists through zoom and screenshots.
   */
  watermarkText?:       string
  watermarkOpacity?:    number
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

  // Gap > 0: fill canvas with the gap colour (default white = invisible seams).
  // Gap = 0 (thumbnails): use the pattern's background colour instead.
  ctx.fillStyle = gap > 0 ? (options.gapColor ?? '#FFFFFF') : (pattern.meta.backgroundColor ?? '#FFFFFF')
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

  // ── Watermark overlay ───────────────────────────────────────────────────────
  if (options.watermarkText) {
    const text = options.watermarkText.trim()
    if (text) {
      const opacity = typeof options.watermarkOpacity === 'number'
        ? Math.max(0.02, Math.min(0.25, options.watermarkOpacity))
        : 0.12

      ctx.save()
      ctx.globalAlpha = opacity
      ctx.fillStyle = '#2C2218'

      // Scale watermark sizing based on canvas size
      const base = Math.max(width, height)
      const fontPx = Math.max(14, Math.min(26, Math.round(base / 42)))
      const spacing = Math.max(120, Math.min(240, Math.round(base / 6)))

      ctx.font = `600 ${fontPx}px 'DM Sans', sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Diagonal repeating pattern
      ctx.translate(width / 2, height / 2)
      ctx.rotate(-Math.PI / 6) // -30°

      const diag = Math.sqrt(width * width + height * height)
      for (let y = -diag; y <= diag; y += spacing) {
        for (let x = -diag; x <= diag; x += spacing) {
          ctx.fillText(text, x, y)
        }
      }

      ctx.restore()
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

/**
 * Overlays a row-progress highlight on top of an already-drawn canvas.
 * Call this AFTER drawPatternToCanvas so it composites correctly.
 *
 * @param gridRow  0-indexed canvas row (0 = top of canvas = LAST instruction row)
 * @param cellSize same cellSize used to draw the pattern
 * @param gap      same gap (default 1)
 */
export function drawRowHighlight(
  canvas:   HTMLCanvasElement,
  gridRow:  number,
  cellSize: number,
  gap = 1
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const stride   = cellSize + gap
  const currentY = gridRow * stride

  // Dim all rows below the current one (already completed)
  const doneY = currentY + stride
  if (doneY < canvas.height) {
    ctx.fillStyle = 'rgba(240,234,224,0.52)'
    ctx.fillRect(0, doneY, canvas.width, canvas.height - doneY)
  }

  // Terracotta tint on the active row
  ctx.fillStyle = 'rgba(196,97,74,0.13)'
  ctx.fillRect(0, currentY, canvas.width, stride)

  // Left accent bar
  ctx.fillStyle = 'rgba(196,97,74,0.55)'
  ctx.fillRect(0, currentY, 4, stride)
}
