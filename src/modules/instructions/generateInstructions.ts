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

  return workingGrid.map((row, i) => {
    const rowNumber = i + 1
    const runs      = runLengthEncode(row, palette)
    return {
      rowNumber,
      label:         isC2C ? `Diagonal ${rowNumber}` : `Row ${rowNumber}`,
      runs,
      totalStitches: row.length,
      isFirstRow:    i === 0,
      isLastRow:     i === workingGrid.length - 1,
      colorChanges:  Math.max(0, runs.length - 1),
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
