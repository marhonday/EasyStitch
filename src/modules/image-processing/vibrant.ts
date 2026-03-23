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

export async function analyzeImageWithVibrant(imageSource: string): Promise<VibrantAnalysis> {
  // Run two analyzer configurations in parallel:
  // 1) Balanced quality for primary dominant palette
  // 2) High-detail quality for recommendation confidence
  const [primaryPalette, detailPalette] = await Promise.all([
    Vibrant.from(imageSource).quality(4).maxColorCount(24).getPalette(),
    Vibrant.from(imageSource).quality(1).maxColorCount(64).getPalette(),
  ])

  const dominantPalette = getOrderedPaletteEntries(primaryPalette)
  const detailEntries = getOrderedPaletteEntries(detailPalette)

  const dominantCount = dominantPalette.length
  const detailCount = detailEntries.length
  const combinedSignal = Math.max(dominantCount, detailCount)
  const recommendedColors = clamp(Math.round(combinedSignal * 2), MIN_RECOMMENDED_COLORS, MAX_RECOMMENDED_COLORS)

  return {
    dominantCount,
    recommendedColors,
    dominantPalette,
  }
}
