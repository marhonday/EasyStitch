import { PatternData, ColorEntry, Cell, StitchStyle } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'
import { rgbToLab, labDistance } from '../../palette-reduction/colorUtils'

/**
 * Cross stitch strategy — square grid for Aida cloth embroidery.
 *
 * Cross stitch can handle more detail than knitting/filet so the pipeline
 * is intentionally lighter:
 *   1. buildGrid
 *   2. smoothGrid (1 pass — removes single-pixel speckle, preserves detail)
 *   3. mergeSimilarColors (ΔE < 8 — only collapses near-identical shades)
 *   4. applyLightDithering (optional Bayer 4×4 — smooth colour transitions)
 *   5. compactPalette (removes zero-count entries — fixes colour-key bug)
 */

// ─── Bayer 4×4 ordered-dithering matrix ──────────────────────────────────────

const BAYER4: readonly number[][] = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
]

/**
 * Light ordered dithering via Bayer 4×4.
 * Only swaps a cell to its closest alternative colour when:
 *   • ΔE to nearest neighbour is below threshold (22), AND
 *   • the Bayer value falls within the blend probability
 * This creates a subtle dot pattern at colour edges rather than hard lines.
 */
function applyLightDithering(
  grid:      Cell[][],
  palette:   ColorEntry[],
  threshold  = 22,
): Cell[][] {
  const H = grid.length
  if (H === 0) return grid
  const W = grid[0].length

  return grid.map((row, r) =>
    row.map((cell, c) => {
      const orig = palette[cell.colorIndex]
      const lo   = rgbToLab(orig.r, orig.g, orig.b)

      // Find nearest alternative colour
      let bestAlt  = -1
      let bestDist = Infinity
      for (let i = 0; i < palette.length; i++) {
        if (i === cell.colorIndex) continue
        const la = rgbToLab(palette[i].r, palette[i].g, palette[i].b)
        const d  = labDistance(lo, la)
        if (d < bestDist) { bestDist = d; bestAlt = i }
      }

      if (bestAlt === -1 || bestDist > threshold) return cell

      // Blend probability: higher when colours are more similar
      const blend   = (1 - bestDist / threshold) * 0.5
      const bayerVal = BAYER4[r % 4][c % 4] / 16  // 0..0.9375
      if (bayerVal < blend) {
        return { colorIndex: bestAlt, symbol: palette[bestAlt].symbol }
      }
      return cell
    })
  )
}

// ─── Palette merge (same algorithm as knitting, lighter threshold) ─────────────

function mergeSimilarColors(
  grid:        Cell[][],
  palette:     ColorEntry[],
  targetCount: number,
  threshold    = 8,
): { grid: Cell[][]; palette: ColorEntry[] } {
  const canonical = palette.map((_, i) => i)
  const counts    = new Array<number>(palette.length).fill(0)
  for (const row of grid) for (const cell of row) counts[cell.colorIndex]++

  function activeIndices(): number[] {
    return [...new Set(canonical)]
  }

  let changed = true
  while (changed) {
    changed = false
    const active = activeIndices()
    if (active.length <= targetCount) break

    let bestI = -1, bestJ = -1, bestDist = Infinity
    for (let ai = 0; ai < active.length; ai++) {
      const i  = active[ai]
      const li = rgbToLab(palette[i].r, palette[i].g, palette[i].b)
      for (let aj = ai + 1; aj < active.length; aj++) {
        const j  = active[aj]
        const lj = rgbToLab(palette[j].r, palette[j].g, palette[j].b)
        const d  = labDistance(li, lj)
        if (d < bestDist) { bestDist = d; bestI = i; bestJ = j }
      }
    }

    if (bestDist > threshold || bestI === -1) break

    const keep = counts[bestI] >= counts[bestJ] ? bestI : bestJ
    const drop = counts[bestI] >= counts[bestJ] ? bestJ : bestI
    counts[keep] += counts[drop]
    counts[drop] = 0
    for (let k = 0; k < canonical.length; k++) {
      if (canonical[k] === drop) canonical[k] = keep
    }
    changed = true
  }

  const activeSet  = activeIndices()
  const reindex    = new Map(activeSet.map((orig, newIdx) => [orig, newIdx]))
  const newPalette = activeSet.map(orig => ({ ...palette[orig] }))

  const newGrid: Cell[][] = grid.map(row =>
    row.map(cell => {
      const newIdx = reindex.get(canonical[cell.colorIndex])!
      return { colorIndex: newIdx, symbol: newPalette[newIdx].symbol }
    })
  )

  return { grid: newGrid, palette: newPalette }
}

// ─── Compact palette ──────────────────────────────────────────────────────────

function compactPalette(
  grid:    Cell[][],
  palette: ColorEntry[],
): { grid: Cell[][]; palette: ColorEntry[] } {
  const counts = new Array<number>(palette.length).fill(0)
  for (const row of grid) for (const cell of row) counts[cell.colorIndex]++

  const keepIndices = palette.map((_, i) => i).filter(i => counts[i] > 0)
  if (keepIndices.length === palette.length) return { grid, palette }

  const remap      = new Map(keepIndices.map((orig, newIdx) => [orig, newIdx]))
  const newPalette = keepIndices.map(i => ({ ...palette[i] }))
  const newGrid    = grid.map(row =>
    row.map(cell => {
      const newIdx = remap.get(cell.colorIndex)!
      return { colorIndex: newIdx, symbol: newPalette[newIdx].symbol ?? '' }
    })
  )
  return { grid: newGrid, palette: newPalette }
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

class CrossStitchStrategy implements StitchStrategy {
  readonly id: StitchStyle = 'crossStitch'
  readonly displayName     = 'Cross Stitch'
  readonly description     = 'Square grid for Aida cloth embroidery'
  readonly traversalOrder  = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle, imageType, maxColors, dithering } = settings
    const isGraphic = imageType === 'graphic'

    const rawGrid = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)

    // 1. Light smooth pass — removes speckle, preserves detail
    const smoothed = smoothGrid(rawGrid, palette)

    // 2. Merge near-duplicate shades (very light threshold ΔE < 8 for photo,
    //    slightly tighter for graphics whose colours are intentionally distinct)
    const mergeThreshold = isGraphic ? 6 : 8
    const { grid: merged, palette: mergedPalette } =
      mergeSimilarColors(smoothed, palette, maxColors, mergeThreshold)

    // 3. Optional light dithering at colour transitions
    const dithered = dithering
      ? applyLightDithering(merged, mergedPalette)
      : merged

    // 4. Compact — remove zero-count palette slots
    const { grid, palette: finalPalette } = compactPalette(dithered, mergedPalette)

    const counts = new Array<number>(finalPalette.length).fill(0)
    for (const row of grid) for (const cell of row) counts[cell.colorIndex]++

    const seen = new Set<number>()
    for (const row of grid) for (const cell of row) seen.add(cell.colorIndex)

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
        colorCount:      seen.size,
        requestedColors: maxColors,
        stitchStyle,
        traversalOrder:  'rowByRow',
        totalStitches:   pixelGrid.width * pixelGrid.height,
        generatedAt:     new Date().toISOString(),
      },
    }
  }
}

export const crossStitchStrategy = new CrossStitchStrategy()
