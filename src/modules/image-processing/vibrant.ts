import { Vibrant } from 'node-vibrant/browser'

const MIN_RECOMMENDED_COLORS = 2
const MAX_RECOMMENDED_COLORS = 32

export interface DominantPaletteEntry {
  hex: string
  population: number
}

export interface VibrantAnalysis {
  dominantCount: number
  recommendedColors: number
  dominantPalette: DominantPaletteEntry[]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getOrderedPaletteEntries(palette: Awaited<ReturnType<ReturnType<typeof Vibrant.from>['getPalette']>>) {
  return Object.values(palette)
    .filter((swatch): swatch is NonNullable<typeof swatch> => Boolean(swatch))
    .map((swatch) => ({
      hex: swatch.hex,
      population: swatch.population,
    }))
    .sort((a, b) => b.population - a.population)
}

/**
 * Count visually distinct color regions by sampling pixels at low resolution.
 * Uses 3-bit quantization (8 levels per channel) with a minimum population
 * threshold so photographic noise doesn't inflate the count.
 *
 * Returns a number that maps naturally to a crochet color count:
 *   2-3 → simple graphic/logo
 *   4-8 → flat design or simple scene
 *   9-20 → portrait / pet photo
 *   21+ → complex landscape or busy scene
 */
async function countVisuallyDistinctColors(imageSource: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 64
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(8); return }
      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
      const totalPixels = SIZE * SIZE

      // Count pixels per 3-bit quantized bucket (8 levels per channel → 512 buckets)
      const bucketCounts = new Map<number, number>()
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 20) continue // skip transparent/near-transparent
        const r = Math.round(data[i]     / 32)
        const g = Math.round(data[i + 1] / 32)
        const b = Math.round(data[i + 2] / 32)
        const key = (r << 6) | (g << 3) | b
        bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1)
      }

      // Only count buckets with > 0.8% of pixels (filters photographic noise)
      const threshold = totalPixels * 0.008
      let distinctCount = 0
      bucketCounts.forEach(count => {
        if (count >= threshold) distinctCount++
      })

      resolve(Math.max(1, distinctCount))
    }
    img.onerror = () => resolve(8)
    img.src = imageSource
  })
}

/** Map pixel-distinct-color count to a sensible crochet palette recommendation */
function distinctCountToRecommended(distinct: number): number {
  if (distinct <= 2)  return 2
  if (distinct <= 4)  return 3
  if (distinct <= 6)  return 4
  if (distinct <= 9)  return 6
  if (distinct <= 14) return 8
  if (distinct <= 22) return 12
  if (distinct <= 35) return 16
  if (distinct <= 50) return 20
  return 25
}

export async function analyzeImageWithVibrant(imageSource: string): Promise<VibrantAnalysis> {
  // Run Vibrant (for display palette) and pixel counter (for recommendation) in parallel
  const [primaryPalette, distinctColors] = await Promise.all([
    Vibrant.from(imageSource).quality(4).maxColorCount(24).getPalette(),
    countVisuallyDistinctColors(imageSource),
  ])

  const dominantPalette = getOrderedPaletteEntries(primaryPalette)
  const dominantCount   = dominantPalette.length
  const recommendedColors = clamp(
    distinctCountToRecommended(distinctColors),
    MIN_RECOMMENDED_COLORS,
    MAX_RECOMMENDED_COLORS,
  )

  return {
    dominantCount,
    recommendedColors,
    dominantPalette,
  }
}
