import { create } from 'zustand'

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

export type ParticleShape = 'circle' | 'square' | 'star' | 'spark' | 'ring'
export type ParticleMotion = 'float' | 'rise' | 'fall' | 'explode' | 'orbit'

export interface ParticleConfig {
  enabled: boolean
  shape: ParticleShape
  motion: ParticleMotion
  density: number // 10-500 particles
  size: number // 1-20 px
  speed: number // 0.1-3 (multiplier)
  lifespan: number // 0.5-5 seconds
  fadeOut: boolean
  glowEnabled: boolean
  glowIntensity: number // 0-100

  /** Particle palette. Used when useVisualizerPalette is false. */
  palette: string[]
  /** When true, ignore `palette` and pull from the active visualizer. */
  useVisualizerPalette: boolean

  // Audio reactivity
  beatReactive: boolean
  beatBurstAmount: number // 0-100 extra particles spawned per beat
  beatSizeMultiplier: number // 1-3 — size grows on beat

  // Physics
  gravity: number // -1 to 1 (negative = upward)
  friction: number // 0.85-1 (lower = more drag)
  spread: number // 0-100 (initial random velocity spread)
}

export interface ParticleStore extends ParticleConfig {
  setEnabled: (v: boolean) => void
  setShape: (v: ParticleShape) => void
  setMotion: (v: ParticleMotion) => void
  setDensity: (v: number) => void
  setSize: (v: number) => void
  setSpeed: (v: number) => void
  setLifespan: (v: number) => void
  setFadeOut: (v: boolean) => void
  setGlowEnabled: (v: boolean) => void
  setGlowIntensity: (v: number) => void
  setPalette: (v: string[]) => void
  setUseVisualizerPalette: (v: boolean) => void
  setBeatReactive: (v: boolean) => void
  setBeatBurstAmount: (v: number) => void
  setBeatSizeMultiplier: (v: number) => void
  setGravity: (v: number) => void
  setFriction: (v: number) => void
  setSpread: (v: number) => void
  resetToDefaults: () => void
}

export const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  enabled: false,
  shape: 'circle',
  motion: 'float',
  density: 80,
  size: 3,
  speed: 1,
  lifespan: 2.5,
  fadeOut: true,
  glowEnabled: true,
  glowIntensity: 50,
  palette: ['#3b82f6', '#8b5cf6', '#ec4899'],
  useVisualizerPalette: false,
  beatReactive: true,
  beatBurstAmount: 30,
  beatSizeMultiplier: 1.5,
  gravity: 0,
  friction: 0.98,
  spread: 50,
}

export const useParticleStore = create<ParticleStore>((set) => ({
  ...DEFAULT_PARTICLE_CONFIG,
  setEnabled: (enabled) => set({ enabled }),
  setShape: (shape) => set({ shape }),
  setMotion: (motion) => set({ motion }),
  setDensity: (density) => set({ density: clamp(Math.round(density), 10, 500) }),
  setSize: (size) => set({ size: clamp(size, 1, 20) }),
  setSpeed: (speed) => set({ speed: clamp(speed, 0.1, 3) }),
  setLifespan: (lifespan) => set({ lifespan: clamp(lifespan, 0.5, 5) }),
  setFadeOut: (fadeOut) => set({ fadeOut }),
  setGlowEnabled: (glowEnabled) => set({ glowEnabled }),
  setGlowIntensity: (glowIntensity) =>
    set({ glowIntensity: clamp(glowIntensity, 0, 100) }),
  setPalette: (palette) =>
    set({ palette: palette.length >= 1 ? palette : ['#ffffff'] }),
  setUseVisualizerPalette: (useVisualizerPalette) =>
    set({ useVisualizerPalette }),
  setBeatReactive: (beatReactive) => set({ beatReactive }),
  setBeatBurstAmount: (beatBurstAmount) =>
    set({ beatBurstAmount: clamp(Math.round(beatBurstAmount), 0, 100) }),
  setBeatSizeMultiplier: (beatSizeMultiplier) =>
    set({ beatSizeMultiplier: clamp(beatSizeMultiplier, 1, 3) }),
  setGravity: (gravity) => set({ gravity: clamp(gravity, -1, 1) }),
  setFriction: (friction) => set({ friction: clamp(friction, 0.85, 1) }),
  setSpread: (spread) => set({ spread: clamp(spread, 0, 100) }),
  resetToDefaults: () => set(DEFAULT_PARTICLE_CONFIG),
}))
