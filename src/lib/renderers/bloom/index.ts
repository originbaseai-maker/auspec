import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { drawBloomClassic } from './drawBloomClassic'

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
  // `style` lands in commit 2; default to 'classic' here so this
  // routing-only commit is a no-op behaviour change.
  const style = (config as BloomConfig & { style?: string }).style ?? 'classic'
  switch (style) {
    case 'classic':
    default:
      return drawBloomClassic(ctx, config, data, width, height)
  }
}

export { drawBloomClassic } from './drawBloomClassic'
