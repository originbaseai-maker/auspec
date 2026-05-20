import { create } from 'zustand'
import type { LinearBarsConfig } from '@/lib/renderers/linearBars'
import type { FramePulseConfig } from '@/lib/renderers/framePulse'
import type { CircularSpectrumConfig } from '@/lib/renderers/circularSpectrum'
import type { WaveConfig } from '@/lib/renderers/wave'
import type { PolygonSpectrumConfig } from '@/lib/renderers/polygonSpectrum'
import {
  DEFAULT_VISUALIZER_CONFIG,
  type VisualizerConfig,
  type VisualType,
} from '@/lib/visualizerConfig'
import type { Preset } from '@/lib/presets'

export type { VisualType }
export type CanvasRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9'

export interface VisualizerStore {
  visualType: VisualType
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  sensitivity: number
  glowEnabled: boolean
  canvasRatio: CanvasRatio
  visualizerConfig: VisualizerConfig
  activePresetId: string | null

  setVisualType: (type: VisualType) => void
  setPrimaryColor: (color: string) => void
  setSecondaryColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  setSensitivity: (value: number) => void
  setGlowEnabled: (enabled: boolean) => void
  setCanvasRatio: (ratio: CanvasRatio) => void
  setVisualizerConfig: (config: Partial<VisualizerConfig>) => void
  updateLinearBars: (config: Partial<LinearBarsConfig>) => void
  updateCircularSpectrum: (config: Partial<CircularSpectrumConfig>) => void
  updateWave: (config: Partial<WaveConfig>) => void
  updateFramePulse: (config: Partial<FramePulseConfig>) => void
  updatePolygon: (config: Partial<PolygonSpectrumConfig>) => void
  applyPreset: (preset: Preset) => void
}

export const useVisualizerStore = create<VisualizerStore>((set) => ({
  visualType: 'bars',
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#000000',
  sensitivity: 75,
  glowEnabled: true,
  canvasRatio: '16:9',
  visualizerConfig: DEFAULT_VISUALIZER_CONFIG,
  activePresetId: null,

  setVisualType: (visualType) =>
    set((state) => ({
      visualType,
      activePresetId: null,
      visualizerConfig: { ...state.visualizerConfig, visualType },
    })),
  setPrimaryColor: (primaryColor) => set({ primaryColor, activePresetId: null }),
  setSecondaryColor: (secondaryColor) => set({ secondaryColor, activePresetId: null }),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  setGlowEnabled: (glowEnabled) => set({ glowEnabled }),
  setCanvasRatio: (canvasRatio) => set({ canvasRatio }),

  setVisualizerConfig: (config) =>
    set((state) => ({
      visualizerConfig: {
        ...state.visualizerConfig,
        ...config,
      },
    })),

  updateLinearBars: (config) =>
    set((state) => ({
      activePresetId: null,
      visualizerConfig: {
        ...state.visualizerConfig,
        linearBars: { ...state.visualizerConfig.linearBars, ...config },
      },
    })),

  updateCircularSpectrum: (config) =>
    set((state) => ({
      activePresetId: null,
      visualizerConfig: {
        ...state.visualizerConfig,
        circularSpectrum: { ...state.visualizerConfig.circularSpectrum, ...config },
      },
    })),

  updateWave: (config) =>
    set((state) => ({
      activePresetId: null,
      visualizerConfig: {
        ...state.visualizerConfig,
        wave: { ...state.visualizerConfig.wave, ...config },
      },
    })),

  updateFramePulse: (config) =>
    set((state) => ({
      activePresetId: null,
      visualizerConfig: {
        ...state.visualizerConfig,
        framePulse: { ...state.visualizerConfig.framePulse, ...config },
      },
    })),

  updatePolygon: (config) =>
    set((state) => ({
      activePresetId: null,
      visualizerConfig: {
        ...state.visualizerConfig,
        polygon: { ...state.visualizerConfig.polygon, ...config },
      },
    })),

  applyPreset: (preset) =>
    set((state) => {
      const merged: VisualizerConfig = {
        ...state.visualizerConfig,
        ...preset.config,
        visualType: preset.visualType,
        linearBars: {
          ...state.visualizerConfig.linearBars,
          ...(preset.config.linearBars ?? {}),
        },
        circularSpectrum: {
          ...state.visualizerConfig.circularSpectrum,
          ...(preset.config.circularSpectrum ?? {}),
        },
        wave: {
          ...state.visualizerConfig.wave,
          ...(preset.config.wave ?? {}),
        },
        framePulse: {
          ...state.visualizerConfig.framePulse,
          ...(preset.config.framePulse ?? {}),
        },
        polygon: {
          ...state.visualizerConfig.polygon,
          ...(preset.config.polygon ?? {}),
        },
      }

      // Sync top-level colors with the new visualType's primary/secondary
      let primaryColor = state.primaryColor
      let secondaryColor = state.secondaryColor
      if (preset.visualType === 'bars') {
        primaryColor = merged.linearBars.colorStart
        secondaryColor = merged.linearBars.colorEnd
      } else if (preset.visualType === 'circular') {
        primaryColor = merged.circularSpectrum.colorStart
        secondaryColor = merged.circularSpectrum.colorEnd
      } else if (preset.visualType === 'wave') {
        primaryColor = merged.wave.colorStart
        secondaryColor = merged.wave.colorEnd
      } else if (preset.visualType === 'polygon') {
        primaryColor = merged.polygon.colorStart
        secondaryColor = merged.polygon.colorEnd
      }

      return {
        visualType: preset.visualType,
        visualizerConfig: merged,
        primaryColor,
        secondaryColor,
        backgroundColor: preset.backgroundColor ?? state.backgroundColor,
        glowEnabled:
          preset.visualType === 'bars'
            ? merged.linearBars.glowEnabled
            : preset.visualType === 'circular'
              ? merged.circularSpectrum.glowEnabled
              : preset.visualType === 'wave'
                ? merged.wave.glowEnabled
                : preset.visualType === 'polygon'
                  ? merged.polygon.glowEnabled
                  : state.glowEnabled,
        activePresetId: preset.id,
      }
    }),
}))
