/**
 * image-processing/resize.ts
 *
 * Draws the uploaded image onto an offscreen <canvas> at the exact target grid
 * resolution, then reads back the pixel data.
 *
 * Why canvas drawImage?
 * - The browser applies bilinear (or better) resampling for free
 * - No external dependency needed
 * - Handles JPEG, PNG, WebP, HEIC (where browser supports it)
 *
 * Clarity risk:
 * - Very small grids (20×20) will blur fine detail — acceptable for graphghan style
 * - Extreme aspect ratio mismatch (e.g. panorama → square grid) will crop, not letterbox
 *   → we centre-crop to preserve the subject
 */

import { PixelGrid } from '@/types/pattern'

export interface ResizeOptions {
  targetWidth:  number
  targetHeight: number
  imageType?:   'photo' | 'graphic'
  skipCrop?:    boolean   // true = stretch to fit, no center crop (use after user crop)
}

/**
 * Load a data URL into an HTMLImageElement, resolving when fully decoded.
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

/**
 * Compute a centre-crop source rect so the subject stays centred when the
 * image aspect ratio doesn't match the target grid.
 *
 * Returns the source (sx, sy, sw, sh) to pass to drawImage.
 */
export function computeCentreCrop(
  srcW: number, srcH: number,
  dstW: number, dstH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const srcRatio = srcW / srcH
  const dstRatio = dstW / dstH

  let sw: number, sh: number
  if (srcRatio > dstRatio) {
    // Source is wider than target — crop the sides
    sh = srcH
    sw = srcH * dstRatio
  } else {
    // Source is taller than target — crop top and bottom
    sw = srcW
    sh = srcW / dstRatio
  }

  const sx = (srcW - sw) / 2
  const sy = (srcH - sh) / 2
  return { sx, sy, sw, sh }
}

/**
 * Resize an image data URL to the exact grid dimensions.
 * Returns a PixelGrid (raw RGBA Uint8ClampedArray + dimensions).
 *
 * Must be called in a browser context (requires canvas API).
 */
export async function resizeToGrid(
  dataUrl: string,
  options: ResizeOptions
): Promise<PixelGrid> {
  const { targetWidth, targetHeight } = options

  const img = await loadImage(dataUrl)

  // Fill the full grid — user crop already decided the framing
  // Stretching slightly to fit the grid aspect ratio is acceptable
  const finalW = targetWidth
  const finalH = targetHeight

  const canvas = document.createElement('canvas')
  canvas.width  = finalW
  canvas.height = finalH

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D canvas context')

  const skipCrop = true
  const { sx, sy, sw, sh } = skipCrop
    ? { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight }
    : computeCentreCrop(img.naturalWidth, img.naturalHeight, finalW, finalH)

  const isGraphic = options.imageType === 'graphic'

  if (isGraphic) {
    const midW = Math.min(img.naturalWidth,  finalW * 4)
    const midH = Math.min(img.naturalHeight, finalH * 4)
    const midCanvas = document.createElement('canvas')
    midCanvas.width = midW; midCanvas.height = midH
    const midCtx = midCanvas.getContext('2d')!
    midCtx.imageSmoothingEnabled = true
    midCtx.imageSmoothingQuality = 'high'
    midCtx.drawImage(img, sx, sy, sw, sh, 0, 0, midW, midH)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(midCanvas, 0, 0, midW, midH, 0, 0, finalW, finalH)
    midCanvas.width = midCanvas.height = 0
  } else {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, finalW, finalH)
  }

  const imageData = ctx.getImageData(0, 0, finalW, finalH)

  return {
    data:   imageData.data,
    width:  finalW,
    height: finalH,
  }
}
