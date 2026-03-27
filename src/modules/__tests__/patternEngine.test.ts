/**
 * __tests__/patternEngine.test.ts
 *
 * Unit tests for the pattern engine — all modules that don't require a browser.
 * resize.ts requires canvas API; covered by integration tests.
 *
 * FIX #11: Tests now construct PatternData with correct `meta` shape,
 * matching the current types/pattern.ts interface.
 */

import { quantizeImage }                    from '../palette-reduction/quantize'
import { buildGrid, countStitchesPerColor } from '../pattern-engine/gridBuilder'
import { renderGrid }                       from '../preview-rendering/renderGrid'
import { rgbToHex, rgbToLab, labDistance }  from '../palette-reduction/colorUtils'
import { getStrategy, getAllStrategies, isStrategyAvailable } from '../pattern-engine/strategies/registry'
import { graphghanStrategy }                from '../pattern-engine/strategies/graphghan.strategy'
import { PixelGrid, PatternData }           from '@/types/pattern'
import type { StrategyInput }               from '../pattern-engine/strategies/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSyntheticGrid(width: number, height: number): PixelGrid {
  const data = new Uint8ClampedArray(width * height * 4)
  const colors = [
    [255, 0,   0,   255],
    [0,   255, 0,   255],
    [0,   0,   255, 255],
    [255, 255, 0,   255],
  ]
  for (let i = 0; i < width * height; i++) {
    const [r, g, b, a] = colors[i % colors.length]
    data[i * 4]     = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  }
  return { data, width, height }
}

function makeStrategyInput(width = 4, height = 4, maxColors = 4): StrategyInput {
  const pixelGrid = makeSyntheticGrid(width, height)
  const { palette, colorMap } = quantizeImage(pixelGrid, maxColors)
  return {
    pixelGrid,
    palette,
    colorMap,
    settings: {
      stitchStyle:     'graphghan',
      gridSize:        { label: 'Small', width, height },
      maxColors,
      imageType:       'photo',
      backgroundColor: '#ffffff',
      borderLayers:    [],
    },
  }
}

/** Build a valid PatternData with correct meta shape */
function makePatternData(width = 4, height = 4): PatternData {
  const input = makeStrategyInput(width, height)
  return graphghanStrategy.execute(input)
}

// ─── colorUtils ───────────────────────────────────────────────────────────────

describe('colorUtils', () => {
  test('rgbToHex produces correct hex strings', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
  })

  test('rgbToLab returns plausible L values', () => {
    const black = rgbToLab(0, 0, 0)
    const white = rgbToLab(255, 255, 255)
    expect(black.L).toBeCloseTo(0, 0)
    expect(white.L).toBeCloseTo(100, 0)
    expect(white.L).toBeGreaterThan(black.L)
  })

  test('labDistance returns 0 for identical colours', () => {
    const a = rgbToLab(255, 0, 0)
    const b = rgbToLab(255, 0, 0)
    expect(labDistance(a, b)).toBe(0)
  })

  test('labDistance greater for more different colours', () => {
    const red  = rgbToLab(255, 0, 0)
    const blue = rgbToLab(0, 0, 255)
    const pink = rgbToLab(255, 200, 200)
    expect(labDistance(red, blue)).toBeGreaterThan(labDistance(red, pink))
  })
})

// ─── quantizeImage ────────────────────────────────────────────────────────────

describe('quantizeImage', () => {
  const grid = makeSyntheticGrid(4, 4)

  test('palette does not exceed maxColors', () => {
    expect(quantizeImage(grid, 3).palette.length).toBeLessThanOrEqual(3)
  })

  test('all palette entries have valid hex strings', () => {
    const { palette } = quantizeImage(grid, 4)
    for (const entry of palette) {
      expect(entry.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  test('all palette entries have unique symbols', () => {
    const { palette } = quantizeImage(grid, 6)
    const symbols = palette.map(e => e.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })

  test('colorMap length matches pixel count', () => {
    expect(quantizeImage(grid, 4).colorMap.length).toBe(16)
  })

  test('all colorMap values are valid palette indices', () => {
    const { palette, colorMap } = quantizeImage(grid, 4)
    for (const idx of colorMap) {
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(palette.length)
    }
  })

  test('throws on invalid maxColors', () => {
    expect(() => quantizeImage(grid, 0)).toThrow()
    expect(() => quantizeImage(grid, 300)).toThrow()
  })
})

// ─── gridBuilder ──────────────────────────────────────────────────────────────

describe('buildGrid', () => {
  const grid = makeSyntheticGrid(4, 4)
  const { palette, colorMap } = quantizeImage(grid, 4)

  test('produces correct dimensions', () => {
    const result = buildGrid(colorMap, palette, 4, 4)
    expect(result.length).toBe(4)
    expect(result[0].length).toBe(4)
  })

  test('every cell has a valid colorIndex', () => {
    const result = buildGrid(colorMap, palette, 4, 4)
    for (const row of result) {
      for (const cell of row) {
        expect(cell.colorIndex).toBeGreaterThanOrEqual(0)
        expect(cell.colorIndex).toBeLessThan(palette.length)
      }
    }
  })

  test('every cell has a non-empty symbol', () => {
    const result = buildGrid(colorMap, palette, 4, 4)
    for (const row of result) {
      for (const cell of row) expect(cell.symbol.length).toBeGreaterThan(0)
    }
  })
})

describe('countStitchesPerColor', () => {
  test('total equals grid area', () => {
    const grid = makeSyntheticGrid(6, 6)
    const { palette, colorMap } = quantizeImage(grid, 4)
    const counts = countStitchesPerColor(colorMap, palette.length)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(36)
  })
})

// ─── Strategy registry ────────────────────────────────────────────────────────

describe('strategy registry', () => {
  test('getStrategy returns graphghan for "graphghan"', () => {
    expect(getStrategy('graphghan').id).toBe('graphghan')
  })

  test('getStrategy falls back to graphghan for unimplemented styles', () => {
    const strategy = getStrategy('c2c')
    expect(strategy.id).toBe('graphghan')
  })

  test('getAllStrategies returns all four registered strategies', () => {
    const ids = getAllStrategies().map(s => s.id)
    expect(ids).toContain('graphghan')
    expect(ids).toContain('c2c')
    expect(ids).toContain('singleCrochet')
    expect(ids).toContain('tapestry')
  })

  test('isStrategyAvailable true only for graphghan', () => {
    expect(isStrategyAvailable('graphghan')).toBe(true)
    expect(isStrategyAvailable('c2c')).toBe(false)
    expect(isStrategyAvailable('tapestry')).toBe(false)
  })
})

// ─── GraphghanStrategy ────────────────────────────────────────────────────────

describe('graphghanStrategy', () => {
  test('returns correct grid dimensions', () => {
    const input  = makeStrategyInput(6, 8)
    const result = graphghanStrategy.execute(input)
    expect(result.grid.length).toBe(8)
    expect(result.grid[0].length).toBe(6)
  })

  test('meta has correct shape and values', () => {
    const input  = makeStrategyInput(4, 4, 3)
    const result = graphghanStrategy.execute(input)
    expect(result.meta.stitchStyle).toBe('graphghan')
    expect(result.meta.traversalOrder).toBe('rowByRow')
    expect(result.meta.width).toBe(4)
    expect(result.meta.height).toBe(4)
    expect(result.meta.totalStitches).toBe(16)
    expect(result.meta.generatedAt).toBeDefined()
    expect(new Date(result.meta.generatedAt).toISOString()).toBe(result.meta.generatedAt)
  })

  test('palette entries have stitchCount populated', () => {
    const result = graphghanStrategy.execute(makeStrategyInput(4, 4))
    for (const entry of result.palette) {
      expect(typeof entry.stitchCount).toBe('number')
      expect(entry.stitchCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('stitch counts sum to total stitches', () => {
    const result = graphghanStrategy.execute(makeStrategyInput(5, 5))
    const total  = result.palette.reduce((s, e) => s + (e.stitchCount ?? 0), 0)
    expect(total).toBe(25)
  })

  test('does not mutate input palette', () => {
    const input    = makeStrategyInput(4, 4)
    const original = input.palette.map(e => ({ ...e }))
    graphghanStrategy.execute(input)
    for (let i = 0; i < original.length; i++) {
      expect(input.palette[i].hex).toBe(original[i].hex)
    }
  })
})

// ─── Placeholder strategies ───────────────────────────────────────────────────

describe('placeholder strategies', () => {
  const placeholders = ['c2c', 'singleCrochet', 'tapestry'] as const

  test.each(placeholders)('%s has correct id', style => {
    const s = getAllStrategies().find(s => s.id === style)
    expect(s?.id).toBe(style)
  })

  test.each(placeholders)('%s execute() throws not-implemented', style => {
    const s     = getAllStrategies().find(s => s.id === style)!
    const input = makeStrategyInput()
    expect(() => s.execute(input)).toThrow(/not yet implemented/)
  })
})

// ─── renderGrid ───────────────────────────────────────────────────────────────

describe('renderGrid', () => {
  // FIX #11: Use makePatternData() to get correct PatternData shape with meta
  const pattern = makePatternData(4, 4)

  test('cell count matches grid area', () => {
    expect(renderGrid(pattern, 14).cells.length).toBe(16)
  })

  test('totalWidth scales with cellSize', () => {
    const p1 = renderGrid(pattern, 10, 0)
    const p2 = renderGrid(pattern, 20, 0)
    expect(p2.totalWidth).toBe(p1.totalWidth * 2)
  })

  test('all cells have valid hex colours', () => {
    for (const cell of renderGrid(pattern, 14).cells) {
      expect(cell.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  test('all cell positions are non-negative', () => {
    for (const cell of renderGrid(pattern, 14).cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeGreaterThanOrEqual(0)
    }
  })
})
