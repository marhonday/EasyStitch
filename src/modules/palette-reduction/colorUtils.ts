/**
 * palette-reduction/colorUtils.ts
 *
 * Low-level colour math used by palette reduction and colour assignment.
 * Uses CIELAB colour space for perceptual distance (ΔE) — meaning "close
 * colours" matches human perception, not raw RGB proximity.
 */

import { LabColor } from '@/types/pattern'

// ─── RGB → CIELAB conversion ──────────────────────────────────────────────────

/** Linearise a single sRGB channel (0–255) → linear light (0–1) */
function linearise(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** Linear RGB (0–1 each) → CIE XYZ (D65 illuminant) */
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const rl = linearise(r)
  const gl = linearise(g)
  const bl = linearise(b)
  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
  const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041
  return [x, y, z]
}

/** CIE XYZ → CIELAB (D65 white point) */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const xn = 0.95047, yn = 1.00000, zn = 1.08883
  const f  = (t: number) => t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116
  const fx = f(x / xn), fy = f(y / yn), fz = f(z / zn)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** Full conversion: sRGB (0–255 each) → LabColor */
export function rgbToLab(r: number, g: number, b: number): LabColor {
  const [x, y, z]   = rgbToXyz(r, g, b)
  const [L, a, lb]  = xyzToLab(x, y, z)
  return { L, a, b: lb, r, g, bl: b }
}

// ─── Distance ─────────────────────────────────────────────────────────────────

/** Perceptual colour distance (simplified ΔE in LAB space) */
export function labDistance(a: LabColor, b: LabColor): number {
  return Math.sqrt(
    (a.L - b.L) ** 2 +
    (a.a - b.a) ** 2 +
    (a.b - b.b) ** 2
  )
}

/** Fast RGB Euclidean distance — used only for initial bucket sorting */
export function rgbDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

// ─── Hex helpers ──────────────────────────────────────────────────────────────

/** RGB (0–255 each) → "#rrggbb" */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}

/** "#rrggbb" → { r, g, b } (0–255 each) */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

// ─── Lightness ────────────────────────────────────────────────────────────────

/**
 * Perceived lightness (0–100) from RGB.
 * FIX #6: Previously called rgbToXyz twice — now computed once.
 */
export function perceivedLightness(r: number, g: number, b: number): number {
  const [x, y, z] = rgbToXyz(r, g, b)
  const [L]       = xyzToLab(x, y, z)
  return L
}
