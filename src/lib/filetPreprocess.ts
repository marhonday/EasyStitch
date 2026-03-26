/**
 * filetPreprocess.ts
 *
 * Converts a photo to a strict binary (filled / open) image for filet crochet.
 *
 * Pipeline:
 *   1. Blur         — softens noise before the threshold decision
 *   2. Grayscale    — luminance formula
 *   3. Contrast boost — pushes mid-greys firmly toward black or white
 *   4. Threshold    — darker than threshold = filled, lighter = open
 *   5. Invert       — optional flip for light subjects on dark backgrounds
 *   6. Cleanup      — removes tiny isolated specks (islands) and fills tiny
 *                     interior holes using a fast neighbourhood-vote pass
 *   7. Fit-to-grid  — auto-crops to bounding box of filled pixels + padding
 *
 * Mode: 'clean' | 'detailed'
 *   clean    — heavier blur (2 px), stronger contrast (2.0×), +12 threshold
 *              bias.  Best for silhouettes, bold shapes, logos.
 *   detailed — lighter blur (0.8 px), normal contrast (1.5×), threshold as-is.
 *              Best for portraits, animals, anything with internal texture.
 */

export type FiletMode = 'clean' | 'detailed'

interface ModeParams {
  blurPx:        number
  contrastBoost: number
  thresholdBias: number   // added to the user's threshold value
  cleanupPasses: number   // how many speck-removal passes to run
}

const MODE_PARAMS: Record<FiletMode, ModeParams> = {
  clean: {
    blurPx:        2,
    contrastBoost: 2.0,
    thresholdBias: 12,
    cleanupPasses: 2,
  },
  detailed: {
    blurPx:        0.8,
    contrastBoost: 1.5,
    thresholdBias: 0,
    cleanupPasses: 1,
  },
}

/**
 * One pass of neighbourhood-vote cleanup.
 *
 * For each pixel, if ≥ threshold of its 8 neighbours are the opposite state,
 * flip it.  This removes:
 *   • single-pixel islands (isolated filled dots in open space)
 *   • single-pixel holes  (isolated open dots inside filled shapes)
 *
 * `voteThreshold` = minimum neighbour count to trigger a flip (out of 8).
 * 6 removes only fully-isolated singles; 5 also removes edge-touching ones.
 */
function cleanupPass(
  binary:        Uint8Array,   // 1 = filled, 0 = open
  W:             number,
  H:             number,
  voteThreshold: number = 6,
): Uint8Array {
  const out = new Uint8Array(binary)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const idx     = y * W + x
      const current = binary[idx]
      const opposite = 1 - current
      let   count   = 0
      // 8-connected neighbours
      count += binary[(y-1)*W + (x-1)] === opposite ? 1 : 0
      count += binary[(y-1)*W +  x   ] === opposite ? 1 : 0
      count += binary[(y-1)*W + (x+1)] === opposite ? 1 : 0
      count += binary[ y   *W + (x-1)] === opposite ? 1 : 0
      count += binary[ y   *W + (x+1)] === opposite ? 1 : 0
      count += binary[(y+1)*W + (x-1)] === opposite ? 1 : 0
      count += binary[(y+1)*W +  x   ] === opposite ? 1 : 0
      count += binary[(y+1)*W + (x+1)] === opposite ? 1 : 0
      if (count >= voteThreshold) out[idx] = opposite
    }
  }
  return out
}

export async function processImageForFilet(
  imageDataUrl: string,
  threshold:    number,          // 0–255; higher = more filled squares
  invert:       boolean,
  fitToGrid     = true,
  mode:         FiletMode = 'clean',
): Promise<string> {
  const { blurPx, contrastBoost, thresholdBias, cleanupPasses } = MODE_PARAMS[mode]
  const effectiveThreshold = Math.min(255, threshold + thresholdBias)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const W = img.naturalWidth
      const H = img.naturalHeight

      // ── Step 1: Draw with blur via canvas filter ──────────────────────────
      const canvas = document.createElement('canvas')
      canvas.width  = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))

      ctx.filter = `blur(${blurPx}px)`
      ctx.drawImage(img, 0, 0)
      ctx.filter = 'none'

      const imageData = ctx.getImageData(0, 0, W, H)
      const data = imageData.data

      // ── Steps 2–5: Grayscale → contrast boost → threshold → invert ────────
      const binary = new Uint8Array(W * H)
      for (let i = 0; i < data.length; i += 4) {
        const gray    = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]
        const boosted = Math.max(0, Math.min(255, 128 + (gray - 128) * contrastBoost))
        let   filled  = boosted < effectiveThreshold
        if (invert) filled = !filled
        binary[i / 4] = filled ? 1 : 0
      }

      // ── Step 6: Cleanup — remove islands and fill holes ───────────────────
      let clean = binary
      for (let p = 0; p < cleanupPasses; p++) {
        clean = cleanupPass(clean, W, H)
      }

      // Write binary back to imageData + track bounding box
      let minX = W, maxX = 0, minY = H, maxY = 0
      for (let idx = 0; idx < clean.length; idx++) {
        const filled = clean[idx] === 1
        const val    = filled ? 15 : 248
        data[idx*4]   = val
        data[idx*4+1] = val
        data[idx*4+2] = val
        data[idx*4+3] = 255
        if (filled && fitToGrid) {
          const x = idx % W
          const y = Math.floor(idx / W)
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }

      ctx.putImageData(imageData, 0, 0)

      // ── Step 7: Fit to grid ───────────────────────────────────────────────
      if (!fitToGrid || maxX <= minX || maxY <= minY) {
        resolve(canvas.toDataURL('image/jpeg', 0.95))
        return
      }

      const PAD  = 0.08
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
