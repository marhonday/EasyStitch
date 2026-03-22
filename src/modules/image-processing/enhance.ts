/**
 * enhance.ts - Dialed back for real photos.
 * 
 * Key changes from aggressive version:
 * - Contrast stretch is gentler (5th/95th percentile vs 1st/99th)
 * - Saturation boost reduced (1.2x vs 1.45x) — was over-saturating
 * - Posterize REMOVED — was destroying detail and causing graininess
 * - Sharpen strength reduced (0.25 vs 0.45) — was causing crunchy edges
 * - Background lightening kept but threshold tightened
 */

export interface EnhanceResult {
  data:    ImageData
  applied: boolean
  reason?: string
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l   = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    default: h = ((r - g) / d + 4) / 6
  }
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v] }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ]
}

/**
 * Gentle contrast stretch — 5th/95th percentile.
 * Only fires if image is noticeably flat (range < 60% of full).
 */
export function contrastStretch(src: ImageData): EnhanceResult {
  const d = src.data
  const lumas: number[] = []

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue
    lumas.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
  }

  if (lumas.length === 0) return { data: src, applied: false, reason: 'no opaque pixels' }

  lumas.sort((a, b) => a - b)
  const lo  = lumas[Math.floor(lumas.length * 0.05)]
  const hi  = lumas[Math.floor(lumas.length * 0.95)]
  const rng = hi - lo

  // Only stretch if image is genuinely flat — high threshold to avoid touching good photos
  if (rng >= 0.60 * 255) {
    return { data: src, applied: false, reason: 'contrast already sufficient' }
  }

  const out = new ImageData(new Uint8ClampedArray(d), src.width, src.height)
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 128) continue
    for (let c = 0; c < 3; c++) {
      out.data[i + c] = clamp(((d[i + c] - lo) / rng) * 255)
    }
  }

  return { data: out, applied: true }
}

/**
 * Very gentle saturation boost — 1.2x max.
 * Only fires on genuinely desaturated images (mean S < 0.35).
 * Most phone photos are already well saturated and should be skipped.
 */
export function saturate(src: ImageData, factor = 1.2): EnhanceResult {
  const d = src.data
  const safeFactor = Math.min(1.2, factor)

  let totalS = 0, count = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue
    const [, s] = rgbToHsl(d[i], d[i + 1], d[i + 2])
    totalS += s; count++
  }
  if (count === 0) return { data: src, applied: false, reason: 'no opaque pixels' }
  // Raised skip threshold — skip if even moderately saturated
  if (totalS / count > 0.35) {
    return { data: src, applied: false, reason: 'already sufficiently saturated' }
  }

  const out = new ImageData(new Uint8ClampedArray(d), src.width, src.height)
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 128) continue
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2])
    const [r, g, b] = hslToRgb(h, Math.min(1, s * safeFactor), l)
    out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b
  }

  return { data: out, applied: true }
}

/**
 * Light unsharp mask — strength 0.25, only on bright enough images.
 * Much gentler than before to avoid grainy/crunchy output.
 */
export function unsharpMask(src: ImageData, strength = 0.25): EnhanceResult {
  const d = src.data
  const w = src.width, h = src.height

  let totalL = 0, count = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue
    totalL += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    count++
  }
  if (count === 0) return { data: src, applied: false, reason: 'no opaque pixels' }
  if (totalL / count < 40) {
    return { data: src, applied: false, reason: 'image too dark' }
  }

  const blurred = new Uint8ClampedArray(d.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rS = 0, gS = 0, bS = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const j = (ny * w + nx) * 4
          rS += d[j]; gS += d[j + 1]; bS += d[j + 2]; n++
        }
      }
      const i = (y * w + x) * 4
      blurred[i] = rS/n; blurred[i+1] = gS/n; blurred[i+2] = bS/n; blurred[i+3] = d[i+3]
    }
  }

  const out = new ImageData(new Uint8ClampedArray(d), w, h)
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 128) continue
    for (let c = 0; c < 3; c++) {
      out.data[i + c] = clamp(d[i + c] + strength * (d[i + c] - blurred[i + c]))
    }
  }

  return { data: out, applied: true }
}

/**
 * Background lightening — pet-safe version.
 * Only fires when there's a clear bright background AND subject is darker.
 */
export function lightenBackground(src: ImageData): EnhanceResult {
  const d = src.data
  const w = src.width, h = src.height
  const margin = Math.floor(Math.min(w, h) * 0.15)

  let edgeLight = 0, edgeCount = 0
  let centreLight = 0, centreCount = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (d[i + 3] < 128) continue
      const [, , l] = rgbToHsl(d[i], d[i + 1], d[i + 2])
      const isEdge = x < margin || x >= w - margin || y < margin || y >= h - margin
      if (isEdge) { edgeLight += l; edgeCount++ }
      else { centreLight += l; centreCount++ }
    }
  }

  if (edgeCount === 0 || centreCount === 0) {
    return { data: src, applied: false, reason: 'insufficient pixels' }
  }

  const avgEdge   = edgeLight / edgeCount
  const avgCentre = centreLight / centreCount
  const overall   = (edgeLight + centreLight) / (edgeCount + centreCount)

  // Much stricter thresholds — only fire when background is clearly distinct
  if (avgEdge - avgCentre < 0.25 || overall > 0.65) {
    return { data: src, applied: false, reason: 'no distinct background detected' }
  }

  const out = new ImageData(new Uint8ClampedArray(d), w, h)
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 128) continue
    const [, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2])
    if (l > 0.82 && s < 0.15) {
      const t = Math.min(1, ((l - 0.82) / 0.18) * 0.5)
      out.data[i]     = clamp(d[i]     + t * (255 - d[i]))
      out.data[i + 1] = clamp(d[i + 1] + t * (255 - d[i + 1]))
      out.data[i + 2] = clamp(d[i + 2] + t * (255 - d[i + 2]))
    }
  }

  return { data: out, applied: true }
}

/**
 * Crochet simplification — flattens JPEG noise and anti-alias gradients
 * while preserving hard color boundaries.
 *
 * Uses a simple but effective approach:
 * 1. Box blur within color regions (bilateral-lite): average each pixel
 *    with neighbors that are within a color tolerance. This flattens
 *    compression artifacts and soft gradients without blurring edges.
 * 2. Two passes to fully flatten gradual transitions.
 *
 * The result is an image where flat-fill regions (logo colors, solid
 * backgrounds) become truly flat, so the quantizer sees clean uniform
 * areas instead of noisy gradients. Anti-alias pixels at boundaries
 * get averaged into their dominant neighbor color.
 *
 * Only intended for graphic/logo imageType — would destroy photo detail.
 */
export function simplifyCrochet(src: ImageData): EnhanceResult {
  const { data, width, height } = src
  const COLOR_TOLERANCE = 18  // tighter threshold — only merge truly similar pixels

  function dist(i: number, j: number): number {
    return Math.sqrt(
      (data[i]   - data[j])   ** 2 +
      (data[i+1] - data[j+1]) ** 2 +
      (data[i+2] - data[j+2]) ** 2
    )
  }

  function runPass(src: Uint8ClampedArray): Uint8ClampedArray {
    const out = new Uint8ClampedArray(src.length)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        let rS = 0, gS = 0, bS = 0, n = 0

        // Check 3x3 neighborhood
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
            const j = (ny * width + nx) * 4
            // Only include neighbor if color is similar
            const d = Math.sqrt(
              (src[i]   - src[j])   ** 2 +
              (src[i+1] - src[j+1]) ** 2 +
              (src[i+2] - src[j+2]) ** 2
            )
            if (d < COLOR_TOLERANCE) {
              rS += src[j]; gS += src[j+1]; bS += src[j+2]; n++
            }
          }
        }

        out[i]   = n > 0 ? clamp(rS / n) : src[i]
        out[i+1] = n > 0 ? clamp(gS / n) : src[i+1]
        out[i+2] = n > 0 ? clamp(bS / n) : src[i+2]
        out[i+3] = src[i+3]
      }
    }
    return out
  }

  // Two passes for thorough flattening
  const pass1 = runPass(data)
  const pass2 = runPass(pass1)

  const out = new ImageData(pass2, width, height)
  return { data: out, applied: true }
}
