import { create } from 'zustand'
import {
  DEFAULT_CIRCULAR_SPECTRUM,
  DEFAULT_LINEAR_BARS,
  DEFAULT_WAVE,
} from '@/lib/visualizerConfig'
import { DEFAULT_POLYGON_CONFIG } from '@/lib/renderers/polygonSpectrum'
import {
  LAYER_LABELS,
  LAYER_TYPES,
  type Layer,
  type LayerData,
  type LayerType,
} from '@/types/layer'

function defaultData(type: LayerType): LayerData {
  switch (type) {
    case 'bars':
      return { type: 'bars', config: { ...DEFAULT_LINEAR_BARS } }
    case 'circular':
      return {
        type: 'circular',
        config: { ...DEFAULT_CIRCULAR_SPECTRUM },
      }
    case 'wave':
      return { type: 'wave', config: { ...DEFAULT_WAVE } }
    case 'polygon':
      return { type: 'polygon', config: { ...DEFAULT_POLYGON_CONFIG } }
  }
}

function defaultLayer(
  type: LayerType,
  enabled: boolean,
  zOrder: number,
): Layer {
  return {
    ...defaultData(type),
    id: type,
    name: LAYER_LABELS[type],
    enabled,
    locked: false,
    zOrder,
  }
}

const makeDefaultLayers = (): Record<LayerType, Layer> => ({
  bars: defaultLayer('bars', true, 0),
  circular: defaultLayer('circular', false, 1),
  wave: defaultLayer('wave', false, 2),
  polygon: defaultLayer('polygon', false, 3),
})

export interface LayerStore {
  layers: Record<LayerType, Layer>
  /** Which layer's detail panel is shown on the right. */
  activeLayerId: LayerType | null

  setActiveLayer: (id: LayerType | null) => void
  setEnabled: (id: LayerType, enabled: boolean) => void
  setLocked: (id: LayerType, locked: boolean) => void
  toggleEnabled: (id: LayerType) => void
  toggleLocked: (id: LayerType) => void
  /** Merges `partial` into the named layer's config. No-op when locked. */
  updateConfig: (id: LayerType, partial: object) => void

  /** Returns layers sorted by zOrder ascending (back → front). */
  getOrderedLayers: () => Layer[]
  /** Same as getOrderedLayers but enabled only. */
  getEnabledLayers: () => Layer[]

  /** Move a layer to a new ascending-z position; other layers shift. */
  moveLayerToIndex: (id: LayerType, targetIndex: number) => void

  /** Replace the entire layers map (preset apply, migration). */
  replaceLayers: (layers: Record<LayerType, Layer>) => void

  resetAll: () => void
}

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: makeDefaultLayers(),
  activeLayerId: 'bars',

  setActiveLayer: (activeLayerId) => set({ activeLayerId }),

  setEnabled: (id, enabled) =>
    set((s) => ({
      layers: { ...s.layers, [id]: { ...s.layers[id], enabled } },
    })),

  setLocked: (id, locked) =>
    set((s) => ({
      layers: { ...s.layers, [id]: { ...s.layers[id], locked } },
    })),

  toggleEnabled: (id) =>
    set((s) => ({
      layers: {
        ...s.layers,
        [id]: { ...s.layers[id], enabled: !s.layers[id].enabled },
      },
    })),

  toggleLocked: (id) =>
    set((s) => ({
      layers: {
        ...s.layers,
        [id]: { ...s.layers[id], locked: !s.layers[id].locked },
      },
    })),

  updateConfig: (id, partial) =>
    set((s) => {
      const layer = s.layers[id]
      if (layer.locked) return s
      return {
        layers: {
          ...s.layers,
          [id]: {
            ...layer,
            config: { ...layer.config, ...partial },
          } as Layer,
        },
      }
    }),

  getOrderedLayers: () => {
    const all = Object.values(get().layers)
    return [...all].sort((a, b) => a.zOrder - b.zOrder)
  },

  getEnabledLayers: () => {
    return get()
      .getOrderedLayers()
      .filter((l) => l.enabled)
  },

  moveLayerToIndex: (id, targetIndex) =>
    set((s) => {
      const ordered = [...Object.values(s.layers)].sort(
        (a, b) => a.zOrder - b.zOrder,
      )
      const currentIndex = ordered.findIndex((l) => l.id === id)
      if (currentIndex === -1) return s

      const clampedTarget = Math.max(
        0,
        Math.min(ordered.length - 1, targetIndex),
      )
      if (currentIndex === clampedTarget) return s

      const [moved] = ordered.splice(currentIndex, 1)
      ordered.splice(clampedTarget, 0, moved)

      const newLayers = { ...s.layers }
      ordered.forEach((layer, idx) => {
        newLayers[layer.id] = { ...layer, zOrder: idx }
      })
      return { layers: newLayers }
    }),

  replaceLayers: (layers) => set({ layers }),

  resetAll: () =>
    set({
      layers: makeDefaultLayers(),
      activeLayerId: 'bars',
    }),
}))

/**
 * One-time migration: copy current useVisualizerStore config into the
 * layer store on app boot. The previously-active `visualType` becomes
 * the only enabled layer so existing users see no visual change.
 *
 * Imports useVisualizerStore lazily to avoid circular module init issues.
 */
export function initializeLayersFromVisualizerStore(): void {
  // Lazy import — both stores depend on each other for migration only.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  import('./useVisualizerStore').then(({ useVisualizerStore }) => {
    const vis = useVisualizerStore.getState()
    const visualType = vis.visualType
    const cfg = vis.visualizerConfig

    // Build each layer with an explicit literal `type` so the
    // discriminated-union narrows correctly — spreading defaultLayer()
    // and overriding `config` widens the type and breaks inference.
    const layers: Record<LayerType, Layer> = {
      bars: {
        type: 'bars',
        id: 'bars',
        name: LAYER_LABELS.bars,
        enabled: visualType === 'bars',
        locked: false,
        zOrder: 0,
        config: { ...cfg.linearBars },
      },
      circular: {
        type: 'circular',
        id: 'circular',
        name: LAYER_LABELS.circular,
        enabled: visualType === 'circular',
        locked: false,
        zOrder: 1,
        config: { ...cfg.circularSpectrum },
      },
      wave: {
        type: 'wave',
        id: 'wave',
        name: LAYER_LABELS.wave,
        enabled: visualType === 'wave',
        locked: false,
        zOrder: 2,
        config: { ...cfg.wave },
      },
      polygon: {
        type: 'polygon',
        id: 'polygon',
        name: LAYER_LABELS.polygon,
        enabled: visualType === 'polygon',
        locked: false,
        zOrder: 3,
        config: { ...cfg.polygon },
      },
    }

    const validVisualType = LAYER_TYPES.includes(visualType as LayerType)
      ? (visualType as LayerType)
      : 'bars'

    useLayerStore.setState({
      layers,
      activeLayerId: validVisualType,
    })
  })
}
