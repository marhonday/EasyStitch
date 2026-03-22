/**
 * strategies/types.ts
 *
 * The StitchStrategy interface is the single contract every crochet style
 * must satisfy. Strategies receive pre-processed image data and return a
 * fully-formed PatternData — the engine dispatcher handles everything else.
 *
 * Separation of concerns:
 *   - Image resizing    → image-processing/resize.ts  (shared, runs before strategy)
 *   - Colour reduction  → palette-reduction/quantize.ts (shared, runs before strategy)
 *   - Grid assembly     → each strategy's execute() method
 *   - Rendering/PDF     → preview-rendering, pdf-export (run after, consume PatternData)
 *
 * To add a new stitch style:
 *   1. Add its id to the StitchStyle union in types/pattern.ts
 *   2. Create a new file: strategies/<name>.strategy.ts
 *   3. Implement StitchStrategy and export a singleton instance
 *   4. Register it in strategies/registry.ts
 *   That's it — generatePattern.ts needs no changes.
 */

import {
  PatternData,
  PatternSettings,
  PixelGrid,
  ColorEntry,
  ColorMap,
  StitchStyle,
  TraversalOrder,
} from '@/types/pattern'

// ─── Strategy input ───────────────────────────────────────────────────────────

/**
 * Everything a strategy needs to assemble a PatternData.
 *
 * pixelGrid and colorMap are pre-computed so each strategy focuses purely
 * on grid logic — not image processing or colour math.
 */
export interface StrategyInput {
  /** Resampled pixel data at exact grid dimensions */
  pixelGrid: PixelGrid
  /** Reduced colour palette, dark → light order */
  palette:   ColorEntry[]
  /** Flat map: pixel index → palette index */
  colorMap:  ColorMap
  /** User-selected settings for this generation run */
  settings:  PatternSettings
}

// ─── Strategy interface ───────────────────────────────────────────────────────

export interface StitchStrategy {
  /** Must match a value in the StitchStyle union */
  readonly id: StitchStyle

  /** Shown in UI settings panel */
  readonly displayName: string

  /** One-line description for beginners */
  readonly description: string

  /**
   * Reading order this strategy uses.
   * Stored in PatternMeta so PDF and preview renderers
   * can draw row numbers / diagonal guides correctly.
   */
  readonly traversalOrder: TraversalOrder

  /**
   * Assemble a PatternData from pre-processed image data.
   *
   * Contract:
   * - Must return a PatternData whose grid dimensions match
   *   settings.gridSize.width × settings.gridSize.height
   * - Must not mutate the input StrategyInput
   * - Must be synchronous (async work belongs in generatePattern.ts)
   * - Must populate palette[i].stitchCount for all palette entries
   */
  execute(input: StrategyInput): PatternData
}
