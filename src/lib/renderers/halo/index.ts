import type { HaloLayerConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { drawHaloRadialBurst } from './drawHaloRadialBurst'
import { drawHaloSpectrumCrown } from './drawHaloSpectrumCrown'
import { drawHaloPulseFrame } from './drawHaloPulseFrame'
import { drawHaloFlame } from './drawHaloFlame'

/**
 * Router for the 5 Halo styles. Each style ships in its own file
 * and is wired in here as it lands. Styles not yet implemented
 * fall through to radialBurst as a sensible placeholder.
 *
 * Position resolution: when config.lockToLogo is true, the caller
 * (VisualizerCanvas) passes the live Logo position as `logoPos`;
 * the router prefers that over config.offsetX/Y. When unset or
 * locked off, falls back to config.offsetX/Y. Resolution happens
 * here so individual renderers never need to know about the link.
 */
export function drawHaloLayer(
  ctx: CanvasRenderingContext2D,
  config: HaloLayerConfig,
  data: FrequencyData,
  width: number,
  height: number,
  logoPos: { x: number; y: number } | null,
): void {
  const effective: HaloLayerConfig = {
    ...config,
    offsetX: config.lockToLogo && logoPos ? logoPos.x : config.offsetX,
    offsetY: config.lockToLogo && logoPos ? logoPos.y : config.offsetY,
  }
  switch (effective.style) {
    case 'radialBurst':
      return drawHaloRadialBurst(ctx, effective, data, width, height)
    case 'spectrumCrown':
      return drawHaloSpectrumCrown(ctx, effective, data, width, height)
    case 'pulseFrame':
      return drawHaloPulseFrame(ctx, effective, data, width, height)
    case 'flame':
      return drawHaloFlame(ctx, effective, data, width, height)
    // 'orbit' lands next — falls through to radialBurst.
    default:
      return drawHaloRadialBurst(ctx, effective, data, width, height)
  }
}
