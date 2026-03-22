/**
 * removeGrid.ts
 *
 * Detects and removes grid line overlays from pattern images.
 *
 * Grid lines are identified by:
 * 1. Near-achromatic color (low saturation — grey or black)
 * 2. Forming continuous straight lines across most of the image width/height
 * 3. Evenly spaced (regular period)
 *
 * Once detected, grid pixels are replaced by interpolating from
 * the nearest non-grid neighbors — effectively erasing the lines
 * and letting the underlying pattern show through.
 *
 * This runs as a pre-processing step before quantization, on the
 * full-resolution image for graphic mode or the resized grid for photo mode.
 */

/**
 * Detect whether a row or column is likely a grid line.
 * A grid line row/column has:
 * - High fraction of near-grey pixels (low chroma)
 * - Those grey pixels are consistent in lightness
 */
function isGridLine(
  data:      Uint8ClampedArray,
  width:     number,
  height:    number,
  index:     number,
  direction: 'row' | 'col'
): boolean {
  const MIN_GREY_FRACTION = 0.70  // 70% of pixels must be near-grey
  const MAX_CHROMA        = 30    // max RGB channel spread to be "grey"
  const MAX_LIGHTNESS     = 210   // grid lines are dark-to-medium grey, not white

  let greyCount = 0
  let total     = 0

  if (direction === 'row') {
    for (let x = 0; x < width; x++) {
      const i = (index * width + x) * 4
      if (data[i + 3] < 128) continue
      total++
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const maxC = Math.max(r, g, b), minC = Math.min(r, g, b)
      const lum  = (r * 299 + g * 587 + b * 114) / 1000
      if (maxC - minC < MAX_CHROMA && lum < MAX_LIGHTNESS) greyCount++
    }
  } else {
    for (let y = 0; y < height; y++) {
      const i = (y * width + index) * 4
      if (data[i + 3] < 128) continue
      total++
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const maxC = Math.max(r, g, b), minC = Math.min(r, g, b)
      const lum  = (r * 299 + g * 587 + b * 114) / 1000
      if (maxC - minC < MAX_CHROMA && lum < MAX_LIGHTNESS) greyCount++
    }
  }

  if (total === 0) return false
  return greyCount / total >= MIN_GREY_FRACTION
}

/**
 * Find all grid line positions (rows or columns) in an image.
 * Also verifies they are evenly spaced (regular period) — random
 * grey lines don't count, only regular grids.
 */
function findGridLines(
  data:      Uint8ClampedArray,
  width:     number,
  height:    number,
  direction: 'row' | 'col'
): number[] {
  const count = direction === 'row' ? height : width
  const lines: number[] = []

  for (let i = 0; i < count; i++) {
    if (isGridLine(data, width, height, i, direction)) {
      lines.push(i)
    }
  }

  if (lines.length < 3) return []  // need at least 3 to establish a pattern

  // Check for regular spacing — compute gaps between lines
  const gaps: number[] = []
  for (let i = 1; i < lines.length; i++) gaps.push(lines[i] - lines[i - 1])

  // Filter out consecutive lines (multi-pixel wide grid lines)
  const nonConsecutive = gaps.filter(g => g > 1)
  if (nonConsecutive.length < 2) return []

  // Check if gaps are consistent (within 2px of each other)
  const minGap = Math.min(...nonConsecutive)
  const maxGap = Math.max(...nonConsecutive)
  if (maxGap - minGap > 2) return []  // gaps aren't regular — not a grid

  return lines
}

/**
 * Replace grid line pixels with interpolated neighbor colors.
 * For each grid pixel, find the nearest non-grid neighbor in
 * the perpendicular direction and use its color.
 */
function removeGridLines(
  data:       Uint8ClampedArray,
  width:      number,
  height:     number,
  rowLines:   Set<number>,
  colLines:   Set<number>
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!rowLines.has(y) && !colLines.has(x)) continue

      // Find nearest non-grid neighbor
      let bestR = 255, bestG = 255, bestB = 255
      let found = false

      // Search outward from this pixel in all 4 directions
      for (let dist = 1; dist < Math.max(width, height) && !found; dist++) {
        const candidates = [
          [y - dist, x], [y + dist, x],
          [y, x - dist], [y, x + dist],
        ]
        for (const [ny, nx] of candidates) {
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue
          if (rowLines.has(ny) || colLines.has(nx)) continue
          const i = (ny * width + nx) * 4
          if (data[i + 3] < 128) continue
          bestR = data[i]; bestG = data[i + 1]; bestB = data[i + 2]
          found = true
          break
        }
        if (found) break
      }

      const i = (y * width + x) * 4
      out[i] = bestR; out[i + 1] = bestG; out[i + 2] = bestB; out[i + 3] = data[i + 3]
    }
  }

  return out
}

export interface GridRemovalResult {
  data:        Uint8ClampedArray
  width:       number
  height:      number
  gridRemoved: boolean
  rowCount:    number
  colCount:    number
}

/**
 * Main entry point. Detects and removes grid overlay if present.
 * Returns the cleaned pixel data and metadata about what was removed.
 */
export function removeGridOverlay(
  data:   Uint8ClampedArray,
  width:  number,
  height: number
): GridRemovalResult {
  const rowLines = new Set(findGridLines(data, width, height, 'row'))
  const colLines = new Set(findGridLines(data, width, height, 'col'))

  // Only remove if BOTH horizontal and vertical lines found — that's a grid
  // Single-direction lines could be intentional design elements
  if (rowLines.size === 0 || colLines.size === 0) {
    return { data, width, height, gridRemoved: false, rowCount: 0, colCount: 0 }
  }

  const cleaned = removeGridLines(data, width, height, rowLines, colLines)
  return {
    data:        cleaned,
    width,
    height,
    gridRemoved: true,
    rowCount:    rowLines.size,
    colCount:    colLines.size,
  }
}
