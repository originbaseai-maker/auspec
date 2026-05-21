export interface AnalyzerConfig {
  fftSize: 2048 | 4096 | 8192
  smoothingTimeConstant: number
  minDecibels: number
  maxDecibels: number
}

export interface FrequencyData {
  raw: Uint8Array
  bass: number
  mid: number
  treble: number
  rms: number
  peak: number
  beatEnergy: number
  timeDomain: Uint8Array
}

export const DEFAULT_ANALYZER_CONFIG: AnalyzerConfig = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
}

export const FREQUENCY_BANDS = {
  bass: { startHz: 20, endHz: 250 },
  mid: { startHz: 250, endHz: 4000 },
  treble: { startHz: 4000, endHz: 20000 },
} as const

export const BEAT_HISTORY_FRAMES = 43
