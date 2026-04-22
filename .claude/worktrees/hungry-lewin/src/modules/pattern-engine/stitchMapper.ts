/**
 * pattern-engine/stitchMapper.ts
 *
 * Maps a StitchStyle to visual rendering hints consumed by canvasRenderer
 * and (later) the PDF renderer.
 *
 * This is the only place that knows how each stitch style looks.
 * The canvas renderer reads these hints but doesn't know which style is active.
 */

import { StitchStyle } from '@/types/pattern'

export interface StitchRenderHints {
  cellShape:    'square' | 'circle' | 'diamond'
  showSymbol:   boolean
  borderRadius: number    // 0 = sharp corners, 1 = full circle
  displayName:  string
}

// Extended hints map includes legacy keys not in the StitchStyle union
// so they don't cause runtime errors when encountered in saved patterns.
const HINTS: Record<string, StitchRenderHints> = {
  graphghan: {
    cellShape:    'square',
    showSymbol:   true,
    borderRadius: 0.1,
    displayName:  'Simple Blocks',
  },
  c2c: {
    cellShape:    'diamond',
    showSymbol:   false,
    borderRadius: 0,
    displayName:  'Corner to Corner',
  },
  singleCrochet: {
    cellShape:    'square',
    showSymbol:   true,
    borderRadius: 0.05,
    displayName:  'Single Crochet',
  },
  tapestry: {
    cellShape:    'square',
    showSymbol:   true,
    borderRadius: 0,
    displayName:  'Tapestry',
  },
  crossStitch: {
    cellShape:    'square',
    showSymbol:   true,      // symbols are ESSENTIAL for cross stitch
    borderRadius: 0,
    displayName:  'Cross Stitch',
  },
}

export function getStitchHints(style: StitchStyle | string): StitchRenderHints {
  return HINTS[style] ?? HINTS['c2c']
}
