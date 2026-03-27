import { PatternData, PatternSettings, Cell, ColorEntry, BorderLayer } from '@/types/pattern'
import { resizeToGrid }        from '../image-processing/resize'
import { removeGridOverlay }   from '../image-processing/removeGrid'
import { quantizeImage, extractPaletteFromFullSize, quantizePhotoFromFullSize } from '../palette-reduction/quantize'
import { getStrategy }         from './strategies/registry'
import { COLOR_SYMBOLS }       from '@/lib/constants'

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0,2), 16),
    g: parseInt(h.slice(2,4), 16),
    b: parseInt(h.slice(4,6), 16),
  }
}

function applyBorderLayer(
  patternData: PatternData,
  layer:       BorderLayer
): PatternData {
  if (layer.width <= 0) return patternData
  const { r, g, b } = hexToRgb(layer.color)
  const { grid, palette } = patternData

  // Find or add this color in palette
  let borderIdx = palette.findIndex(e =>
    Math.abs(e.r - r) < 8 && Math.abs(e.g - g) < 8 && Math.abs(e.b - b) < 8
  )
  let newPalette = [...palette]
  if (borderIdx === -1) {
    borderIdx = newPalette.length
    newPalette.push({
      r, g, b,
      hex:         layer.color,
      symbol:      COLOR_SYMBOLS[borderIdx] ?? String(borderIdx + 1),
      label:       'Border',
      stitchCount: 0,
    })
  }

  const bw = layer.width
  const borderCell: Cell = { colorIndex: borderIdx, symbol: newPalette[borderIdx].symbol }
  const origH = grid.length
  const origW = grid[0]?.length ?? 0
  const newH  = origH + bw * 2
  const newW  = origW + bw * 2

  const newGrid: Cell[][] = []
  for (let row = 0; row < newH; row++) {
    const newRow: Cell[] = []
    for (let col = 0; col < newW; col++) {
      const isBorder = row < bw || row >= newH - bw || col < bw || col >= newW - bw
      newRow.push(isBorder ? { ...borderCell } : { ...grid[row - bw][col - bw] })
    }
    newGrid.push(newRow)
  }

  const counts = new Array(newPalette.length).fill(0)
  for (const row of newGrid) for (const cell of row) counts[cell.colorIndex]++
  newPalette = newPalette.map((e, i) => ({ ...e, stitchCount: counts[i] }))

  return {
    grid:    newGrid,
    palette: newPalette,
    meta: {
      ...patternData.meta,
      width:         newW,
      height:        newH,
      totalStitches: newW * newH,
      colorCount:    newPalette.filter(e => (e.stitchCount ?? 0) > 0).length,
    },
  }
}

export async function generatePattern(
  imageDataUrl: string,
  settings:     PatternSettings
): Promise<PatternData> {

  // Verify what image we actually have
  const { gridSize, maxColors, stitchStyle, imageType } = settings
  const backgroundColor = settings.backgroundColor ?? '#ffffff'
  const borderLayers    = settings.borderLayers    ?? []

  // ── Stage 1: Resize ────────────────────────────────────────────────────────
  // Use the selected grid size directly — skipCrop in resizeToGrid ensures
  // the full image content is used without re-cropping
  const pixelGrid = await resizeToGrid(imageDataUrl, {
    targetWidth:  gridSize.width,
    targetHeight: gridSize.height,
    imageType,
  })

  // ── Stage 1b: Remove grid overlay (skip for pixel art — keep it as-is) ──────
  const cleanGrid = imageType === 'pixel'
    ? pixelGrid
    : (() => {
        const gridResult = removeGridOverlay(pixelGrid.data, pixelGrid.width, pixelGrid.height)
        return gridResult.gridRemoved
          ? { data: gridResult.data, width: pixelGrid.width, height: pixelGrid.height }
          : pixelGrid
      })()

  // ── Stage 2: Quantize ──────────────────────────────────────────────────────
  let palette, colorMap
  if (imageType === 'pixel') {
    // Pixel art: frequency-based extraction directly on the grid — no full-res pass,
    // no saliency weighting, no flood-fill. Preserves exact original colors.
    const result = quantizeImage(cleanGrid, maxColors, 'pixel', backgroundColor)
    palette  = result.palette
    colorMap = result.colorMap
  } else if (imageType === 'graphic') {
    const result = await extractPaletteFromFullSize(imageDataUrl, cleanGrid, maxColors, backgroundColor)
    palette  = result.palette
    colorMap = result.colorMap
  } else {
    // Photo mode: extract palette from full-res source so fine subject detail
    // (eyes, whiskers, skin tones, fur gradients) isn't lost in grid downsampling
    const result = await quantizePhotoFromFullSize(imageDataUrl, cleanGrid, maxColors, backgroundColor)
    palette  = result.palette
    colorMap = result.colorMap
  }

  // ── Stage 3 & 4: Strategy + Assemble ──────────────────────────────────────
  const strategy    = getStrategy(stitchStyle)
  let   patternData = strategy.execute({ pixelGrid: cleanGrid, palette, colorMap, settings })

  // ── Stage 5: Apply border layers (innermost first = last in array) ─────────
  // layers[0] is outermost — apply in reverse so it ends up on the outside
  for (let i = borderLayers.length - 1; i >= 0; i--) {
    patternData = applyBorderLayer(patternData, borderLayers[i])
  }

  // ── Stage 6: Stamp backgroundColor into meta ───────────────────────────────
  // Carried through so the canvas renderer can fill the correct bg colour
  // instead of always defaulting to white.
  return {
    ...patternData,
    meta: { ...patternData.meta, backgroundColor },
  }
}
