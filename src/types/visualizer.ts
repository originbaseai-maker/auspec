export interface LinearBarsConfig {
  barCount: number
  barGap: number
  minBarHeight: number
  colorStart: string
  colorEnd: string
  glowEnabled: boolean
  glowIntensity: number
  mirrorMode: boolean
  smoothing: number
}

export interface FramePulseConfig {
  enabled: boolean
  baseColor: string
  beatColor: string
  intensity: number
  thickness: number
  beatThreshold: number
}

export interface VisualizerConfig {
  linearBars: LinearBarsConfig
  framePulse: FramePulseConfig
}

export const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  linearBars: {
    barCount: 80,
    barGap: 2,
    minBarHeight: 2,
    colorStart: '#3b82f6',
    colorEnd: '#8b5cf6',
    glowEnabled: true,
    glowIntensity: 8,
    mirrorMode: false,
    smoothing: 0.15,
  },
  framePulse: {
    enabled: true,
    baseColor: '#3b82f6',
    beatColor: '#8b5cf6',
    intensity: 0.6,
    thickness: 2,
    beatThreshold: 0.7,
  },
}
