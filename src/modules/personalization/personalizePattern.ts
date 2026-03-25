import { COLOR_SYMBOLS } from '@/lib/constants'
import {
  Cell,
  ColorEntry,
  PatternData,
  PersonalizationFontStyle,
  PersonalizationSettings,
} from '@/types/pattern'

// ─── Block font (5×7) — clean pixel letters ───────────────────────────────────
const BLOCK_FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
}

// ─── Slim font (3×7) — condensed, fits more characters per row ────────────────
const SLIM_FONT: Record<string, string[]> = {
  A: ['010', '101', '101', '111', '101', '101', '101'],
  B: ['110', '101', '101', '110', '101', '101', '110'],
  C: ['011', '100', '100', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '101', '101', '110'],
  E: ['111', '100', '100', '110', '100', '100', '111'],
  F: ['111', '100', '100', '110', '100', '100', '100'],
  G: ['011', '100', '100', '101', '101', '101', '011'],
  H: ['101', '101', '101', '111', '101', '101', '101'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  J: ['011', '001', '001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '100', '110', '101', '101'],
  L: ['100', '100', '100', '100', '100', '100', '111'],
  M: ['101', '111', '101', '101', '101', '101', '101'],
  N: ['101', '111', '111', '101', '101', '101', '101'],
  O: ['010', '101', '101', '101', '101', '101', '010'],
  P: ['110', '101', '101', '110', '100', '100', '100'],
  Q: ['010', '101', '101', '101', '111', '011', '001'],
  R: ['110', '101', '101', '110', '110', '101', '101'],
  S: ['011', '100', '100', '010', '001', '001', '110'],
  T: ['111', '010', '010', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '101', '101', '010'],
  V: ['101', '101', '101', '101', '101', '010', '010'],
  W: ['101', '101', '101', '111', '111', '111', '010'],
  X: ['101', '101', '010', '010', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010', '010', '010'],
  Z: ['111', '001', '001', '010', '100', '100', '111'],
  '0': ['010', '101', '101', '101', '101', '101', '010'],
  '1': ['010', '110', '010', '010', '010', '010', '111'],
  '2': ['110', '001', '001', '010', '100', '100', '111'],
  '3': ['110', '001', '001', '010', '001', '001', '110'],
  '4': ['101', '101', '101', '111', '001', '001', '001'],
  '5': ['111', '100', '100', '110', '001', '001', '110'],
  '6': ['010', '100', '100', '110', '101', '101', '010'],
  '7': ['111', '001', '001', '010', '010', '010', '010'],
  '8': ['010', '101', '101', '010', '101', '101', '010'],
  '9': ['010', '101', '101', '011', '001', '001', '010'],
  '/': ['001', '001', '010', '010', '100', '100', '100'],
  '-': ['000', '000', '000', '111', '000', '000', '000'],
  '.': ['000', '000', '000', '000', '000', '011', '011'],
  ' ': ['00', '00', '00', '00', '00', '00', '00'],
}

// ─── Bold: programmatically expand BLOCK_FONT strokes sideways ────────────────
function boldenRow(row: string): string {
  const bits = row.split('')
  const result = [...bits]
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      if (i > 0) result[i - 1] = '1'
      if (i < bits.length - 1) result[i + 1] = '1'
    }
  }
  return result.join('')
}

function getBoldGlyph(ch: string): string[] {
  const base = BLOCK_FONT[ch] ?? BLOCK_FONT[' ']
  return base.map(boldenRow)
}

function glyphForChar(ch: string, fontStyle: PersonalizationFontStyle): string[] {
  if (fontStyle === 'slim') return SLIM_FONT[ch] ?? SLIM_FONT[' ']
  if (fontStyle === 'bold') return getBoldGlyph(ch)
  return BLOCK_FONT[ch] ?? BLOCK_FONT[' ']
}

function getCharGap(fontStyle: PersonalizationFontStyle): number {
  return fontStyle === 'slim' ? 1 : 1
}

function getGlyphWidth(fontStyle: PersonalizationFontStyle): number {
  return fontStyle === 'slim' ? 3 : 5
}

export function getPersonalizationCharLimit(width: number, fontStyle: PersonalizationFontStyle): number {
  const glyphWidth = getGlyphWidth(fontStyle)
  const charGap = getCharGap(fontStyle)
  const perChar = glyphWidth + charGap
  const limit = Math.floor((width + charGap) / perChar)
  return Math.max(2, Math.min(40, limit))
}

/** Returns the label, description and recommended grid size for each font style */
export function getFontMeta(fontStyle: PersonalizationFontStyle): { label: string; description: string; charsWide: number } {
  switch (fontStyle) {
    case 'block': return { label: 'Block',       description: 'Clean pixel letters',          charsWide: 5 }
    case 'bold':  return { label: 'Bold',        description: 'Heavy chunky strokes',          charsWide: 5 }
    case 'slim':  return { label: 'Slim',        description: 'Condensed — fits longer names', charsWide: 3 }
  }
}

/** Which font style is best for the given grid width */
export function recommendedFont(gridWidth: number): PersonalizationFontStyle {
  if (gridWidth <= 50) return 'slim'
  return 'block'
}

function colorDistance(a: string, b: string): number {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ar = (pa >> 16) & 255; const ag = (pa >> 8) & 255; const ab = pa & 255
  const br = (pb >> 16) & 255; const bg = (pb >> 8) & 255; const bb = pb & 255
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}

function getBackgroundColorIndex(pattern: PatternData): number {
  const target = '#ffffff'
  let bestIndex = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < pattern.palette.length; i++) {
    const d = colorDistance(pattern.palette[i].hex.toLowerCase(), target)
    if (d < bestDist) { bestDist = d; bestIndex = i }
  }
  return bestIndex
}

function symbolForIndex(index: number): string {
  if (index < COLOR_SYMBOLS.length) return COLOR_SYMBOLS[index]
  return String.fromCharCode(65 + ((index - COLOR_SYMBOLS.length) % 26))
}

function ensureColorInPalette(palette: ColorEntry[], hex: string): { palette: ColorEntry[]; index: number } {
  const found = palette.findIndex((p) => p.hex.toLowerCase() === hex.toLowerCase())
  if (found >= 0) return { palette, index: found }
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const nextIndex = palette.length
  return {
    index: nextIndex,
    palette: [...palette, { hex, r, g, b, symbol: symbolForIndex(nextIndex), label: 'Personalization' }],
  }
}

function buildTextRows(
  width: number,
  lines: string[],
  fontStyle: PersonalizationFontStyle,
  bgIndex: number,
  fgIndex: number,
  bgSymbol: string,
  fgSymbol: string
): Cell[][] {
  const charGap = getCharGap(fontStyle)
  const lineGap = 1
  const glyphHeight = 7

  const renderedLines = lines.map((l) => l.trim()).filter(Boolean).map((l) => l.toUpperCase())
  if (renderedLines.length === 0) return []

  const totalRows = renderedLines.length * glyphHeight + (renderedLines.length - 1) * lineGap + 2
  const rows: Cell[][] = Array.from({ length: totalRows }, () =>
    Array.from({ length: width }, () => ({ colorIndex: bgIndex, symbol: bgSymbol }))
  )

  let rowOffset = 1
  for (const line of renderedLines) {
    const glyphs = line.split('').map((ch) => glyphForChar(ch, fontStyle))
    const lineWidth = glyphs.reduce((sum, g, i) => sum + g[0].length + (i > 0 ? charGap : 0), 0)
    let x = Math.max(0, Math.floor((width - lineWidth) / 2))

    for (const glyph of glyphs) {
      for (let gy = 0; gy < glyph.length; gy++) {
        for (let gx = 0; gx < glyph[gy].length; gx++) {
          if (glyph[gy][gx] !== '1') continue
          const row = rowOffset + gy
          const col = x + gx
          if (row < 0 || row >= rows.length || col < 0 || col >= width) continue
          rows[row][col] = { colorIndex: fgIndex, symbol: fgSymbol }
        }
      }
      x += glyph[0].length + charGap
    }
    rowOffset += glyphHeight + lineGap
  }

  return rows
}

export function applyPersonalizationToPattern(pattern: PatternData, personalization: PersonalizationSettings): PatternData {
  if (!personalization.enabled) return pattern

  const lines = [personalization.titleText, personalization.dateText]
  if (lines.every((line) => !line.trim())) return pattern

  const bgIndex = getBackgroundColorIndex(pattern)
  const basePalette = [...pattern.palette]
  const targetHex =
    personalization.colorMode === 'custom'
      ? personalization.customColor
      : (basePalette[personalization.paletteColorIndex]?.hex ?? basePalette[0]?.hex ?? '#2c2218')
  const { palette, index: fgIndex } = ensureColorInPalette(basePalette, targetHex)
  const bgSymbol = palette[bgIndex]?.symbol ?? symbolForIndex(bgIndex)
  const fgSymbol = palette[fgIndex]?.symbol ?? symbolForIndex(fgIndex)
  const textRows = buildTextRows(pattern.meta.width, lines, personalization.fontStyle, bgIndex, fgIndex, bgSymbol, fgSymbol)
  if (textRows.length === 0) return pattern

  // Replace rows instead of appending — keeps the blanket exactly its declared
  // size (e.g. 65×80 stays 65×80). The text occupies the reserved edge rows;
  // the image uses the remaining rows. No size inflation, no compression.
  const patternRows = pattern.grid.length
  const textCount   = Math.min(textRows.length, Math.floor(patternRows * 0.35)) // cap at 35% of height

  const grid =
    personalization.placement === 'above'
      ? [...textRows.slice(0, textCount), ...pattern.grid.slice(textCount)]
      : [...pattern.grid.slice(0, patternRows - textCount), ...textRows.slice(0, textCount)]

  const stitchCounts = new Array(palette.length).fill(0)
  for (const row of grid) for (const cell of row) stitchCounts[cell.colorIndex] = (stitchCounts[cell.colorIndex] ?? 0) + 1
  const paletteWithCounts = palette.map((p, idx) => ({ ...p, stitchCount: stitchCounts[idx] ?? 0 }))

  return {
    ...pattern,
    palette: paletteWithCounts,
    grid,
    meta: {
      ...pattern.meta,
      height: grid.length,
      colorCount: paletteWithCounts.length,
      totalStitches: grid.length * pattern.meta.width,
    },
  }
}
