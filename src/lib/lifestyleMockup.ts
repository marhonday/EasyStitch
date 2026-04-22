/**
 * Lifestyle mockup compositor.
 *
 * Each scene defines a photo template and the target quadrilateral (4 corner
 * points in pixel coords relative to the natural photo dimensions) where the
 * pattern preview will be composited.
 *
 * Corner order: [topLeft, topRight, bottomRight, bottomLeft]
 *
 * When a photo is swapped, update `naturalW`, `naturalH`, and `quad` to match.
 * Everything else (UI, compositing logic) stays the same.
 */

export interface MockupScene {
  id:       string
  label:    string
  emoji:    string
  photo:    string   // path relative to /public
  naturalW: number   // actual pixel width of the photo file
  naturalH: number   // actual pixel height of the photo file
  /** [topLeft, topRight, bottomRight, bottomLeft] in natural-size px */
  quad: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ]
  /** If true the pattern is drawn at reduced opacity (semi-transparent material) */
  opacity?: number
}

// ─── Scene definitions ────────────────────────────────────────────────────────
// Coordinates are PLACEHOLDERS — update naturalW/H and quad once real photos
// are dropped into /public/mockups/.

export const MOCKUP_SCENES: MockupScene[] = [
  {
    id:       'couch',
    label:    'Blanket on sofa',
    emoji:    '🛋️',
    photo:    '/mockups/mockup-couch.jpg',
    naturalW: 1200,
    naturalH: 800,
    quad: [
      [160, 200],
      [900, 180],
      [920, 620],
      [140, 640],
    ],
    opacity: 0.88,
  },
  {
    id:       'shirt',
    label:    'T-shirt',
    emoji:    '👕',
    photo:    '/mockups/mockup-shirt.jpg',
    naturalW: 1000,
    naturalH: 1200,
    quad: [
      [280, 220],
      [720, 220],
      [720, 700],
      [280, 700],
    ],
    opacity: 0.92,
  },
  {
    id:       'frame',
    label:    'Framed wall art',
    emoji:    '🖼️',
    photo:    '/mockups/mockup-frame.jpg',
    naturalW: 1000,
    naturalH: 1200,
    quad: [
      [200, 160],
      [800, 160],
      [800, 900],
      [200, 900],
    ],
    opacity: 1,
  },
  {
    id:       'bed',
    label:    'Bed blanket',
    emoji:    '🛏️',
    photo:    '/mockups/mockup-bed.jpg',
    naturalW: 1200,
    naturalH: 800,
    quad: [
      [100, 120],
      [1100, 120],
      [1100, 680],
      [100, 680],
    ],
    opacity: 0.85,
  },
]

// ─── Compositor ───────────────────────────────────────────────────────────────

/**
 * Draws `patternDataUrl` warped into `scene.quad` on top of the scene photo,
 * then resolves with the composited image as a data URL.
 *
 * Uses a WebGL-free perspective simulation: draws the pattern onto an
 * intermediate canvas scaled to the bounding box of the quad, then uses
 * canvas `transform()` (affine per-triangle) to fake the warp.
 */
export async function compositeMockup(
  scene:         MockupScene,
  patternDataUrl: string,
  outputW:        number = 800,
): Promise<string> {
  const scale = outputW / scene.naturalW
  const outputH = Math.round(scene.naturalH * scale)

  const canvas  = document.createElement('canvas')
  canvas.width  = outputW
  canvas.height = outputH
  const ctx = canvas.getContext('2d')!

  // 1. Draw the background photo
  const bg = await loadImage(scene.photo)
  ctx.drawImage(bg, 0, 0, outputW, outputH)

  // 2. Prepare scaled quad corners
  const quad = scene.quad.map(([x, y]) => [x * scale, y * scale] as [number, number])
  const [tl, tr, br, bl] = quad

  // 3. Load pattern image
  const pat = await loadImage(patternDataUrl)

  // 4. Perspective-warp the pattern into the quad using two triangles
  //    (upper-left triangle + lower-right triangle of the quad)
  ctx.save()
  ctx.globalAlpha = scene.opacity ?? 1

  const pw = pat.naturalWidth  || pat.width
  const ph = pat.naturalHeight || pat.height

  // Triangle A: tl, tr, bl  →  (0,0),(pw,0),(0,ph)
  drawTexturedTriangle(ctx, pat, pw, ph,
    tl, tr, bl,
    [0, 0], [pw, 0], [0, ph],
  )
  // Triangle B: tr, br, bl  →  (pw,0),(pw,ph),(0,ph)
  drawTexturedTriangle(ctx, pat, pw, ph,
    tr, br, bl,
    [pw, 0], [pw, ph], [0, ph],
  )

  ctx.restore()

  return canvas.toDataURL('image/jpeg', 0.92)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Affine-maps a triangle of `src` (sx0/sy0 … sx2/sy2) into the destination
 * triangle (dx0/dy0 … dx2/dy2) using a 2D canvas transform.
 *
 * This is the standard "two-triangle" perspective approximation — good enough
 * for mildly-angled quad regions like a blanket on a flat surface.
 */
function drawTexturedTriangle(
  ctx:  CanvasRenderingContext2D,
  img:  HTMLImageElement,
  imgW: number,
  imgH: number,
  // destination corners
  d0: [number, number],
  d1: [number, number],
  d2: [number, number],
  // source corners (pixel coords in the pattern image)
  s0: [number, number],
  s1: [number, number],
  s2: [number, number],
) {
  ctx.save()

  // Clip to destination triangle
  ctx.beginPath()
  ctx.moveTo(d0[0], d0[1])
  ctx.lineTo(d1[0], d1[1])
  ctx.lineTo(d2[0], d2[1])
  ctx.closePath()
  ctx.clip()

  // Compute affine transform: source → destination
  // [a c e]   maps [sx,sy,1] to [dx,dy,1]
  // [b d f]
  const [dx0, dy0] = d0, [dx1, dy1] = d1, [dx2, dy2] = d2
  const [sx0, sy0] = s0, [sx1, sy1] = s1, [sx2, sy2] = s2

  const det = (sx1 - sx0) * (sy2 - sy0) - (sx2 - sx0) * (sy1 - sy0)
  const a = ((dx1 - dx0) * (sy2 - sy0) - (dx2 - dx0) * (sy1 - sy0)) / det
  const b = ((dy1 - dy0) * (sy2 - sy0) - (dy2 - dy0) * (sy1 - sy0)) / det
  const c = ((dx2 - dx0) * (sx1 - sx0) - (dx1 - dx0) * (sx2 - sx0)) / det
  const d = ((dy2 - dy0) * (sx1 - sx0) - (dy1 - dy0) * (sx2 - sx0)) / det
  const e = dx0 - a * sx0 - c * sy0
  const f = dy0 - b * sx0 - d * sy0

  ctx.transform(a, b, c, d, e, f)
  ctx.drawImage(img, 0, 0, imgW, imgH)
  ctx.restore()
}
