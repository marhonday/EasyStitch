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

// Lookup: visually distinct color buckets → recommended stitch color count
const distinctCountToRecommended: Array<[number, number]> = [
  [2,   2],
  [4,   3],
  [6,   4],
  [9,   6],
  [14,  8],
  [22, 12],
  [35, 16],
  [50, 20],
  [Infinity, 25],
]

function distinctToRecommended(distinct: number): number {
  for (const [threshold, rec] of distinctCountToRecommended) {
    if (distinct <= threshold) return rec
  }
  return 25
}

/**
 * Count visually distinct colors in an image using pixel-level analysis.
 * Draws to a 64×64 canvas, quantizes to 3 bits/channel, counts buckets
 * with > 0.8% of pixels. More accurate than Vibrant for flat/graphic images.
 */
async function countVisuallyDistinctColors(imageSource: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const SIZE = 64
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(8); return }
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

        const bucketCounts = new Map<number, number>()
        let totalPixels = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 20) continue // skip transparent
          totalPixels++
          const r = Math.round(data[i]     / 32)
          const g = Math.round(data[i + 1] / 32)
          const b = Math.round(data[i + 2] / 32)
          const key = (r << 6) | (g << 3) | b
          bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1)
        }

        if (totalPixels === 0) { resolve(8); return }

        // Only count buckets with > 0.8% of pixels (filters photographic noise)
        const threshold = totalPixels * 0.008
        let distinctCount = 0
        bucketCounts.forEach(count => {
          if (count >= threshold) distinctCount++
        })

        resolve(Math.max(1, distinctCount))
      } catch {
        resolve(8)
      }
    }
    img.onerror = () => resolve(8)
    img.src = imageSource
  })
}

export async function analyzeImageWithVibrant(imageSource: string): Promise<VibrantAnalysis> {
  // Run Vibrant palette extraction and pixel-level color counting in parallel
  const [primaryPalette, detailPalette, distinctCount] = await Promise.all([
    Vibrant.from(imageSource).quality(4).maxColorCount(24).getPalette(),
    Vibrant.from(imageSource).quality(1).maxColorCount(64).getPalette(),
    countVisuallyDistinctColors(imageSource),
  ])

  const dominantPalette = getOrderedPaletteEntries(primaryPalette)
  const detailEntries   = getOrderedPaletteEntries(detailPalette)

  const dominantCount = dominantPalette.length
  const detailCount   = detailEntries.length

  // Pixel counting is more accurate for flat/graphic images;
  // Vibrant is better for photos. Take the higher signal.
  const vibrantSignal = clamp(Math.round(Math.max(dominantCount, detailCount) * 2), MIN_RECOMMENDED_COLORS, MAX_RECOMMENDED_COLORS)
  const pixelSignal   = distinctToRecommended(distinctCount)
  const recommendedColors = Math.max(vibrantSignal, pixelSignal)

  return {
    dominantCount,
    recommendedColors: clamp(recommendedColors, MIN_RECOMMENDED_COLORS, MAX_RECOMMENDED_COLORS),
    dominantPalette,
  }
}
