import { create } from 'zustand'
import { BUILT_IN_PRESETS, type Preset } from '@/lib/presets'
import type { VisualizerConfig, VisualType } from '@/lib/visualizerConfig'

const STORAGE_KEY = 'auspec-user-presets'

function loadFromStorage(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Preset[]) : []
  } catch {
    return []
  }
}

function saveToStorage(presets: Preset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {
    /* ignore quota / private mode errors */
  }
}

export interface PresetStore {
  userPresets: Preset[]
  /** Saves the current visualizer state as a new user preset and returns it. */
  saveCurrentAsPreset: (
    name: string,
    visualType: VisualType,
    config: Partial<VisualizerConfig>,
    backgroundColor: string,
  ) => Preset
  renamePreset: (id: string, newName: string) => void
  deletePreset: (id: string) => void
  isBuiltIn: (id: string) => boolean
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  userPresets: loadFromStorage(),

  saveCurrentAsPreset: (name, visualType, config, backgroundColor) => {
    const newPreset: Preset = {
      id: `user-${Date.now()}`,
      name,
      visualType,
      description: 'Custom preset',
      backgroundColor,
      config,
    }
    const updated = [...get().userPresets, newPreset]
    saveToStorage(updated)
    set({ userPresets: updated })
    return newPreset
  },

  renamePreset: (id, newName) => {
    if (get().isBuiltIn(id)) return
    const updated = get().userPresets.map((p) =>
      p.id === id ? { ...p, name: newName } : p,
    )
    saveToStorage(updated)
    set({ userPresets: updated })
  },

  deletePreset: (id) => {
    if (get().isBuiltIn(id)) return
    const updated = get().userPresets.filter((p) => p.id !== id)
    saveToStorage(updated)
    set({ userPresets: updated })
  },

  isBuiltIn: (id) => BUILT_IN_PRESETS.some((p) => p.id === id),
}))
