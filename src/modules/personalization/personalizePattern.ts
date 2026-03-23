import { COLOR_SYMBOLS } from '@/lib/constants'
import {
  Cell,
  ColorEntry,
  PatternData,
  PersonalizationFontStyle,
  PersonalizationSettings,
} from '@/types/pattern'

const BASE_FONT: Record<string, string[]> = {
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
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
}

function glyphForChar(ch: string, fontStyle: PersonalizationFontStyle): string[] {
  const base = BASE_FONT[ch] ?? BASE_FONT[' ']
  if (fontStyle === 'vt323') {
    return base.map((row) => row.replace(/^1/, '0'))
  }
  if (fontStyle === 'silkscreen') {
    return base.map((row, i) => (i % 2 === 0 ? row : row.replace(/1/g, '0')))
  }
  if (fontStyle === 'audiowide') {
    return base.map((row) => {
      if (row.length < 5) return row
      const chars = row.split('')
      if (chars[0] === '1' && chars[1] === '1') chars[0] = '0'
      if (chars[chars.length - 1] === '1' && chars[chars.length - 2] === '1') chars[chars.length - 1] = '0'
      return chars.join('')
    })
  }
  return base
}

function getCharGap(fontStyle: PersonalizationFontStyle): number {
  return fontStyle === 'pressStart2P' ? 1 : 2
}

export function getPersonalizationCharLimit(width: number, fontStyle: PersonalizationFontStyle): number {
  // 5 cells per average glyph + style-specific gap.
  const charGap = getCharGap(fontStyle)
  const perChar = 5 + charGap
  // +charGap lets the first character fit naturally.
  const limit = Math.floor((width + charGap) / perChar)
  return Math.max(2, Math.min(30, limit))
}

function colorDistance(a: string, b: string): number {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ar = (pa >> 16) & 255
  const ag = (pa >> 8) & 255
  const ab = pa & 255
  const br = (pb >> 16) & 255
  const bg = (pb >> 8) & 255
  const bb = pb & 255
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}

function getBackgroundColorIndex(pattern: PatternData): number {
  const target = '#ffffff'
  let bestIndex = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < pattern.palette.length; i++) {
    const d = colorDistance(pattern.palette[i].hex.toLowerCase(), target)
    if (d < bestDist) {
      bestDist = d
      bestIndex = i
    }
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
    palette: [
      ...palette,
      { hex, r, g, b, symbol: symbolForIndex(nextIndex), label: 'Personalization' },
    ],
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

  const renderedLines = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.toUpperCase())

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

  const grid =
    personalization.placement === 'above'
      ? [...textRows, ...pattern.grid]
      : [...pattern.grid, ...textRows]

  const stitchCounts = new Array(palette.length).fill(0)
  for (const row of grid) {
    for (const cell of row) stitchCounts[cell.colorIndex] = (stitchCounts[cell.colorIndex] ?? 0) + 1
  }
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
