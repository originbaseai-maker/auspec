import type { LinearBarsConfig } from '@/lib/renderers/linearBars'
import type { CircularSpectrumConfig } from '@/lib/renderers/circularSpectrum'
import type { WaveConfig } from '@/lib/renderers/wave'
import type { PolygonSpectrumConfig } from '@/lib/renderers/polygonSpectrum'
import type { ParticleConfig } from '@/store/useParticleStore'
import type { FrameConfig } from '@/store/useFrameStore'
import type { CropMode } from '@/types/coverArt'

export type LayerType =
  | 'bars'
  | 'circular'
  | 'wave'
  | 'polygon'
  | 'particles'
  | 'logo'
  | 'frame'

export interface BarsLayer {
  type: 'bars'
  config: LinearBarsConfig
}
export interface CircularLayer {
  type: 'circular'
  config: CircularSpectrumConfig
}
export interface WaveLayer {
  type: 'wave'
  config: WaveConfig
}
export interface PolygonLayer {
  type: 'polygon'
  config: PolygonSpectrumConfig
}
export interface ParticlesLayer {
  type: 'particles'
  config: ParticleConfig
}

/**
 * Per-layer logo configuration. The IMAGE itself lives in
 * `useCoverArtStore.logo` (shared across all logo layers in V1 — users
 * upload one image, can show it in multiple places). Each LogoLayer
 * provides its own size / position / crop / sync setting.
 */
export interface LogoLayerConfig {
  /** Fraction of min(width, height). 0.1–1.0. */
  logoSize: number
  logoCropMode: CropMode
  /** Center position 0–1. */
  position: { x: number; y: number }
  /** Auto-sync to a circular/polygon layer's radius (V1: still global behavior). */
  autoLogoSync: boolean
}

export interface LogoLayer {
  type: 'logo'
  config: LogoLayerConfig
}

export interface FrameLayer {
  type: 'frame'
  config: FrameConfig
}

export type LayerData =
  | BarsLayer
  | CircularLayer
  | WaveLayer
  | PolygonLayer
  | ParticlesLayer
  | LogoLayer
  | FrameLayer

export interface LayerState {
  /** Unique across all layers. UUID in modern browsers, fallback for old. */
  id: string
  /** User-editable; auto-generated on add ("Circular", "Circular 2", …). */
  name: string
  enabled: boolean
  locked: boolean
  /** Lower = back, higher = front. */
  zOrder: number
  /** Wall-clock timestamp at creation, used as a stable tie-break for sort. */
  createdAt: number
}

export type Layer = LayerData & LayerState

export const LAYER_LABELS: Record<LayerType, string> = {
  bars: 'Bars',
  circular: 'Circular',
  wave: 'Wave',
  polygon: 'Polygon',
  particles: 'Particles',
  logo: 'Logo',
  frame: 'Frame',
}

export const LAYER_TYPES: readonly LayerType[] = [
  'bars',
  'circular',
  'wave',
  'polygon',
  'particles',
  'logo',
  'frame',
] as const

export const DEFAULT_LOGO_LAYER_CONFIG: LogoLayerConfig = {
  logoSize: 0.25,
  logoCropMode: 'square',
  position: { x: 0.5, y: 0.5 },
  autoLogoSync: true,
}

/**
 * Pick the next free name for a new layer of `type`. Uses the existing
 * names (case-insensitive) to avoid collisions so the first "Circular"
 * is just "Circular" and a second becomes "Circular 2".
 */
export function generateLayerName(
  type: LayerType,
  existingNames: string[],
): string {
  const base = LAYER_LABELS[type]
  const used = new Set(existingNames.map((n) => n.toLowerCase()))
  if (!used.has(base.toLowerCase())) return base
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base} ${i}`
    if (!used.has(candidate.toLowerCase())) return candidate
  }
  return `${base} ${Date.now()}`
}
