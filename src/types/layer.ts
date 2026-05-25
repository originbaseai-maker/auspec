import type { LinearBarsConfig } from '@/lib/renderers/linearBars'
import type { CircularSpectrumConfig } from '@/lib/renderers/circularSpectrum'
import type { WaveConfig } from '@/lib/renderers/wave'
import type { PolygonSpectrumConfig } from '@/lib/renderers/polygonSpectrum'

export type LayerType = 'bars' | 'circular' | 'wave' | 'polygon'

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

export type LayerData = BarsLayer | CircularLayer | WaveLayer | PolygonLayer

export interface LayerState {
  enabled: boolean
  locked: boolean
  /** Lower = rendered first (back); higher = rendered last (front). */
  zOrder: number
}

export type Layer = LayerData &
  LayerState & {
    /** Equals `type` since V1 caps at one layer per visualizer type. */
    id: LayerType
    name: string
  }

export const LAYER_LABELS: Record<LayerType, string> = {
  bars: 'Bars',
  circular: 'Circular',
  wave: 'Wave',
  polygon: 'Polygon',
}

export const LAYER_TYPES: readonly LayerType[] = [
  'bars',
  'circular',
  'wave',
  'polygon',
] as const
