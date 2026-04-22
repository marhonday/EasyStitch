// Browser-only: uses HTMLCanvasElement and Image
import type { TrackedPalette } from './patternTracker'

export type DetectionStatus = 'success' | 'manual-needed' | 'failed'

export interface GridDetectionResult {
  status:         DetectionStatus
  colorMap?:      number[][]
  palette?:       TrackedPalette[]
  width?:         number
  height?:        number
  gridLineColor?: string
  tip?:           string
}

// ── Canvas loader ────────────────────────────────────────────────────────────

async function loadCanvas(dataUrl: string, maxDim = 800): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width  = Math.round(img.width  * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      resolve(c)
    }
    img.onerror = () => reject(new Error('load-failed'))
    img.src = dataUrl
  })
}

// ── Pixel helpers ────────────────────────────────────────────────────────────

function delta(p: Uint8ClampedArray, i: number, j: number): number {
  return Math.abs(p[i] - p[j]) + Math.abs(p[i+1] - p[j+1]) + Math.abs(p[i+2] - p[j+2])
}

function sampleHex(p: Uint8ClampedArray, cx: number, cy: number, W: number, H: number): string {
  let r = 0, g = 0, b = 0, n = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = Math.max(0, Math.min(W - 1, cx + dx))
      const y = Math.max(0, Math.min(H - 1, cy + dy))
      const i = (y * W + x) * 4
      r += p[i]; g += p[i+1]; b += p[i+2]; n++
    }
  }
  const rr = Math.round(r/n), gg = Math.round(g/n), bb = Math.round(b/n)
  return `#${rr.toString(16).padStart(2,'0')}${gg.toString(16).padStart(2,'0')}${bb.toString(16).padStart(2,'0')}`
}

// ── Transition detection ─────────────────────────────────────────────────────

function rowTransitions(p: Uint8ClampedArray, y: number, W: number, thr = 28): number[] {
  const t: number[] = []
  for (let x = 1; x < W; x++) {
    if (delta(p, (y * W + x - 1) * 4, (y * W + x) * 4) > thr) t.push(x)
  }
  return t
}

function colTransitions(p: Uint8ClampedArray, x: number, H: number, W: number, thr = 28): number[] {
  const t: number[] = []
  for (let y = 1; y < H; y++) {
    if (delta(p, ((y-1) * W + x) * 4, (y * W + x) * 4) > thr) t.push(y)
  }
  return t
}

// ── Period finder ────────────────────────────────────────────────────────────

interface PeriodResult { period: number; offset: number; confidence: number }

function findPeriod(lines: number[][], maxDim: number): PeriodResult | null {
  const gaps: number[] = []
  for (const ts of lines) {
    for (let i = 1; i < ts.length; i++) gaps.push(ts[i] - ts[i-1])
  }
  if (gaps.length < 8) return null

  const counts = new Map<number, number>()
  for (const g of gaps) {
    const k = Math.round(g / 2) * 2
    if (k >= 4 && k <= maxDim / 2) counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  if (counts.size === 0) return null

  let best = 0, period = 0
  for (const [k, c] of counts) if (c > best) { best = c; period = k }
  if (period < 4) return null

  const matching = gaps.filter(g => Math.abs(g - period) <= 2).length
  const confidence = matching / gaps.length
  if (confidence < 0.22) return null

  // Estimate grid start offset
  const offsets: number[] = []
  for (const ts of lines) if (ts.length > 0) offsets.push(ts[0] % period)
  const oc = new Map<number, number>()
  for (const o of offsets) oc.set(o, (oc.get(o) ?? 0) + 1)
  let bestO = 0, offset = 0
  for (const [o, c] of oc) if (c > bestO) { bestO = c; offset = o }

  return { period, offset, confidence }
}

// ── Palette builder ──────────────────────────────────────────────────────────

const SYMS = ['■','●','▲','◆','★','✿','❤','◉','⬟','⬡','⊕','⊗','▼','◀','▶','▽','△','○','□','◇','☆','✦','✧','✩','✪']

function hexDist(h1: string, h2: string): number {
  const r1=parseInt(h1.slice(1,3),16), g1=parseInt(h1.slice(3,5),16), b1=parseInt(h1.slice(5,7),16)
  const r2=parseInt(h2.slice(1,3),16), g2=parseInt(h2.slice(3,5),16), b2=parseInt(h2.slice(5,7),16)
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
}

function buildPalette(hexGrid: string[][]): { palette: TrackedPalette[]; colorMap: number[][] } {
  const reps: string[] = []
  const colorMap = hexGrid.map(row => row.map(hex => {
    for (let i = 0; i < reps.length; i++) {
      if (hexDist(hex, reps[i]) < 38) return i
    }
    reps.push(hex)
    return reps.length - 1
  }))
  const palette: TrackedPalette[] = reps.map((hex, i) => ({ hex, symbol: SYMS[i % SYMS.length] }))
  return { palette, colorMap }
}

// ── Grid line colour ─────────────────────────────────────────────────────────

function detectLineColor(
  p: Uint8ClampedArray, W: number, H: number,
  wR: PeriodResult, hR: PeriodResult,
): string | undefined {
  const hexes: string[] = []
  for (let k = 1; k * wR.period + wR.offset < W - 1; k++) {
    const x = Math.round(wR.offset + k * wR.period)
    if (x < 0 || x >= W) break
    for (let row = 0; row < Math.min(8, Math.floor(H / hR.period)); row++) {
      const y = Math.round(hR.offset + row * hR.period + hR.period * 0.3)
      if (y >= H) break
      hexes.push(sampleHex(p, x, y, W, H))
    }
  }
  if (hexes.length < 3) return undefined
  const cnt = new Map<string, number>()
  for (const h of hexes) cnt.set(h, (cnt.get(h) ?? 0) + 1)
  let best = 0, color = ''
  for (const [h, c] of cnt) if (c > best) { best = c; color = h }
  return color || undefined
}

// ── Auto-detect ──────────────────────────────────────────────────────────────

export async function detectGrid(dataUrl: string): Promise<GridDetectionResult> {
  let canvas: HTMLCanvasElement
  try { canvas = await loadCanvas(dataUrl) }
  catch { return { status: 'failed', tip: 'Could not load image. Try a different file format.' } }

  const { width: W, height: H } = canvas
  const p = canvas.getContext('2d')!.getImageData(0, 0, W, H).data

  if (W < 60 || H < 60) {
    return { status: 'failed', tip: 'Image too small — use at least 200×200 px for reliable detection.' }
  }

  // Sample 20 evenly-spaced rows → find cell width
  const rowLines: number[][] = []
  for (let i = 1; i <= 20; i++) rowLines.push(rowTransitions(p, Math.round((i / 21) * H), W))

  // Sample 20 evenly-spaced columns → find cell height
  const colLines: number[][] = []
  for (let i = 1; i <= 20; i++) colLines.push(colTransitions(p, Math.round((i / 21) * W), H, W))

  const wR = findPeriod(rowLines, W)
  const hR = findPeriod(colLines, H)

  if (!wR || !hR) {
    return {
      status: 'manual-needed',
      tip:    'No regular grid detected automatically. You can enter your grid dimensions manually below — or re-upload a cleaner screenshot/scan with visible grid lines.',
    }
  }

  const numCols = Math.floor((W - wR.offset) / wR.period)
  const numRows = Math.floor((H - hR.offset) / hR.period)

  if (numCols < 3 || numRows < 3) {
    return { status: 'failed', tip: 'Too few cells detected. Crop tightly around the pattern grid and re-upload.' }
  }
  if (numCols > 300 || numRows > 300) {
    return {
      status: 'manual-needed',
      tip:    'Pattern is very large. Enter your stitch dimensions manually for the best result.',
    }
  }

  // Extract cell colours
  const hexGrid: string[][] = []
  for (let row = 0; row < numRows; row++) {
    const r: string[] = []
    for (let col = 0; col < numCols; col++) {
      const cx = Math.round(wR.offset + col * wR.period + wR.period / 2)
      const cy = Math.round(hR.offset + row * hR.period + hR.period / 2)
      r.push(sampleHex(p, cx, cy, W, H))
    }
    hexGrid.push(r)
  }

  const { palette, colorMap } = buildPalette(hexGrid)

  if (palette.length > 40) {
    return {
      status: 'manual-needed',
      tip:    `Too many colours detected (${palette.length}) — your image may have compression artefacts or gradients. Try a crisper screenshot or scan.`,
    }
  }

  const confidence = Math.min(wR.confidence, hR.confidence)
  const gridLineColor = detectLineColor(p, W, H, wR, hR)

  let tip: string | undefined
  if (confidence < 0.5) {
    tip = gridLineColor
      ? `Low grid confidence. Your grid lines appear to be ${gridLineColor} — re-draw them in a stronger contrasting colour (e.g. solid black) and re-upload for cleaner detection.`
      : 'Low grid confidence. Adding high-contrast grid lines to your pattern image before uploading will improve detection significantly.'
  }

  return {
    status:        confidence >= 0.5 ? 'success' : 'manual-needed',
    colorMap,
    palette,
    width:         numCols,
    height:        numRows,
    gridLineColor,
    tip,
  }
}

// ── Manual fallback ──────────────────────────────────────────────────────────

export async function detectGridManual(
  dataUrl: string, cols: number, rows: number,
): Promise<GridDetectionResult> {
  let canvas: HTMLCanvasElement
  try { canvas = await loadCanvas(dataUrl, 1200) }
  catch { return { status: 'failed', tip: 'Could not load image.' } }

  const { width: W, height: H } = canvas
  const p = canvas.getContext('2d')!.getImageData(0, 0, W, H).data

  // Find bounding box of non-white content so margins don't skew the sample grid
  const WH = 230
  let top = 0, bottom = H - 1, left = 0, right = W - 1

  top_loop: for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      if (p[i] < WH || p[i+1] < WH || p[i+2] < WH) { top = y; break top_loop }
    }
  }
  bottom_loop: for (let y = H - 1; y >= top; y--) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      if (p[i] < WH || p[i+1] < WH || p[i+2] < WH) { bottom = y; break bottom_loop }
    }
  }
  left_loop: for (let x = 0; x < W; x++) {
    for (let y = top; y <= bottom; y++) {
      const i = (y * W + x) * 4
      if (p[i] < WH || p[i+1] < WH || p[i+2] < WH) { left = x; break left_loop }
    }
  }
  right_loop: for (let x = W - 1; x >= left; x--) {
    for (let y = top; y <= bottom; y++) {
      const i = (y * W + x) * 4
      if (p[i] < WH || p[i+1] < WH || p[i+2] < WH) { right = x; break right_loop }
    }
  }

  const cW = (right - left + 1) / cols
  const cH = (bottom - top + 1) / rows

  const hexGrid: string[][] = []
  for (let row = 0; row < rows; row++) {
    const r: string[] = []
    for (let col = 0; col < cols; col++) {
      const cx = Math.min(W - 1, Math.round(left + col * cW + cW / 2))
      const cy = Math.min(H - 1, Math.round(top  + row * cH + cH / 2))
      r.push(sampleHex(p, cx, cy, W, H))
    }
    hexGrid.push(r)
  }

  const { palette, colorMap } = buildPalette(hexGrid)
  return { status: 'success', colorMap, palette, width: cols, height: rows }
}
