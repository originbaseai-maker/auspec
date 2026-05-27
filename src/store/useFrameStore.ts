import { create } from 'zustand'

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export interface FrameConfig {
  enabled: boolean
  color: string
  thickness: number // 0–40 px
  smoothness: number // 0–50 px border-radius

  haloEnabled: boolean
  haloIntensity: number // 0–100

  shadowEnabled: boolean
  shadowIntensity: number // 0–100
  shadowColor: string

  reflectionEnabled: boolean
  reflectionIntensity: number // 0–100

  pulseEnabled: boolean
  pulseIntensity: number // 0–100

  /**
   * Optional accent color flashed on beats. When set, drawFrame lerps
   * the stroke colour from `color` → `beatColor` as beatEnergy crosses
   * `beatThreshold`. Restores the legacy renderFramePulse look for
   * presets that ship a separate beat colour (Cyberpunk, Dark Neon, …).
   */
  beatColor?: string
  /** 0–1; below this, no colour shift / no beat blur. Default ~0.6. */
  beatThreshold?: number
  /**
   * 0–100 px shadow-blur applied to the stroke at peak beat. Scales
   * linearly with the same lerp amount as the colour. 0 disables.
   */
  beatBlur?: number
}

export const DEFAULT_FRAME_CONFIG: FrameConfig = {
  enabled: false,
  color: '#3b82f6',
  thickness: 0,
  smoothness: 12,

  haloEnabled: false,
  haloIntensity: 50,

  shadowEnabled: false,
  shadowIntensity: 50,
  shadowColor: '#000000',

  reflectionEnabled: false,
  reflectionIntensity: 30,

  pulseEnabled: false,
  pulseIntensity: 50,

  // Beat fields stay undefined by default — only legacy presets and
  // manual config opt in. drawFrame treats undefined as "no lerp,
  // render plain `color` at constant blur".
}

export interface FrameStore extends FrameConfig {
  setEnabled: (v: boolean) => void
  setColor: (v: string) => void
  setThickness: (v: number) => void
  setSmoothness: (v: number) => void
  setHaloEnabled: (v: boolean) => void
  setHaloIntensity: (v: number) => void
  setShadowEnabled: (v: boolean) => void
  setShadowIntensity: (v: number) => void
  setShadowColor: (v: string) => void
  setReflectionEnabled: (v: boolean) => void
  setReflectionIntensity: (v: number) => void
  setPulseEnabled: (v: boolean) => void
  setPulseIntensity: (v: number) => void
  /** Reset to defaults — used when switching to a preset without frame data. */
  resetToDefaults: () => void
  /** Replace all frame state with the given config (used when applying a preset). */
  applyConfig: (config: FrameConfig) => void
}

export const useFrameStore = create<FrameStore>((set) => ({
  ...DEFAULT_FRAME_CONFIG,

  setEnabled: (enabled) => set({ enabled }),
  setColor: (color) => set({ color }),
  setThickness: (thickness) => set({ thickness: clamp(thickness, 0, 40) }),
  setSmoothness: (smoothness) => set({ smoothness: clamp(smoothness, 0, 50) }),
  setHaloEnabled: (haloEnabled) => set({ haloEnabled }),
  setHaloIntensity: (haloIntensity) =>
    set({ haloIntensity: clamp(haloIntensity, 0, 100) }),
  setShadowEnabled: (shadowEnabled) => set({ shadowEnabled }),
  setShadowIntensity: (shadowIntensity) =>
    set({ shadowIntensity: clamp(shadowIntensity, 0, 100) }),
  setShadowColor: (shadowColor) => set({ shadowColor }),
  setReflectionEnabled: (reflectionEnabled) => set({ reflectionEnabled }),
  setReflectionIntensity: (reflectionIntensity) =>
    set({ reflectionIntensity: clamp(reflectionIntensity, 0, 100) }),
  setPulseEnabled: (pulseEnabled) => set({ pulseEnabled }),
  setPulseIntensity: (pulseIntensity) =>
    set({ pulseIntensity: clamp(pulseIntensity, 0, 100) }),

  resetToDefaults: () => set({ ...DEFAULT_FRAME_CONFIG }),
  applyConfig: (config) =>
    set({
      enabled: config.enabled,
      color: config.color,
      thickness: clamp(config.thickness, 0, 40),
      smoothness: clamp(config.smoothness, 0, 50),
      haloEnabled: config.haloEnabled,
      haloIntensity: clamp(config.haloIntensity, 0, 100),
      shadowEnabled: config.shadowEnabled,
      shadowIntensity: clamp(config.shadowIntensity, 0, 100),
      shadowColor: config.shadowColor,
      reflectionEnabled: config.reflectionEnabled,
      reflectionIntensity: clamp(config.reflectionIntensity, 0, 100),
      pulseEnabled: config.pulseEnabled,
      pulseIntensity: clamp(config.pulseIntensity, 0, 100),
    }),
}))
