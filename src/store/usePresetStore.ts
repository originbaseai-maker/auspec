import { create } from 'zustand'
import { BUILT_IN_PRESETS, type Preset } from '@/lib/presets'
import type { VisualizerConfig, VisualType } from '@/lib/visualizerConfig'
import { useFrameStore, type FrameConfig } from './useFrameStore'
import { useLayerStore } from './useLayerStore'
import type { Layer } from '@/types/layer'

const STORAGE_KEY = 'auspec-user-presets'
const HIDDEN_STORAGE_KEY = 'auspec-builtin-hidden'
const FAVORITES_STORAGE_KEY = 'auspec-preset-favorites'
const MAX_FAVORITES = 6

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

function loadHidden(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveHidden(arr: string[]): void {
  try {
    localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(arr))
  } catch {
    /* ignore */
  }
}

function defaultFavorites(): string[] {
  return BUILT_IN_PRESETS.slice(0, MAX_FAVORITES).map((p) => p.id)
}

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return defaultFavorites()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return defaultFavorites()
    return (parsed as unknown[])
      .filter((v): v is string => typeof v === 'string')
      .slice(0, MAX_FAVORITES)
  } catch {
    return defaultFavorites()
  }
}

function saveFavorites(arr: string[]): void {
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(arr.slice(0, MAX_FAVORITES)),
    )
  } catch {
    /* ignore */
  }
}

export const MAX_PRESET_FAVORITES = MAX_FAVORITES

export interface PresetStore {
  userPresets: Preset[]
  builtInHidden: string[]
  favorites: string[]

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
  hideBuiltIn: (id: string) => void
  restoreAllBuiltIn: () => void

  // Favorites
  toggleFavorite: (id: string) => void
  reorderFavorites: (fromIndex: number, toIndex: number) => void
  isFavorite: (id: string) => boolean
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  userPresets: loadFromStorage(),
  builtInHidden: loadHidden(),
  favorites: loadFavorites(),

  saveCurrentAsPreset: (name, visualType, config, backgroundColor) => {
    const frameState = useFrameStore.getState()
    const frameConfig: FrameConfig = {
      enabled: frameState.enabled,
      color: frameState.color,
      thickness: frameState.thickness,
      smoothness: frameState.smoothness,
      haloEnabled: frameState.haloEnabled,
      haloIntensity: frameState.haloIntensity,
      shadowEnabled: frameState.shadowEnabled,
      shadowIntensity: frameState.shadowIntensity,
      shadowColor: frameState.shadowColor,
      reflectionEnabled: frameState.reflectionEnabled,
      reflectionIntensity: frameState.reflectionIntensity,
      pulseEnabled: frameState.pulseEnabled,
      pulseIntensity: frameState.pulseIntensity,
    }
    // Snapshot the full layer stack. visualType/config kept for backward
    // compat: if a user opens this preset in an older client, the legacy
    // path still works (apply will fall back to a single layer).
    const layerState = useLayerStore.getState()
    const layersSnapshot: Layer[] = layerState.layers.map(
      (l) => ({ ...l, config: { ...l.config } }) as Layer,
    )
    const newPreset: Preset = {
      id: `user-${Date.now()}`,
      name,
      visualType,
      description: 'Custom preset',
      backgroundColor,
      config,
      frameConfig,
      layers: layersSnapshot,
      activeLayerId: layerState.activeLayerId,
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
    // Prune from favorites — a deleted preset shouldn't linger as a dead ID.
    const nextFavs = get().favorites.filter((fid) => fid !== id)
    if (nextFavs.length !== get().favorites.length) {
      saveFavorites(nextFavs)
      set({ userPresets: updated, favorites: nextFavs })
    } else {
      set({ userPresets: updated })
    }
  },

  isBuiltIn: (id) => BUILT_IN_PRESETS.some((p) => p.id === id),

  hideBuiltIn: (id) => {
    if (!get().isBuiltIn(id)) return
    if (get().builtInHidden.includes(id)) return
    const next = [...get().builtInHidden, id]
    saveHidden(next)
    // Also drop from favorites — a hidden preset shouldn't show pinned.
    const nextFavs = get().favorites.filter((fid) => fid !== id)
    if (nextFavs.length !== get().favorites.length) {
      saveFavorites(nextFavs)
      set({ builtInHidden: next, favorites: nextFavs })
    } else {
      set({ builtInHidden: next })
    }
  },

  restoreAllBuiltIn: () => {
    saveHidden([])
    set({ builtInHidden: [] })
  },

  toggleFavorite: (id) => {
    const current = get().favorites
    if (current.includes(id)) {
      const next = current.filter((fid) => fid !== id)
      saveFavorites(next)
      set({ favorites: next })
    } else {
      if (current.length >= MAX_FAVORITES) return
      const next = [...current, id]
      saveFavorites(next)
      set({ favorites: next })
    }
  },

  reorderFavorites: (fromIndex, toIndex) => {
    const arr = [...get().favorites]
    if (
      fromIndex < 0 ||
      fromIndex >= arr.length ||
      toIndex < 0 ||
      toIndex >= arr.length ||
      fromIndex === toIndex
    ) {
      return
    }
    const [moved] = arr.splice(fromIndex, 1)
    arr.splice(toIndex, 0, moved)
    saveFavorites(arr)
    set({ favorites: arr })
  },

  isFavorite: (id) => get().favorites.includes(id),
}))
