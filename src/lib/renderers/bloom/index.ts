import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { drawBloomClassic } from './drawBloomClassic'
import { drawBloomOrganic } from './drawBloomOrganic'

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
    // 'aura' / 'echo' / 'star' / 'multiRing' land in subsequent
    // commits — they currently fall through to classic.
    default:
      return drawBloomClassic(ctx, config, data, width, height)
  }
}

export { drawBloomClassic } from './drawBloomClassic'
