/**
 * strategies/registry.ts
 *
 * Central registry for all stitch strategies.
 *
 * generatePattern.ts resolves strategies through here — it never imports
 * individual strategy files directly. This keeps the dispatcher decoupled
 * from concrete implementations.
 *
 * To register a new strategy:
 *   1. Import its singleton
 *   2. Add it to the `strategies` array below
 *   That's the only file change needed outside the strategy itself.
 */

import { StitchStyle }       from '@/types/pattern'
import { StitchStrategy }    from './types'
import { graphghanStrategy } from './graphghan.strategy'
import { c2cStrategy }       from './c2c.strategy'
import { singleCrochetStrategy } from './singleCrochet.strategy'
import { tapestryStrategy }  from './tapestry.strategy'
import { STITCH_STYLE_META } from '@/lib/constants'

// ─── Registration ─────────────────────────────────────────────────────────────

const strategies: StitchStrategy[] = [
  graphghanStrategy,
  c2cStrategy,
  singleCrochetStrategy,
  tapestryStrategy,
]

// Build a lookup map keyed by strategy id for O(1) access
const strategyMap = new Map<StitchStyle, StitchStrategy>(
  strategies.map(s => [s.id, s])
)

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up a strategy by StitchStyle id.
 * Falls back to graphghan if the requested style is not found —
 * this means placeholder strategies never break the generation pipeline.
 */
export function getStrategy(style: StitchStyle): StitchStrategy {
  const strategy = strategyMap.get(style)

  if (!strategy) {
    console.warn(`No strategy registered for "${style}". Falling back to graphghan.`)
    return graphghanStrategy
  }

  return strategy
}

/**
 * Return all registered strategies.
 * Used by the settings UI to list available (and coming-soon) options.
 */
export function getAllStrategies(): StitchStrategy[] {
  return strategies
}

/**
 * Check whether a strategy has a working implementation.
 * Single source of truth: STITCH_STYLE_META in constants.ts
 */
export function isStrategyAvailable(style: StitchStyle): boolean {
  return STITCH_STYLE_META[style]?.available === true
}
