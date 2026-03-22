/**
 * cleanPattern.ts
 *
 * Post-generation pass that identifies and removes noise colors from the grid.
 *
 * A "noise color" must satisfy ALL THREE conditions to be removed:
 *   1. Never forms a connected region of MIN_REGION_SIZE or more cells
 *   2. Appears in less than NOISE_CELL_THRESHOLD of total cells
 *   3. Is NOT spatially distributed across the grid
 *
 * Condition 3 is the key addition: a repeating pattern (stripes, spots, plaid,
 * fur texture, floral fabric) has many tiny disconnected regions spread across
 * most rows and columns — identical signature to noise on conditions 1 & 2 alone.
 * But real patterns appear in a high fraction of rows. True noise clusters near
 * color boundaries and only touches a handful of rows.
 *
 * If a color appears in more than PATTERN_ROW_COVERAGE of all rows AND more than
 * PATTERN_COL_COVERAGE of all columns, it is treated as intentional detail and
 * never removed, regardless of region size or cell count.
 *
 * Uses union-find (disjoint set) for connected component analysis.
 * Safe on XL grids (80×100 = 8,000 cells) — O(n α(n)) effectively linear.
 */

import { Cell, ColorEntry } from '@/types/pattern'

// A color must have at least one connected region this large to be kept
const MIN_REGION_SIZE = 4
// A color appearing in less than this fraction of cells is a noise candidate
const NOISE_CELL_THRESHOLD = 0.03
// If a color appears in this fraction of rows AND columns, it's a real pattern
const PATTERN_ROW_COVERAGE = 0.40
const PATTERN_COL_COVERAGE = 0.40

export interface CleanResult {
  grid:          Cell[][]
  removedColors: number[]   // palette indices that were identified as noise
  mergedCount:   number     // total cells reassigned
}

// ─── Union-Find ───────────────────────────────────────────────────────────────

function makeUnionFind(n: number) {
  const parent = Array.from({ length: n }, (_, i) => i)
  const rank   = new Array(n).fill(0)

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

  return { find, union }
}

/**
 * Find the largest connected region size for each palette color.
 * Returns a Map: colorIndex → largest region size
 */
function largestRegionPerColor(
  grid:   Cell[][],
  width:  number,
  height: number
): Map<number, number> {
  const n  = width * height
  const uf = makeUnionFind(n)

  // Union adjacent cells of the same color
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx   = row * width + col
      const color = grid[row][col].colorIndex

      // Check right neighbor
      if (col + 1 < width && grid[row][col + 1].colorIndex === color) {
        uf.union(idx, idx + 1)
      }
      // Check bottom neighbor
      if (row + 1 < height && grid[row + 1][col].colorIndex === color) {
        uf.union(idx, idx + width)
      }
    }
  }

  // Count region sizes per root
  const regionSize = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    const root = uf.find(i)
    regionSize.set(root, (regionSize.get(root) ?? 0) + 1)
  }

  // Find the largest region per color
  const largest = new Map<number, number>()
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx        = row * width + col
      const color      = grid[row][col].colorIndex
      const root       = uf.find(idx)
      const size       = regionSize.get(root) ?? 0
      const currentMax = largest.get(color) ?? 0
      if (size > currentMax) largest.set(color, size)
    }
  }

  return largest
}

/**
 * For each color, compute what fraction of rows and columns it appears in.
 * Returns a Map: colorIndex → { rowCoverage, colCoverage }
 *
 * A color with rowCoverage = 0.8 appears in 80% of all rows — almost certainly
 * a repeating pattern (stripes, spots, texture) rather than noise.
 */
function spatialCoveragePerColor(
  grid:   Cell[][],
  width:  number,
  height: number
): Map<number, { rowCoverage: number; colCoverage: number }> {
  const rowSets = new Map<number, Set<number>>()  // colorIdx → set of rows it appears in
  const colSets = new Map<number, Set<number>>()  // colorIdx → set of cols it appears in

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const c = grid[row][col].colorIndex
      if (!rowSets.has(c)) { rowSets.set(c, new Set()); colSets.set(c, new Set()) }
      rowSets.get(c)!.add(row)
      colSets.get(c)!.add(col)
    }
  }

  const result = new Map<number, { rowCoverage: number; colCoverage: number }>()
  for (const [c, rows] of rowSets) {
    result.set(c, {
      rowCoverage: rows.size / height,
      colCoverage: (colSets.get(c)?.size ?? 0) / width,
    })
  }
  return result
}

/**
 * For each noise cell, find the most common non-noise neighbor color.
 * Falls back to the most common non-noise color in the whole grid.
 */
function bestReplacementColor(
  grid:        Cell[][],
  row:         number,
  col:         number,
  noiseColors: Set<number>,
  fallback:    number,
  width:       number,
  height:      number
): number {
  const neighborFreq = new Map<number, number>()

  const neighbors = [
    [row - 1, col], [row + 1, col],
    [row, col - 1], [row, col + 1],
    [row - 1, col - 1], [row - 1, col + 1],
    [row + 1, col - 1], [row + 1, col + 1],
  ]

  for (const [nr, nc] of neighbors) {
    if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue
    const c = grid[nr][nc].colorIndex
    if (!noiseColors.has(c)) {
      neighborFreq.set(c, (neighborFreq.get(c) ?? 0) + 1)
    }
  }

  if (neighborFreq.size === 0) return fallback

  let bestColor = fallback
  let bestCount = 0
  for (const [color, count] of neighborFreq) {
    if (count > bestCount) { bestCount = count; bestColor = color }
  }
  return bestColor
}

/**
 * Main entry point — clean noise colors from the pattern grid.
 */
export function cleanPattern(
  grid:    Cell[][],
  palette: ColorEntry[]
): CleanResult {
  const height = grid.length
  if (height === 0) return { grid, removedColors: [], mergedCount: 0 }
  const width  = grid[0].length
  const total  = width * height

  // Count cells per color
  const cellCount = new Map<number, number>()
  for (const row of grid) {
    for (const cell of row) {
      cellCount.set(cell.colorIndex, (cellCount.get(cell.colorIndex) ?? 0) + 1)
    }
  }

  // Find largest connected region per color
  const largest  = largestRegionPerColor(grid, width, height)
  const coverage = spatialCoveragePerColor(grid, width, height)

  // Identify noise colors — must fail ALL three tests to be removed
  const noiseColors = new Set<number>()
  for (const [colorIdx, count] of cellCount) {
    const largestRegion = largest.get(colorIdx) ?? 0
    const cellFraction  = count / total
    const cov           = coverage.get(colorIdx) ?? { rowCoverage: 0, colCoverage: 0 }

    const hasNoRegion      = largestRegion < MIN_REGION_SIZE
    const isRare           = cellFraction < NOISE_CELL_THRESHOLD
    // A color spread across many rows AND columns is a real repeating pattern
    const isDistributed    = cov.rowCoverage >= PATTERN_ROW_COVERAGE
                          && cov.colCoverage >= PATTERN_COL_COVERAGE

    if (hasNoRegion && isRare && !isDistributed) {
      noiseColors.add(colorIdx)
    }
  }

  // Nothing to clean
  if (noiseColors.size === 0) {
    return { grid, removedColors: [], mergedCount: 0 }
  }

  // Find the most common non-noise color as global fallback
  let fallback = 0
  let fallbackCount = 0
  for (const [colorIdx, count] of cellCount) {
    if (!noiseColors.has(colorIdx) && count > fallbackCount) {
      fallbackCount = count
      fallback      = colorIdx
    }
  }

  // Build cleaned grid — reassign noise cells to best neighbor color
  let mergedCount = 0
  const out: Cell[][] = grid.map((row, r) =>
    row.map((cell, c) => {
      if (!noiseColors.has(cell.colorIndex)) return cell

      const replacement = bestReplacementColor(
        grid, r, c, noiseColors, fallback, width, height
      )
      mergedCount++
      return {
        colorIndex: replacement,
        symbol:     palette[replacement]?.symbol ?? cell.symbol,
      }
    })
  )

  return {
    grid:          out,
    removedColors: [...noiseColors],
    mergedCount,
  }
}
