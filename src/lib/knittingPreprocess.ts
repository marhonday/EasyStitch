/**
 * knittingPreprocess.ts
 *
 * Centres the subject within a padded canvas so that knitting patterns
 * read as a motif rather than a wall-to-wall blob.
 *
 * Strategy:
 *   1. Sample a thin border of pixels around the image edges to determine
 *      the dominant background colour (avoids hardcoding white/cream).
 *   2. Fill the output canvas with that colour.
 *   3. Draw the subject scaled to `fill` × canvas dimensions, centred.
 *
 * Target fill varies by image type:
 *   photo   → 0.70 (15% padding each side — motif with breathing room)
 *   graphic → 0.82 (9% padding — logos need more real estate or they read tiny)
 */

/** Average colour of the outermost ring of pixels (border width = `rim` px). */
function sampleEdgeColor(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  rim = 8,
): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0, n = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x >= rim && x < W - rim && y >= rim && y < H - rim) continue
      const i = (y * W + x) * 4
      r += data[i]; g += data[i + 1]; b += data[i + 2]
      n++
    }
  }
  return n > 0
    ? { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
    : { r: 240, g: 236, b: 228 }   // warm neutral fallback
}

function toHex(c: { r: number; g: number; b: number }): string {
  return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export async function preprocessImageForKnitting(
  imageDataUrl: string,
  imageType:    'photo' | 'graphic' = 'photo',
): Promise<string> {
  const fill = imageType === 'graphic' ? 0.82 : 0.70
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const W = img.naturalWidth
      const H = img.naturalHeight

      // ── Step 1: Sample edge colour from the original image ───────────────
      const probe    = document.createElement('canvas')
      probe.width    = W
      probe.height   = H
      const probeCtx = probe.getContext('2d')
      if (!probeCtx) return reject(new Error('Canvas unavailable'))
      probeCtx.drawImage(img, 0, 0)
      const { data: probeData } = probeCtx.getImageData(0, 0, W, H)
      const bg = sampleEdgeColor(probeData, W, H)
      probe.width = probe.height = 0   // free memory

      // ── Step 2: Build output canvas ───────────────────────────────────────
      const out    = document.createElement('canvas')
      out.width    = W
      out.height   = H
      const ctx    = out.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))

      // Fill with background
      ctx.fillStyle = toHex(bg)
      ctx.fillRect(0, 0, W, H)

      // ── Step 3: Draw subject centred at `fill` scale ──────────────────────
      const drawW = Math.round(W * fill)
      const drawH = Math.round(H * fill)
      const offX  = Math.round((W - drawW) / 2)
      const offY  = Math.round((H - drawH) / 2)

      ctx.filter = 'blur(0.5px)'   // soften before quantization — reduces speckle colours
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, W, H, offX, offY, drawW, drawH)
      ctx.filter = 'none'

      resolve(out.toDataURL('image/jpeg', 0.95))
    }
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = imageDataUrl
  })
}
