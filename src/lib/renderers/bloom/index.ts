import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { drawBloomClassic } from './drawBloomClassic'
import { drawBloomOrganic } from './drawBloomOrganic'
import { drawBloomAura } from './drawBloomAura'
import { drawBloomEcho } from './drawBloomEcho'
import { drawBloomStar } from './drawBloomStar'

/**
 * Router for Bloom variants. Switches on `config.style` (defaults to
 * 'classic' for back-compat with user-created layers that predate the
 * variant system). Each variant lives in its own module and owns its
 * draw signature contract — the router just dispatches.
 *
 * Re-exports `drawBloom` so the existing import path
 * `@/lib/renderers/bloom` continues to resolve here via folder index.
 */
export function drawBloom(
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const style = config.style ?? 'classic'
  switch (style) {
    case 'classic':
      return drawBloomClassic(ctx, config, data, width, height)
    case 'organic':
      return drawBloomOrganic(ctx, config, data, width, height)
    case 'aura':
      return drawBloomAura(ctx, config, data, width, height)
    case 'echo':
      return drawBloomEcho(ctx, config, data, width, height)
    case 'star':
      return drawBloomStar(ctx, config, data, width, height)
    // 'multiRing' lands next — currently falls through to classic.
    default:
      return drawBloomClassic(ctx, config, data, width, height)
  }
}

export { drawBloomClassic } from './drawBloomClassic'
