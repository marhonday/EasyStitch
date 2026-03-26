/**
 * crossStitchPreprocess.ts
 *
 * Prepares an image for cross stitch pattern generation by:
 *
 *   1. Measuring image complexity (edge density) — how much fine detail exists.
 *   2. Mapping complexity → fill level (0.70–0.88):
 *        simple graphic  → ~0.70  (70% fill, generous border for clean shapes)
 *        detailed photo  → ~0.88  (88% fill, tight border to preserve detail)
 *   3. Sampling edge pixels to detect the natural background colour.
 *   4. Letterboxing the subject centred within the canvas at the chosen fill.
 *
 * Why adaptive fill?
 *   Cross stitch spans a huge range: a simple bookmark motif vs a 120×150
 *   portrait. A fixed crop would crush detail in one or leave too much empty
 *   cloth in the other. Auto-complexity lets the image decide.
 *
 * Fill range: MIN_FILL (0.70) — MAX_FILL (0.88)
 *   → visual coverage lands between ~70% and ~90% depending on subject.
 */

const MIN_FILL = 0.70
const MAX_FILL = 0.88

/**
 * Downsample the image to a small probe canvas (max 200px) for fast analysis.
 * Returns pixel data + dimensions.
 */
function makeProbe(
  img: HTMLImageElement,
  maxDim = 200,
): { data: Uint8ClampedArray; W: number; H: number } | null {
  const scale   = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const W       = Math.max(1, Math.round(img.naturalWidth  * scale))
  const H       = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas  = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)
  canvas.width = canvas.height = 0   // free memory
  return { data, W, H }
}

/**
 * Measure edge density: fraction of adjacent pixel-pairs with a colour
 * difference above `threshold` (0–1, higher = more detail).
 */
function measureComplexity(
  data: Uint8ClampedArray,
  W:    number,
  H:    number,
  threshold = 25,
): number {
  let transitions = 0
  let total       = 0

  // Horizontal pairs
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) {
      const a = (y * W + x)     * 4
      const b = (y * W + x + 1) * 4
      const d = Math.abs(data[a] - data[b])
               + Math.abs(data[a+1] - data[b+1])
               + Math.abs(data[a+2] - data[b+2])
      if (d > threshold) transitions++
      total++
    }
  }
  // Vertical pairs
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
      const a = (y     * W + x) * 4
      const b = ((y+1) * W + x) * 4
      const d = Math.abs(data[a] - data[b])
               + Math.abs(data[a+1] - data[b+1])
               + Math.abs(data[a+2] - data[b+2])
      if (d > threshold) transitions++
      total++
    }
  }

  return total > 0 ? transitions / total : 0
}

/**
 * Average colour of the outermost ring of pixels (border width = `rim` px).
 * Used to fill the padding area so it matches the image's own background.
 */
function sampleEdgeColor(
  data: Uint8ClampedArray,
  W:    number,
  H:    number,
  rim = 8,
): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0, n = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x >= rim && x < W - rim && y >= rim && y < H - rim) continue
      const i = (y * W + x) * 4
      r += data[i]; g += data[i+1]; b += data[i+2]
      n++
    }
  }
  return n > 0
    ? { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
    : { r: 245, g: 240, b: 232 }   // warm neutral fallback
}

function toHex(c: { r: number; g: number; b: number }): string {
  return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/**
 * Map a complexity score [0, 1] to a fill fraction [MIN_FILL, MAX_FILL].
 *
 * The complexity→fill curve is deliberately non-linear:
 *   - Very simple images (lots of flat colour) → floor at MIN_FILL
 *   - Mid-complexity rises steeply (this is where most photos land)
 *   - Very dense detail → ceiling at MAX_FILL
 *
 * Empirically, edge-density for most photos falls in 0.10–0.35.
 * We map that range across the full fill window.
 */
function complexityToFill(complexity: number): number {
  const LOW  = 0.08   // edge-density below this → MIN_FILL
  const HIGH = 0.35   // edge-density above this → MAX_FILL
  const t    = Math.max(0, Math.min(1, (complexity - LOW) / (HIGH - LOW)))
  return MIN_FILL + t * (MAX_FILL - MIN_FILL)
}

export async function preprocessImageForCrossStitch(
  imageDataUrl: string,
): Promise<{ dataUrl: string; fill: number; complexity: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const W = img.naturalWidth
      const H = img.naturalHeight

      // ── Step 1: Probe for complexity + background colour ──────────────────
      const probe = makeProbe(img)
      if (!probe) return reject(new Error('Canvas unavailable'))

      const complexity = measureComplexity(probe.data, probe.W, probe.H)
      const fill       = complexityToFill(complexity)
      const bg         = sampleEdgeColor(probe.data, probe.W, probe.H)

      // ── Step 2: Build output canvas ───────────────────────────────────────
      const out    = document.createElement('canvas')
      out.width    = W
      out.height   = H
      const ctx    = out.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))

      ctx.fillStyle = toHex(bg)
      ctx.fillRect(0, 0, W, H)

      // ── Step 3: Draw subject centred at computed fill ─────────────────────
      const drawW = Math.round(W * fill)
      const drawH = Math.round(H * fill)
      const offX  = Math.round((W - drawW) / 2)
      const offY  = Math.round((H - drawH) / 2)

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, W, H, offX, offY, drawW, drawH)

      resolve({
        dataUrl:    out.toDataURL('image/jpeg', 0.95),
        fill:       Math.round(fill * 100),   // percent, for logging
        complexity: Math.round(complexity * 100),
      })
    }
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = imageDataUrl
  })
}
