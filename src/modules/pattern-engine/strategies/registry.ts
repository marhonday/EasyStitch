import { StitchStyle }           from '@/types/pattern'
import { StitchStrategy }        from './types'
import { c2cStrategy }           from './c2c.strategy'
import { singleCrochetStrategy } from './singleCrochet.strategy'
import { tapestryStrategy }                               from './tapestry.strategy'
import { mosaicStrategy }                                from './mosaic.strategy'
import { knittingStrandedStrategy, knittingIntarsiaStrategy } from './knitting.strategy'
import { STITCH_STYLE_META }     from '@/lib/constants'

const strategies: StitchStrategy[] = [
  c2cStrategy,
  singleCrochetStrategy,
  tapestryStrategy,
  mosaicStrategy,
  knittingStrandedStrategy,
  knittingIntarsiaStrategy,
]

const strategyMap = new Map<StitchStyle, StitchStrategy>(
  strategies.map(s => [s.id, s])
)

export function getStrategy(style: StitchStyle): StitchStrategy {
  return strategyMap.get(style) ?? c2cStrategy
}

export function getAllStrategies(): StitchStrategy[] {
  return strategies
}

export function isStrategyAvailable(style: StitchStyle): boolean {
  return STITCH_STYLE_META[style]?.available === true
}
