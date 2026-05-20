import { create } from 'zustand'
import type { LinearBarsConfig } from '@/lib/renderers/linearBars'
import type { FramePulseConfig } from '@/lib/renderers/framePulse'
import {
  DEFAULT_VISUALIZER_CONFIG,
  type VisualizerConfig,
} from '@/lib/visualizerConfig'

export type VisualType = 'bars' | 'circular' | 'wave' | 'particles'
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

  setVisualType: (type: VisualType) => void
  setPrimaryColor: (color: string) => void
  setSensitivity: (value: number) => void
  setGlowEnabled: (enabled: boolean) => void
  setCanvasRatio: (ratio: CanvasRatio) => void
  setVisualizerConfig: (config: Partial<VisualizerConfig>) => void
  updateLinearBars: (config: Partial<LinearBarsConfig>) => void
  updateFramePulse: (config: Partial<FramePulseConfig>) => void
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

  setVisualType: (visualType) => set({ visualType }),
  setPrimaryColor: (primaryColor) => set({ primaryColor }),
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
      visualizerConfig: {
        ...state.visualizerConfig,
        linearBars: { ...state.visualizerConfig.linearBars, ...config },
      },
    })),

  updateFramePulse: (config) =>
    set((state) => ({
      visualizerConfig: {
        ...state.visualizerConfig,
        framePulse: { ...state.visualizerConfig.framePulse, ...config },
      },
    })),
}))
