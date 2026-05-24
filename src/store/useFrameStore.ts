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
}

export const useFrameStore = create<FrameStore>((set) => ({
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
}))
