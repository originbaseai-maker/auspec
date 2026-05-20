import type { LinearBarsConfig } from '@/lib/renderers/linearBars'
import type { FramePulseConfig } from '@/lib/renderers/framePulse'

export interface VisualizerConfig {
  linearBars: LinearBarsConfig
  framePulse: FramePulseConfig
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
  linearBars: DEFAULT_LINEAR_BARS,
  framePulse: DEFAULT_FRAME_PULSE,
}
