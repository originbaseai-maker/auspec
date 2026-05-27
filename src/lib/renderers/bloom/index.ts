import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { drawBloomClassic } from './drawBloomClassic'
import { drawBloomOrganic } from './drawBloomOrganic'
import { drawBloomAura } from './drawBloomAura'
import { drawBloomEcho } from './drawBloomEcho'
import { drawBloomStar } from './drawBloomStar'
import { drawBloomMultiRing } from './drawBloomMultiRing'
import { withEcho } from './withEcho'

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
      // Classic now renders a SINGLE ring; the echo wrapper multiplies
      // it into N concentric copies. Preserves the original visual.
      return withEcho(drawBloomClassic, ctx, config, data, width, height)
    case 'organic':
      return withEcho(drawBloomOrganic, ctx, config, data, width, height)
    case 'aura':
      return withEcho(drawBloomAura, ctx, config, data, width, height)
    case 'echo':
      // 'echo' variant has its own multi-pass mirroring; wrapping in
      // withEcho would multiply the count exponentially and look noisy.
      return drawBloomEcho(ctx, config, data, width, height)
    case 'star':
      return withEcho(drawBloomStar, ctx, config, data, width, height)
    case 'multiRing':
      // Already a concentric-ring composition by design.
      return drawBloomMultiRing(ctx, config, data, width, height)
    default:
      return withEcho(drawBloomClassic, ctx, config, data, width, height)
  }
}

export { drawBloomClassic } from './drawBloomClassic'
