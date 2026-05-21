import type { LinearBarsConfig } from '@/lib/renderers/linearBars'
import type { FramePulseConfig } from '@/lib/renderers/framePulse'
import type { CircularSpectrumConfig } from '@/lib/renderers/circularSpectrum'
import type { WaveConfig } from '@/lib/renderers/wave'
import {
  DEFAULT_POLYGON_CONFIG,
  type PolygonSpectrumConfig,
} from '@/lib/renderers/polygonSpectrum'

export type VisualType = 'bars' | 'circular' | 'wave' | 'particles' | 'polygon'

export interface VisualizerConfig {
  visualType: VisualType
  linearBars: LinearBarsConfig
  circularSpectrum: CircularSpectrumConfig
  wave: WaveConfig
  framePulse: FramePulseConfig
  polygon: PolygonSpectrumConfig
}

export const DEFAULT_LINEAR_BARS: LinearBarsConfig = {
  barCount: 80,
  barGap: 2,
  minBarHeight: 2,
  colorStart: '#3b82f6',
  colorEnd: '#8b5cf6',
  glowEnabled: true,
  glowIntensity: 8,
  mirrorMode: false,
  smoothing: 0.15,
  displayMode: 'digital',
  dotSize: 4,
  hueInterpolation: 0,
  startFrequency: 20,
  endFrequency: 20000,
  sideMode: 'both',
}

export const DEFAULT_CIRCULAR_SPECTRUM: CircularSpectrumConfig = {
  radius: 180,
  innerRadius: 60,
  barCount: 128,
  colorStart: '#3b82f6',
  colorEnd: '#8b5cf6',
  glowEnabled: true,
  glowIntensity: 10,
  rotation: 0,
  smoothing: 0.15,
  bassPulse: true,
  hueInterpolation: 0,
  startFrequency: 20,
  endFrequency: 20000,
  sideMode: 'both',
}

export const DEFAULT_WAVE: WaveConfig = {
  colorStart: '#3b82f6',
  colorEnd: '#8b5cf6',
  lineThickness: 3,
  glowEnabled: true,
  glowIntensity: 8,
  filled: true,
  smoothing: 0.3,
  mirrorMode: false,
  hueInterpolation: 0,
  startFrequency: 20,
  endFrequency: 20000,
}

export const DEFAULT_FRAME_PULSE: FramePulseConfig = {
  enabled: true,
  baseColor: '#3b82f6',
  beatColor: '#8b5cf6',
  intensity: 0.6,
  thickness: 2,
  beatThreshold: 0.7,
}

export const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  visualType: 'bars',
  linearBars: DEFAULT_LINEAR_BARS,
  circularSpectrum: DEFAULT_CIRCULAR_SPECTRUM,
  wave: DEFAULT_WAVE,
  framePulse: DEFAULT_FRAME_PULSE,
  polygon: DEFAULT_POLYGON_CONFIG,
}
