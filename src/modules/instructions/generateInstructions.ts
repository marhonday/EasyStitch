/**
 * modules/instructions/generateInstructions.ts
 *
 * Generates human-readable row-by-row stitch instructions from PatternData.
 * Pure function — no DOM, no React. Works for all stitch styles.
 *
 * Output format:
 *   Row 1 (start): 3 ■ Dark Cocoa, 5 ● Sage Green, 2 ■ Dark Cocoa
 *   Row 2: 10 ■ Dark Cocoa
 *   ...
 *
 * For C2C: groups are diagonals, not rows.
 * For Tapestry: each row includes a "carry" note for carried colours.
 */

import { PatternData, ColorEntry } from '@/types/pattern'

export interface RowInstruction {
  rowNumber:   number      // 1-based
  label:       string      // "Row 1", "Diagonal 1", etc.
  runs:        RunSegment[]
  totalStitches: number
  isFirstRow:  boolean
  isLastRow:   boolean
  colorChanges: number    // how many yarn switches in this row
  carriedColors?: string[] // for tapestry: colours being carried
}

export interface RunSegment {
  count:      number
  symbol:     string
  colorName:  string
  hex:        string
}

/**
 * Compress a row of cells into run-length encoded segments.
 * "3 ■, 5 ●, 2 ■" instead of listing each cell individually.
 */
function runLengthEncode(
  row:     { colorIndex: number; symbol: string }[],
  palette: ColorEntry[]
): RunSegment[] {
  if (row.length === 0) return []

  const runs: RunSegment[] = []
  let current = row[0]
  let count   = 1

  for (let i = 1; i < row.length; i++) {
    if (row[i].colorIndex === current.colorIndex) {
      count++
    } else {
      const color = palette[current.colorIndex]
      runs.push({
        count,
        symbol:    current.symbol,
        colorName: color?.label ?? `Colour ${current.colorIndex + 1}`,
        hex:       color?.hex ?? '#888',
      })
      current = row[i]
      count   = 1
    }
  }

  // Push final run
  const color = palette[current.colorIndex]
  runs.push({
    count,
    symbol:    current.symbol,
    colorName: color?.label ?? `Colour ${current.colorIndex + 1}`,
    hex:       color?.hex ?? '#888',
  })

  return runs
}

/**
 * Build diagonal groups for C2C traversal.
 * Diagonal d covers cells where row + col === d.
 */
function buildC2CDiagonals(
  grid: { colorIndex: number; symbol: string }[][]
): { colorIndex: number; symbol: string }[][] {
  const height = grid.length
  const width  = grid[0]?.length ?? 0
  const diagonals: { colorIndex: number; symbol: string }[][] = []

  for (let d = 0; d < width + height - 1; d++) {
    const diag: { colorIndex: number; symbol: string }[] = []
    for (let row = 0; row < height; row++) {
      const col = d - row
      if (col >= 0 && col < width) {
        diag.push(grid[row][col])
      }
    }
    diagonals.push(diag)
  }

  return diagonals
}

/**
 * Generate instructions for all rows/diagonals in a pattern.
 * Crochet patterns are worked bottom-to-top, so we reverse row order.
 */
export function generateInstructions(pattern: PatternData): RowInstruction[] {
  const { grid, palette, meta } = pattern
  const isC2C      = meta.traversalOrder === 'diagonal'
  const isTapestry = meta.traversalOrder === 'rowConstrained'

  // For crochet, work bottom-to-top (row 0 is top of image = last row to work)
  const workingGrid = isC2C
    ? buildC2CDiagonals([...grid].reverse())
    : [...grid].reverse()

  const instructions: RowInstruction[] = []

  for (let i = 0; i < workingGrid.length; i++) {
    const row        = workingGrid[i]
    const rowNumber  = i + 1
    const isFirst    = i === 0
    const isLast     = i === workingGrid.length - 1
    const label      = isC2C ? `Diagonal ${rowNumber}` : `Row ${rowNumber}`

    const runs         = runLengthEncode(row, palette)
    const colorChanges = Math.max(0, runs.length - 1)

    // Tapestry: identify carried colours (colours present anywhere in row)
    let carriedColors: string[] | undefined
    if (isTapestry) {
      const rowColorIds = new Set(row.map(c => c.colorIndex))
      if (rowColorIds.size > 1) {
        carriedColors = [...rowColorIds].slice(1).map(idx => {
          const c = palette[idx]
          return c?.label ?? `Colour ${idx + 1}`
        })
      }
    }

    instructions.push({
      rowNumber,
      label,
      runs,
      totalStitches: row.length,
      isFirstRow:    isFirst,
      isLastRow:     isLast,
      colorChanges,
      carriedColors,
    })
  }

  return instructions
}

/**
 * Format a single row as a compact readable string.
 * "Row 1: 5 ■ Dark Cocoa, 3 ● Sage Green, 2 ■ Dark Cocoa (10 sts)"
 */
export function formatRowInstruction(row: RowInstruction): string {
  const runs = row.runs.map(r => `${r.count} ${r.symbol} ${r.colorName}`).join(', ')
  return `${row.label}: ${runs} (${row.totalStitches} sts)`
}
