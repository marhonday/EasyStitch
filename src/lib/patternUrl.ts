/**
 * patternUrl.ts
 *
 * Encodes a PatternData into a compact shareable URL and decodes it back.
 *
 * Encoding:
 *   - Palette  → hex values (no #) joined by comma  →  ?c=e8786e,89a882,...
 *   - Grid     → run-length encoded flat array       →  ?g=4A2B1C...
 *   - Dims     → width, height, stitchStyle          →  ?w=65&h=80&s=c2c
 *
 * RLE format: optional-count + char-code-for-color-index
 *   e.g. "4A2B1C" = four of color 0, two of color 1, one of color 2
 *   CHARS maps colorIndex → single char ('0'-'9','a'-'z' = indices 0-35)
 *
 * Typical 65×80 C2C pattern with 8 colours ≈ 2–4 KB in the URL.
 */

import { PatternData, ColorEntry, Cell, StitchStyle } from '@/types/pattern'

const CHARS   = '0123456789abcdefghijklmnopqrstuvwxyz'
const SYMBOLS = ['■','●','▲','◆','○','□','◇','★','☆','♦','♥','♣','♠','✦','✧','◉']

export function encodePatternToUrl(pattern: PatternData): string {
  const { palette, grid, meta } = pattern

  // Palette — hex without #, comma-separated
  const c = palette.map(p => p.hex.replace('#', '')).join(',')

  // Flatten grid to array of colorIndex
  const flat = grid.flatMap(row => row.map(cell => cell.colorIndex))

  // RLE encode
  let rle = ''
  let run  = 1
  let prev = flat[0]
  for (let i = 1; i < flat.length; i++) {
    if (flat[i] === prev) {
      run++
    } else {
      rle += (run > 1 ? run : '') + CHARS[prev]
      prev = flat[i]
      run  = 1
    }
  }
  rle += (run > 1 ? run : '') + CHARS[prev]

  const params = new URLSearchParams({
    c,
    g: rle,
    w: String(meta.width),
    h: String(meta.height),
    s: meta.stitchStyle,
  })

  return `${window.location.origin}/p?${params.toString()}`
}

export function decodePatternFromSearch(search: string): PatternData | null {
  try {
    const params     = new URLSearchParams(search)
    const cParam     = params.get('c')
    const gParam     = params.get('g')
    const width      = parseInt(params.get('w') ?? '')
    const height     = parseInt(params.get('h') ?? '')
    const stitchStyle = (params.get('s') ?? 'c2c') as StitchStyle

    if (!cParam || !gParam || !width || !height) return null

    // Decode palette
    const palette: ColorEntry[] = cParam.split(',').map((hex, i) => {
      const r  = parseInt(hex.slice(0, 2), 16)
      const gr = parseInt(hex.slice(2, 4), 16)
      const b  = parseInt(hex.slice(4, 6), 16)
      return {
        hex:         `#${hex}`,
        r, g: gr, b,
        symbol:      SYMBOLS[i % SYMBOLS.length],
        label:       `Colour ${i + 1}`,
        population:  1,
        stitchCount: 0,
      }
    })

    // Decode RLE → flat array of colorIndex
    const flat: number[] = []
    let pos = 0
    while (pos < gParam.length) {
      let numStr = ''
      while (pos < gParam.length && gParam[pos] >= '0' && gParam[pos] <= '9') {
        numStr += gParam[pos++]
      }
      if (pos >= gParam.length) break
      const ch       = gParam[pos++]
      const colorIdx = CHARS.indexOf(ch)
      if (colorIdx === -1) return null
      const count = numStr ? parseInt(numStr) : 1
      for (let j = 0; j < count; j++) flat.push(colorIdx)
    }

    if (flat.length !== width * height) return null

    // Count stitches per palette entry
    const counts = new Array(palette.length).fill(0)
    flat.forEach(ci => { if (ci >= 0 && ci < palette.length) counts[ci]++ })
    palette.forEach((p, i) => { p.stitchCount = counts[i] })

    // Build grid
    const grid: Cell[][] = Array.from({ length: height }, (_, r) =>
      Array.from({ length: width }, (_, c) => {
        const ci = flat[r * width + c]
        return { colorIndex: ci, symbol: palette[ci]?.symbol ?? '■' }
      })
    )

    return {
      palette,
      grid,
      meta: {
        width, height, stitchStyle,
        traversalOrder: stitchStyle === 'c2c' ? 'diagonal' : 'rowByRow',
        colorCount:     palette.length,
        totalStitches:  width * height,
        generatedAt:    new Date().toISOString(),
      },
    }
  } catch {
    return null
  }
}
