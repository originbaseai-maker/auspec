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
import { useFrameStore } from './useFrameStore'
import { useLayerStore } from './useLayerStore'
import { LAYER_LABELS, type Layer, type LayerType } from '@/types/layer'

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

  applyPreset: (preset) => {
    // Frame state is a separate store, so reset/apply it explicitly here.
    // Without this, the previous preset's frame stays active and layers
    // over the new one.
    const frameStore = useFrameStore.getState()
    if (preset.frameConfig) {
      frameStore.applyConfig(preset.frameConfig)
    } else {
      frameStore.resetToDefaults()
    }

    // Sync the layer store so the new render path (layer iteration) sees
    // the preset. Preserves the legacy "preset switches to type X"
    // behavior by enabling ONLY the preset's visualType; others disabled.
    const layerStore = useLayerStore.getState()
    const presetType = preset.visualType
    const isValidLayerType = (t: string): t is LayerType =>
      t === 'bars' || t === 'circular' || t === 'wave' || t === 'polygon'
    const baseLayers = layerStore.layers

    // Explicit literal-typed objects so the discriminated union narrows
    // correctly per layer (one shared helper widens it).
    const newLayers: Record<LayerType, Layer> = {
      bars: {
        type: 'bars',
        id: 'bars',
        name: LAYER_LABELS.bars,
        enabled: presetType === 'bars',
        locked: baseLayers.bars.locked,
        zOrder: 0,
        config: {
          ...(baseLayers.bars.config as LinearBarsConfig),
          ...(preset.config.linearBars ?? {}),
        },
      },
      circular: {
        type: 'circular',
        id: 'circular',
        name: LAYER_LABELS.circular,
        enabled: presetType === 'circular',
        locked: baseLayers.circular.locked,
        zOrder: 1,
        config: {
          ...(baseLayers.circular.config as CircularSpectrumConfig),
          ...(preset.config.circularSpectrum ?? {}),
        },
      },
      wave: {
        type: 'wave',
        id: 'wave',
        name: LAYER_LABELS.wave,
        enabled: presetType === 'wave',
        locked: baseLayers.wave.locked,
        zOrder: 2,
        config: {
          ...(baseLayers.wave.config as WaveConfig),
          ...(preset.config.wave ?? {}),
        },
      },
      polygon: {
        type: 'polygon',
        id: 'polygon',
        name: LAYER_LABELS.polygon,
        enabled: presetType === 'polygon',
        locked: baseLayers.polygon.locked,
        zOrder: 3,
        config: {
          ...(baseLayers.polygon.config as PolygonSpectrumConfig),
          ...(preset.config.polygon ?? {}),
        },
      },
    }
    layerStore.replaceLayers(newLayers)
    layerStore.setActiveLayer(
      isValidLayerType(presetType) ? presetType : 'bars',
    )

    set((state) => {
      const merged: VisualizerConfig = {
        ...state.visualizerConfig,
        ...(preset.config as Partial<VisualizerConfig>),
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

      // Derive top-level mirror fields from the active visual type so every
      // sidebar control reflects the new preset.
      let primaryColor = state.primaryColor
      let secondaryColor = state.secondaryColor
      let glowEnabled = state.glowEnabled

      const vt = preset.visualType
      if (vt === 'bars') {
        primaryColor = merged.linearBars.colorStart
        secondaryColor = merged.linearBars.colorEnd
        glowEnabled = merged.linearBars.glowEnabled
      } else if (vt === 'circular') {
        primaryColor = merged.circularSpectrum.colorStart
        secondaryColor = merged.circularSpectrum.colorEnd
        glowEnabled = merged.circularSpectrum.glowEnabled
      } else if (vt === 'wave') {
        primaryColor = merged.wave.colorStart
        secondaryColor = merged.wave.colorEnd
        glowEnabled = merged.wave.glowEnabled
      } else if (vt === 'polygon') {
        primaryColor = merged.polygon.colorStart
        secondaryColor = merged.polygon.colorEnd
        glowEnabled = merged.polygon.glowEnabled
      }

      return {
        visualType: preset.visualType,
        visualizerConfig: merged,
        primaryColor,
        secondaryColor,
        backgroundColor: preset.backgroundColor ?? state.backgroundColor,
        glowEnabled,
        sensitivity: preset.sensitivity ?? state.sensitivity,
        activePresetId: preset.id,
      }
    })
  },
}))
