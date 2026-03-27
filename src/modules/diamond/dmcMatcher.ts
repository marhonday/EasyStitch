/**
 * dmcMatcher.ts
 * Matches palette colors to nearest DMC codes using LAB color distance.
 * Also provides canvas size and shopping list utilities.
 */

import { DMC_COLORS, DmcColor } from './dmcColors'
import { ColorEntry } from '@/types/pattern'

export interface DmcMatch {
  colorIndex:  number
  hex:         string
  dmc:         DmcColor
  stitchCount: number
  bagsNeeded:  number   // ceil(count * 1.15 / 200), min 1
}

// ── LAB color math ────────────────────────────────────────────────────────────

function rgbToLab(r: number, g: number, b: number) {
  let R = r / 255, G = g / 255, B = b / 255
  R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92
  G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92
  B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.00000
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116
  X = f(X); Y = f(Y); Z = f(Z)
  return { L: 116 * Y - 16, a: 500 * (X - Y), b: 200 * (Y - Z) }
}

function labDist(
  a: { L: number; a: number; b: number },
  b: { L: number; a: number; b: number },
) {
  const dL = a.L - b.L, da = a.a - b.a, db = a.b - b.b
  return Math.sqrt(dL * dL + da * da + db * db)
}

// Pre-compute LAB values for all DMC colors once
const DMC_LAB = DMC_COLORS.map(c => ({ ...c, lab: rgbToLab(c.r, c.g, c.b) }))

// ── Nearest DMC match ─────────────────────────────────────────────────────────

export function nearestDmc(r: number, g: number, b: number): DmcColor {
  const lab = rgbToLab(r, g, b)
  let best = DMC_LAB[0], bestDist = Infinity
  for (const c of DMC_LAB) {
    const d = labDist(lab, c.lab)
    if (d < bestDist) { bestDist = d; best = c }
  }
  return best
}

// ── Match full palette ────────────────────────────────────────────────────────

export function matchToDmc(palette: ColorEntry[]): DmcMatch[] {
  return palette.map((color, i) => {
    const dmc = nearestDmc(color.r, color.g, color.b)
    const stitchCount = color.stitchCount ?? 0
    const bagsNeeded  = stitchCount > 0 ? Math.max(1, Math.ceil(stitchCount * 1.15 / 200)) : 1
    return { colorIndex: i, hex: color.hex, dmc, stitchCount, bagsNeeded }
  })
}

// ── Canvas size utilities ─────────────────────────────────────────────────────

/** Returns canvas size in centimetres at 2.5mm per diamond */
export function canvasSizeCm(w: number, h: number) {
  return { w: +(w * 0.25).toFixed(1), h: +(h * 0.25).toFixed(1) }
}

/** Returns canvas size in inches (1 decimal place) */
export function canvasSizeInches(w: number, h: number) {
  const cm = canvasSizeCm(w, h)
  return {
    w: (cm.w / 2.54).toFixed(1),
    h: (cm.h / 2.54).toFixed(1),
  }
}

/** Total diamonds + total bags across all matches */
export function shoppingTotals(matches: DmcMatch[]) {
  const totalDiamonds = matches.reduce((s, m) => s + m.stitchCount, 0)
  const totalBags     = matches.reduce((s, m) => s + m.bagsNeeded, 0)
  return { totalDiamonds, totalBags }
}
