/**
 * enhancePipeline.ts
 *
 * Dialed back pipeline — gentler processing, better crop logic.
 * Posterize removed entirely. Smart crop only on very non-square images.
 *
 * Order:
 *   1. Smart crop (only if aspect ratio > 1.5:1)
 *   2. Contrast stretch (only if genuinely flat)
 *   3. Saturation (only if genuinely desaturated)
 *   4. Background lighten (only if clear background detected)
 *   5. Sharpen (gentle, last)
 */

import {
  contrastStretch,
  saturate,
  unsharpMask,
  lightenBackground,
} from './enhance'

export interface PipelineOptions {
  contrast?:   boolean
  saturation?: boolean
  background?: boolean
  sharpen?:    boolean
}

export interface PipelineResult {
  success:      boolean
  dataUrl:      string
  appliedSteps: string[]
  skippedSteps: string[]
  error?:       string
}

const DEFAULT_OPTIONS: Required<PipelineOptions> = {
  contrast:   true,
  saturation: true,
  background: true,
  sharpen:    true,
}

function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Cannot get 2D context'))
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

function imageDataToDataUrl(data: ImageData): string {
  const canvas  = document.createElement('canvas')
  canvas.width  = data.width
  canvas.height = data.height
  const ctx     = canvas.getContext('2d')
  if (!ctx) throw new Error('Cannot get 2D context')
  ctx.putImageData(data, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.93)
}

interface CropResult { imageData: ImageData; cropped: boolean }

/**
 * Smart crop — only activates on very non-square images (>1.5:1 ratio).
 * Finds highest-interest slice using contrast variance sampling.
 * Much more conservative than before to avoid cutting off subject.
 */
function smartCentreCrop(src: ImageData): CropResult {
  // Disabled — user crop tool handles framing now
  return { imageData: src, cropped: false }
}

export async function runEnhancePipeline(
  dataUrl:  string,
  options:  PipelineOptions = {}
): Promise<PipelineResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const appliedSteps: string[] = []
  const skippedSteps: string[] = []

  let currentData: ImageData

  try {
    currentData = await dataUrlToImageData(dataUrl)
  } catch (err) {
    return {
      success:      false,
      dataUrl,
      appliedSteps: [],
      skippedSteps: [],
      error:        err instanceof Error ? err.message : 'Failed to decode image',
    }
  }

  // Smart crop — conservative, only very non-square
  const { imageData: croppedData, cropped } = smartCentreCrop(currentData)
  if (cropped) {
    currentData = croppedData
    appliedSteps.push('crop')
  }

  function runStep(
    name:    string,
    enabled: boolean,
    fn:      (d: ImageData) => { data: ImageData; applied: boolean; reason?: string }
  ) {
    if (!enabled) { skippedSteps.push(`${name} (disabled)`); return }
    try {
      const result = fn(currentData)
      if (result.applied) {
        currentData = result.data
        appliedSteps.push(name)
      } else {
        skippedSteps.push(`${name} (${result.reason ?? 'skipped'})`)
      }
    } catch (err) {
      skippedSteps.push(`${name} (error)`)
    }
  }

  runStep('contrast',   opts.contrast,   contrastStretch)
  runStep('saturation', opts.saturation, saturate)
  runStep('background', opts.background, lightenBackground)
  runStep('sharpen',    opts.sharpen,    unsharpMask)

  try {
    return { success: true, dataUrl: imageDataToDataUrl(currentData), appliedSteps, skippedSteps }
  } catch (err) {
    return {
      success:      false,
      dataUrl,
      appliedSteps: [],
      skippedSteps,
      error:        err instanceof Error ? err.message : 'Failed to encode result',
    }
  }
}
