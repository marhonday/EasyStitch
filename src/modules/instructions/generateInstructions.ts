import { PatternData, ColorEntry } from '@/types/pattern'

export interface RunSegment {
  count:     number
  symbol:    string
  colorName: string
  hex:       string
}

export interface RowInstruction {
  rowNumber:    number
  totalStitches: number
  runs:         RunSegment[]
  isFirstRow:   boolean
  isLastRow:    boolean
  label:        string
  colorChanges: number
  /**
   * Working direction for this row.
   * 'rtl' = stitch right → left (RS rows: 1, 3, 5 …)
   * 'ltr' = stitch left → right (WS rows: 2, 4, 6 …)
   * 'diagonal' = C2C diagonal (no single direction)
   */
  direction: 'rtl' | 'ltr' | 'diagonal'
  /** Which face is toward you while stitching this row. */
  side: 'RS' | 'WS' | null
  /**
   * C2C only — which phase of the blanket this diagonal falls in.
   * 'growing'    = each diagonal adds blocks at both ends (before widest point)
   * 'peak'       = widest diagonal(s) — flat middle of rectangular patterns
   * 'decreasing' = each diagonal loses blocks (after widest point)
   * null         = not a C2C pattern
   */
  phase: 'growing' | 'peak' | 'decreasing' | null
  /** Tapestry only — colours carried (not stitched) across this row */
  carriedColors?: string[]
}

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
  const color = palette[current.colorIndex]
  runs.push({
    count,
    symbol:    current.symbol,
    colorName: color?.label ?? `Colour ${current.colorIndex + 1}`,
    hex:       color?.hex ?? '#888',
  })
  return runs
}

function buildC2CDiagonals(
  grid: { colorIndex: number; symbol: string }[][]
): { colorIndex: number; symbol: string }[][] {
  const height    = grid.length
  const width     = grid[0]?.length ?? 0
  const diagonals: { colorIndex: number; symbol: string }[][] = []
  for (let d = 0; d < width + height - 1; d++) {
    const diag: { colorIndex: number; symbol: string }[] = []
    for (let row = 0; row < height; row++) {
      const col = d - row
      if (col >= 0 && col < width) diag.push(grid[row][col])
    }
    diagonals.push(diag)
  }
  return diagonals
}

export function generateInstructions(pattern: PatternData): RowInstruction[] {
  const { grid, palette, meta } = pattern
  const isC2C = meta.traversalOrder === 'diagonal'

  const workingGrid = isC2C
    ? buildC2CDiagonals([...grid].reverse())
    : [...grid].reverse()

  // Pre-compute C2C diagonal lengths so we can classify each diagonal's phase.
  // A diagonal is 'growing' if it's longer than the previous one,
  // 'decreasing' if shorter, and 'peak' if the same length (flat middle of
  // rectangular blankets, or the single widest diagonal of a square).
  const diagLengths = isC2C ? workingGrid.map(r => r.length) : null

  return workingGrid.map((row, i) => {
    const rowNumber = i + 1
    const isOdd     = rowNumber % 2 !== 0

    // Direction + side:
    // C2C diagonals have no single horizontal direction.
    // Standard row-by-row: odd rows (1,3,5…) are RS → stitch right-to-left;
    // even rows (2,4,6…) are WS → stitch left-to-right.
    const direction: RowInstruction['direction'] = isC2C
      ? 'diagonal'
      : isOdd ? 'rtl' : 'ltr'

    const side: RowInstruction['side'] = isC2C
      ? null
      : isOdd ? 'RS' : 'WS'

    // C2C phase
    let phase: RowInstruction['phase'] = null
    if (isC2C && diagLengths) {
      const cur  = diagLengths[i]
      const prev = i > 0 ? diagLengths[i - 1] : 0
      const next = i < diagLengths.length - 1 ? diagLengths[i + 1] : 0
      if (cur > prev) {
        phase = 'growing'
      } else if (cur < prev) {
        phase = 'decreasing'
      } else {
        // Same length as previous — peak / flat middle
        // Still call it 'decreasing' if the next one is shorter,
        // so the last flat diagonal correctly shows the decreasing turn note.
        phase = next < cur ? 'decreasing' : 'peak'
      }
    }

    // Runs are always stored in visual left-to-right order.
    // For RTL rows the crocheter works them in reverse — callers that need
    // stitching-order can reverse the array using the `direction` field.
    const runs = runLengthEncode(row, palette)

    return {
      rowNumber,
      label:         isC2C ? `Diagonal ${rowNumber}` : `Row ${rowNumber}`,
      runs,
      totalStitches: row.length,
      isFirstRow:    i === 0,
      isLastRow:     i === workingGrid.length - 1,
      colorChanges:  Math.max(0, runs.length - 1),
      direction,
      side,
      phase,
    }
  })
}

/**
 * Format a row in standard crochet notation:
 * Row 1 (10 sts): 3 A, 5 B, 2 A
 */
export function formatRowInstruction(row: RowInstruction): string {
  const runs = row.runs.map(r => `${r.count} ${r.symbol}`).join(', ')
  return `${row.label} (${row.totalStitches} sts): ${runs}`
}
