import type { HaloLayerConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'

/**
 * Router for the 5 Halo styles. Each style ships in its own file
 * and is wired in here as it lands. Until commit 2, this is a
 * no-op stub so the layer type exists but renders nothing — keeps
 * the build green while the renderers are added one-at-a-time.
 *
 * Position resolution: when config.lockToLogo is true, the caller
 * (VisualizerCanvas) passes the live Logo position as `logoPos`;
 * the router prefers that over config.offsetX/Y. When unset or
 * locked off, falls back to config.offsetX/Y.
 */
export function drawHaloLayer(
  ctx: CanvasRenderingContext2D,
  config: HaloLayerConfig,
  data: FrequencyData,
  width: number,
  height: number,
  logoPos: { x: number; y: number } | null,
): void {
  // Resolve effective centre — lockToLogo + live Logo position wins,
  // otherwise the config's own offsetX/Y. Renderers downstream read
  // these via the resolved config so they don't need to know about
  // the link.
  const effective: HaloLayerConfig = {
    ...config,
    offsetX: config.lockToLogo && logoPos ? logoPos.x : config.offsetX,
    offsetY: config.lockToLogo && logoPos ? logoPos.y : config.offsetY,
  }
  void effective
  void ctx
  void data
  void width
  void height
  // Renderers land in commits 2–6.
}
