/**
 * yarnEstimator.ts
 * Estimates yards of yarn needed per color for a given pattern.
 * Returns ranges (not point estimates) to account for tension variation.
 */

import { PatternData, StitchStyle } from '@/types/pattern'
import { YARDS_PER_STITCH } from '@/lib/constants'

export interface YarnEstimate {
  colorIndex:  number
  colorName:   string
  hex:         string
  stitchCount: number
  yardsMin:    number
  yardsMax:    number
  skeins:      number   // based on max, to ensure enough
  label:       string   // e.g. "40–55 yds (1 skein)"
}

export interface PatternYarnEstimate {
  perColor:     YarnEstimate[]
  totalYardsMin: number
  totalYardsMax: number
  totalSkeins:   number
  stitchStyle:   StitchStyle
  note:          string
}

// Standard worsted skein = ~190 yards (Lion Brand, Red Heart, Caron common size)
const YARDS_PER_SKEIN = 190
// Tension variance — actual usage typically falls within ±20% of average
const VARIANCE = 0.20

export function estimateYarn(pattern: PatternData): PatternYarnEstimate {
  const { palette, meta } = pattern
  const yardsPerStitch = YARDS_PER_STITCH[meta.stitchStyle] ?? 2.0

  const perColor: YarnEstimate[] = palette.map((color, i) => {
    const stitchCount = color.stitchCount ?? 0
    const yardsBase   = stitchCount * yardsPerStitch
    const yardsMin    = Math.max(1, Math.floor(yardsBase * (1 - VARIANCE)))
    const yardsMax    = Math.ceil(yardsBase  * (1 + VARIANCE))
    const skeins      = Math.max(1, Math.ceil(yardsMax / YARDS_PER_SKEIN))

    return {
      colorIndex: i,
      colorName:  color.label ?? `Colour ${i + 1}`,
      hex:        color.hex,
      stitchCount,
      yardsMin,
      yardsMax,
      skeins,
      label: yardsMax < 20
        ? `${yardsMin}–${yardsMax} yds (small amount)`
        : `${yardsMin}–${yardsMax} yds (${skeins} skein${skeins !== 1 ? 's' : ''})`,
    }
  })

  const totalYardsMin = perColor.reduce((s, c) => s + c.yardsMin, 0)
  const totalYardsMax = perColor.reduce((s, c) => s + c.yardsMax, 0)
  const totalSkeins   = Math.ceil(totalYardsMax / YARDS_PER_SKEIN)

  return {
    perColor,
    totalYardsMin,
    totalYardsMax,
    totalSkeins,
    stitchStyle: meta.stitchStyle,
    note: 'Based on worsted weight yarn. Buy to the higher end — tension varies by crafter.',
  }
}
