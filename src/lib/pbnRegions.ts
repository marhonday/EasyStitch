import { PatternData } from '@/types/pattern'

export interface PbnRegion {
  id:         number
  colorIndex: number
  cells:      [number, number][]   // [row, col]
  labelRow:   number               // best row to place the number
  labelCol:   number               // best col to place the number
}

/**
 * Finds all connected regions of same-coloured cells using BFS flood-fill.
 * Adjacent cells with the same colorIndex that are 4-connected form one region.
 */
export function findRegions(pattern: PatternData): PbnRegion[] {
  const { grid } = pattern
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  if (rows === 0 || cols === 0) return []

  const visited = new Int32Array(rows * cols).fill(-1)
  const regions: PbnRegion[] = []
  let regionId = 0

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r * cols + c] !== -1) continue

      const colorIndex = grid[r][c].colorIndex
      const cells: [number, number][] = []

      // Index-based BFS (avoids O(n) shift on large grids)
      const queue: [number, number][] = [[r, c]]
      visited[r * cols + c] = regionId
      let head = 0

      while (head < queue.length) {
        const [cr, cc] = queue[head++]
        cells.push([cr, cc])

        // 4-connected neighbours
        if (cr > 0 && visited[(cr - 1) * cols + cc] === -1 && grid[cr - 1][cc].colorIndex === colorIndex) {
          visited[(cr - 1) * cols + cc] = regionId
          queue.push([cr - 1, cc])
        }
        if (cr < rows - 1 && visited[(cr + 1) * cols + cc] === -1 && grid[cr + 1][cc].colorIndex === colorIndex) {
          visited[(cr + 1) * cols + cc] = regionId
          queue.push([cr + 1, cc])
        }
        if (cc > 0 && visited[cr * cols + cc - 1] === -1 && grid[cr][cc - 1].colorIndex === colorIndex) {
          visited[cr * cols + cc - 1] = regionId
          queue.push([cr, cc - 1])
        }
        if (cc < cols - 1 && visited[cr * cols + cc + 1] === -1 && grid[cr][cc + 1].colorIndex === colorIndex) {
          visited[cr * cols + cc + 1] = regionId
          queue.push([cr, cc + 1])
        }
      }

      // Centroid → find cell inside region closest to it
      let sumR = 0, sumC = 0
      for (const [cr, cc] of cells) { sumR += cr; sumC += cc }
      const centR = sumR / cells.length
      const centC = sumC / cells.length

      let bestCell = cells[0]
      let bestDist = Infinity
      for (const [cr, cc] of cells) {
        const d = (cr - centR) ** 2 + (cc - centC) ** 2
        if (d < bestDist) { bestDist = d; bestCell = [cr, cc] }
      }

      regions.push({
        id:         regionId,
        colorIndex,
        cells,
        labelRow:   bestCell[0],
        labelCol:   bestCell[1],
      })
      regionId++
    }
  }

  return regions
}

/**
 * Draws a region-based PBN canvas onto the provided HTMLCanvasElement.
 *
 * preview mode — cells filled with actual colour, subtle borders, white numbers with dark outline
 * print mode   — cells white, bold dark borders, dark numbers — ready to print and paint from
 */
export function drawPbnRegionCanvas(
  canvas:  HTMLCanvasElement,
  pattern: PatternData,
  mode:    'preview' | 'print',
  cellSize: number,
) {
  const { grid, palette } = pattern
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  if (rows === 0 || cols === 0) return

  canvas.width  = cols * cellSize
  canvas.height = rows * cellSize

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // ── 1. Fill cells ──────────────────────────────────────────────────────────
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = mode === 'preview'
        ? palette[grid[r][c].colorIndex].hex
        : '#ffffff'
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
    }
  }

  // ── 2. Draw borders only where colours meet ────────────────────────────────
  const borderColor = mode === 'preview' ? 'rgba(0,0,0,0.35)' : '#2a2a2a'
  const borderW     = mode === 'preview' ? 0.75 : 1.2
  ctx.strokeStyle = borderColor
  ctx.lineWidth   = borderW

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ci = grid[r][c].colorIndex
      // Right edge
      if (c + 1 < cols && grid[r][c + 1].colorIndex !== ci) {
        ctx.beginPath()
        ctx.moveTo((c + 1) * cellSize, r * cellSize)
        ctx.lineTo((c + 1) * cellSize, (r + 1) * cellSize)
        ctx.stroke()
      }
      // Bottom edge
      if (r + 1 < rows && grid[r + 1][c].colorIndex !== ci) {
        ctx.beginPath()
        ctx.moveTo(c * cellSize, (r + 1) * cellSize)
        ctx.lineTo((c + 1) * cellSize, (r + 1) * cellSize)
        ctx.stroke()
      }
    }
  }

  // Canvas outer border
  ctx.strokeStyle = mode === 'preview' ? 'rgba(0,0,0,0.5)' : '#111111'
  ctx.lineWidth   = mode === 'preview' ? 1 : 1.5
  ctx.strokeRect(0, 0, canvas.width, canvas.height)

  // ── 3. Place region numbers ────────────────────────────────────────────────
  const regions = findRegions(pattern)
  const MIN_CELLS = 3  // skip number for tiny regions

  const fontSize = Math.max(5, Math.min(Math.floor(cellSize * 0.65), 13))
  ctx.font          = `bold ${fontSize}px sans-serif`
  ctx.textAlign     = 'center'
  ctx.textBaseline  = 'middle'

  for (const region of regions) {
    if (region.cells.length < MIN_CELLS) continue

    const number = String(region.colorIndex + 1)
    const x = region.labelCol * cellSize + cellSize / 2
    const y = region.labelRow * cellSize + cellSize / 2

    if (mode === 'preview') {
      // White text + dark outline so it reads over any colour
      ctx.strokeStyle = 'rgba(0,0,0,0.75)'
      ctx.lineWidth   = 2.5
      ctx.strokeText(number, x, y)
      ctx.fillStyle   = 'white'
      ctx.fillText(number, x, y)
    } else {
      ctx.fillStyle = '#1a1a1a'
      ctx.fillText(number, x, y)
    }
  }
}
