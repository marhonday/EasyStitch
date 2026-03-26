/**
 * filetPreprocess.ts
 *
 * Converts a photo to a binary (filled / open) image suitable for filet crochet.
 *
 * Pipeline per pixel:
 *   1. Grayscale (luminance formula)
 *   2. Contrast boost — pushes mid-greys toward black or white so shapes read
 *      more boldly and the threshold decision is cleaner
 *   3. Threshold — darker than threshold = filled, lighter = open
 *   4. Invert (optional) — flip filled/open for light subjects on dark backgrounds
 *
 * After the binary pass, if fitToGrid is true the function auto-crops to the
 * bounding box of all filled pixels (+ padding), ensuring the subject fills
 * 80-90% of the grid instead of floating in empty space.
 */

export async function processImageForFilet(
  imageDataUrl:  string,
  threshold:     number,          // 0–255; higher = more filled squares
  invert:        boolean,
  fitToGrid      = true,          // auto-crop to filled-pixel bounding box
  contrastBoost  = 1.5,           // multiplier around midpoint 128; >1 = bolder
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const W = canvas.width
      const H = canvas.height

      // Track filled bounding box for fit-to-grid crop
      let minX = W, maxX = 0, minY = H, maxY = 0

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

        // Contrast boost: push values away from midpoint
        const boosted = Math.max(0, Math.min(255, 128 + (gray - 128) * contrastBoost))

        let filled = boosted < threshold
        if (invert) filled = !filled

        // Track bbox of filled pixels
        if (filled && fitToGrid) {
          const idx = i / 4
          const x   = idx % W
          const y   = Math.floor(idx / W)
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }

        const val = filled ? 15 : 248
        data[i]     = val
        data[i + 1] = val
        data[i + 2] = val
        data[i + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)

      // ── Fit to grid: crop to filled bounding box ─────────────────────────────
      if (!fitToGrid || maxX <= minX || maxY <= minY) {
        resolve(canvas.toDataURL('image/jpeg', 0.95))
        return
      }

      const PAD  = 0.08   // 8% padding around the subject
      const bw   = maxX - minX
      const bh   = maxY - minY
      const padX = Math.max(4, Math.round(bw * PAD))
      const padY = Math.max(4, Math.round(bh * PAD))

      const cropX = Math.max(0, minX - padX)
      const cropY = Math.max(0, minY - padY)
      const cropW = Math.min(W - cropX, bw + padX * 2)
      const cropH = Math.min(H - cropY, bh + padY * 2)

      const out    = document.createElement('canvas')
      out.width    = cropW
      out.height   = cropH
      const outCtx = out.getContext('2d')
      if (!outCtx) { resolve(canvas.toDataURL('image/jpeg', 0.95)); return }

      outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
      resolve(out.toDataURL('image/jpeg', 0.95))
    }
    img.onerror = () => reject(new Error('Could not process image'))
    img.src = imageDataUrl
  })
}
