import { PatternData, ColorEntry, Cell, StitchStyle } from '@/types/pattern'
import { StitchStrategy, StrategyInput } from './types'
import { buildGrid } from '../gridBuilder'
import { hexToColorName } from '../../palette-reduction/colorNames'
import { smoothGrid } from '../smoothGrid'
import { cleanPattern } from '../cleanPattern'
import { rgbToLab, labDistance } from '../../palette-reduction/colorUtils'

/**
 * Knitting colorwork strategies.
 *
 * knittingStranded — Fair Isle / carry-yarn. Stitches nearly square.
 *   cellWidthMultiplier = 1.0. Moderate cleanup.
 *
 * knittingIntarsia — Separate yarn per colour block. Standard stockinette.
 *   cellWidthMultiplier = 1.25 at render time.
 *   Applies aggressive post-processing:
 *     1. Merge similar colours (ΔE < 15) down to maxColors
 *     2. Remove small isolated clusters (min region = 8 cells)
 *   This ensures the key shows the exact chosen colour count with
 *   genuinely distinct colours — no near-duplicate shades.
 */

// ─── Palette merge ────────────────────────────────────────────────────────────

/**
 * Iteratively merge the closest pair of palette colours (by ΔE) until either:
 *   • no pair is closer than `threshold`, OR
 *   • active colour count reaches `targetCount`
 *
 * Grid cells are remapped in place. Returns the compacted palette + new grid.
 */
function mergeSimilarColors(
  grid:        Cell[][],
  palette:     ColorEntry[],
  targetCount: number,
  threshold    = 15,
): { grid: Cell[][]; palette: ColorEntry[] } {
  // Build a mutable "canonical index" map: mapping[i] → active representative
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

    // Merge smaller-count into larger-count
    const keep = counts[bestI] >= counts[bestJ] ? bestI : bestJ
    const drop = counts[bestI] >= counts[bestJ] ? bestJ : bestI
    counts[keep] += counts[drop]
    counts[drop] = 0
    for (let k = 0; k < canonical.length; k++) {
      if (canonical[k] === drop) canonical[k] = keep
    }
    changed = true
  }

  // Compact to a dense new palette
  const activeSet    = activeIndices()
  const reindex      = new Map(activeSet.map((orig, newIdx) => [orig, newIdx]))
  const newPalette   = activeSet.map((orig, i) => ({
    ...palette[orig],
    symbol: palette[orig].symbol,  // keep original symbol assignment; caller re-symbols
  }))

  const newGrid: Cell[][] = grid.map(row =>
    row.map(cell => {
      const newIdx = reindex.get(canonical[cell.colorIndex])!
      return { colorIndex: newIdx, symbol: newPalette[newIdx].symbol }
    })
  )

  return { grid: newGrid, palette: newPalette }
}

// ─── Small cluster removal ────────────────────────────────────────────────────

/**
 * Remove small connected components (< minSize cells) by reassigning each
 * small-cluster cell to its most common same-color or neighbour color.
 * Intarsia-tuned: minSize = 8 (vs cleanPattern's 4).
 */
function removeSmallClusters(
  grid:    Cell[][],
  palette: ColorEntry[],
  minSize  = 8,
): Cell[][] {
  const H = grid.length
  if (H === 0) return grid
  const W = grid[0].length

  // Union-Find
  const n      = W * H
  const parent = Array.from({ length: n }, (_, i) => i)
  const rank   = new Array<number>(n).fill(0)

  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x])
    return parent[x]
  }
  function union(x: number, y: number) {
    const px = find(x), py = find(y)
    if (px === py) return
    if (rank[px] < rank[py]) parent[px] = py
    else if (rank[px] > rank[py]) parent[py] = px
    else { parent[py] = px; rank[px]++ }
  }

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const idx   = r * W + c
      const color = grid[r][c].colorIndex
      if (c + 1 < W && grid[r][c + 1].colorIndex === color) union(idx, idx + 1)
      if (r + 1 < H && grid[r + 1][c].colorIndex === color) union(idx, idx + W)
    }
  }

  const regionSize = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    regionSize.set(root, (regionSize.get(root) ?? 0) + 1)
  }

  const out: Cell[][] = grid.map(row => row.map(cell => ({ ...cell })))

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const idx  = r * W + c
      const root = find(idx)
      if ((regionSize.get(root) ?? 0) < minSize) {
        // Replace with most common non-small neighbour
        const freq = new Map<number, number>()
        const nbrs: [number, number][] = [
          [r-1,c],[r+1,c],[r,c-1],[r,c+1],
          [r-1,c-1],[r-1,c+1],[r+1,c-1],[r+1,c+1],
        ]
        for (const [nr, nc] of nbrs) {
          if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue
          const ni  = nr * W + nc
          const nr2 = find(ni)
          if ((regionSize.get(nr2) ?? 0) >= minSize) {
            const ci = grid[nr][nc].colorIndex
            freq.set(ci, (freq.get(ci) ?? 0) + 1)
          }
        }
        if (freq.size > 0) {
          let bestColor = grid[r][c].colorIndex, bestCount = 0
          for (const [ci, ct] of freq) { if (ct > bestCount) { bestCount = ct; bestColor = ci } }
          out[r][c] = { colorIndex: bestColor, symbol: palette[bestColor]?.symbol ?? '' }
        }
      }
    }
  }

  return out
}

// ─── Thicken dark areas ───────────────────────────────────────────────────────

/**
 * Expand dark-colour regions by 1 cell where they have ≥ `minNeighbors`
 * dark neighbours. Thickens outlines and fills hairline gaps in bold shapes.
 * Only used for stranded (Fair Isle) where bold graphic readability matters.
 */
function thickenDarkAreas(
  grid:         Cell[][],
  palette:      ColorEntry[],
  minNeighbors: number = 2,
): Cell[][] {
  const H = grid.length
  if (H === 0) return grid
  const W = grid[0].length

  // Identify "dark" colour indices: bottom 40% by perceived lightness
  const lightnessValues = palette.map((e, i) => ({
    idx: i,
    L:   0.299 * e.r + 0.587 * e.g + 0.114 * e.b,
  }))
  lightnessValues.sort((a, b) => a.L - b.L)
  const darkCutoff = Math.max(1, Math.ceil(palette.length * 0.4))
  const darkSet    = new Set(lightnessValues.slice(0, darkCutoff).map(v => v.idx))

  const out: Cell[][] = grid.map(row => row.map(cell => ({ ...cell })))

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (darkSet.has(grid[r][c].colorIndex)) continue  // already dark
      // Count dark 4-neighbours
      let darkCount = 0
      const nbrs: [number, number][] = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
      let dominantDark = -1, dominantCount = 0
      const darkFreq = new Map<number, number>()
      for (const [nr, nc] of nbrs) {
        if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue
        const ci = grid[nr][nc].colorIndex
        if (darkSet.has(ci)) {
          darkCount++
          darkFreq.set(ci, (darkFreq.get(ci) ?? 0) + 1)
        }
      }
      if (darkCount >= minNeighbors) {
        for (const [ci, ct] of darkFreq) {
          if (ct > dominantCount) { dominantCount = ct; dominantDark = ci }
        }
        if (dominantDark >= 0) {
          out[r][c] = { colorIndex: dominantDark, symbol: palette[dominantDark].symbol ?? '' }
        }
      }
    }
  }
  return out
}

// ─── Compact palette ──────────────────────────────────────────────────────────

/**
 * Remove any palette entries with zero cells in the grid, remap indices.
 * This is the fix for the colour-key bug: after smoothing/merging/cleaning,
 * some palette slots become empty but stay in the key.
 */
function compactPalette(
  grid:    Cell[][],
  palette: ColorEntry[],
): { grid: Cell[][]; palette: ColorEntry[] } {
  const counts = new Array<number>(palette.length).fill(0)
  for (const row of grid) for (const cell of row) counts[cell.colorIndex]++

  const keepIndices = palette
    .map((_, i) => i)
    .filter(i => counts[i] > 0)

  if (keepIndices.length === palette.length) return { grid, palette }  // nothing to remove

  const remap       = new Map(keepIndices.map((orig, newIdx) => [orig, newIdx]))
  const newPalette  = keepIndices.map(i => ({ ...palette[i] }))
  const newGrid     = grid.map(row =>
    row.map(cell => {
      const newIdx = remap.get(cell.colorIndex)!
      return { colorIndex: newIdx, symbol: newPalette[newIdx].symbol ?? '' }
    })
  )
  return { grid: newGrid, palette: newPalette }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Strategy ─────────────────────────────────────────────────────────────────

class KnittingStrategy implements StitchStrategy {
  constructor(
    public readonly id:          StitchStyle,
    public readonly displayName: string,
    public readonly description: string,
  ) {}

  readonly traversalOrder = 'rowByRow' as const

  execute(input: StrategyInput): PatternData {
    const { palette, colorMap, settings, pixelGrid } = input
    const { stitchStyle, imageType, maxColors } = settings
    const isIntarsia = stitchStyle === 'knittingIntarsia'
    const isGraphic  = imageType === 'graphic'

    let rawGrid = buildGrid(colorMap, palette, pixelGrid.width, pixelGrid.height)

    if (isIntarsia) {
      // ── Intarsia pipeline ────────────────────────────────────────────────
      // 1. Smooth first (removes single-pixel speckle before component work)
      rawGrid = smoothGrid(rawGrid, palette)

      // 2. Merge perceptually similar colours — enforces the chosen count
      //    threshold = 15 ΔE so genuinely similar shades collapse.
      //    For graphics use a tighter threshold (colours are intentionally distinct).
      const mergeThreshold = isGraphic ? 10 : 15
      const { grid: merged, palette: mergedPalette } =
        mergeSimilarColors(rawGrid, palette, maxColors, mergeThreshold)

      // 3. Remove tiny isolated clusters (min region = 8 for intarsia)
      const cleaned = removeSmallClusters(merged, mergedPalette, 8)

      // 4. Compact — remove zero-count palette slots (fixes colour key bug)
      const { grid: compacted, palette: compactedPalette } = compactPalette(cleaned, mergedPalette)

      const counts = countFromGrid(compacted, compactedPalette.length)
      const annotatedPalette: ColorEntry[] = compactedPalette.map((entry, i) => ({
        ...entry,
        label:       entry.label ?? hexToColorName(entry.hex),
        stitchCount: counts[i],
      }))

      return {
        grid: compacted,
        palette: annotatedPalette,
        meta: {
          width:          pixelGrid.width,
          height:         pixelGrid.height,
          colorCount:     activeColorCount(compacted),
          stitchStyle,
          traversalOrder: this.traversalOrder,
          totalStitches:  pixelGrid.width * pixelGrid.height,
          generatedAt:    new Date().toISOString(),
        },
      }
    }

    // ── Stranded colorwork pipeline ───────────────────────────────────────────
    // Goal: bold, readable shapes — not photo detail.
    // 1. Merge similar colours (ΔE < 18) to enforce the chosen count
    const mergeThreshold = isGraphic ? 12 : 18
    const { grid: merged, palette: mergedPalette } =
      mergeSimilarColors(rawGrid, palette, maxColors, mergeThreshold)

    // 2. Smooth always (removes single-pixel noise before shape work)
    const smoothed = smoothGrid(merged, mergedPalette)

    // 3. Thicken dark areas — keeps outlines bold and readable
    const thickened = thickenDarkAreas(smoothed, mergedPalette, 2)

    // 4. Remove stray small clusters (min region = 6 — lighter than intarsia's 8)
    const cleaned = removeSmallClusters(thickened, mergedPalette, 6)

    // 5. Compact — remove zero-count palette slots (fixes colour key bug)
    const { grid, palette: finalPalette } = compactPalette(cleaned, mergedPalette)

    const counts = countFromGrid(grid, finalPalette.length)
    const annotatedPalette: ColorEntry[] = finalPalette.map((entry, i) => ({
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

export const knittingStrandedStrategy = new KnittingStrategy(
  'knittingStranded',
  'Stranded / Fair Isle',
  'Carry both yarns across every row',
)

export const knittingIntarsiaStrategy = new KnittingStrategy(
  'knittingIntarsia',
  'Intarsia / Standard',
  'Separate yarn sections per colour area',
)

/** Width multiplier for rendering: how much wider a stitch is than it is tall */
export const KNITTING_CELL_RATIO: Record<'knittingStranded' | 'knittingIntarsia', number> = {
  knittingStranded: 1.0,    // two-yarn tension squares the stitch
  knittingIntarsia: 1.25,   // standard stockinette — stitches ~25% wider than tall
}
