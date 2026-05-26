import { create } from 'zustand'
import {
  DEFAULT_CIRCULAR_SPECTRUM,
  DEFAULT_LINEAR_BARS,
  DEFAULT_WAVE,
} from '@/lib/visualizerConfig'
import { DEFAULT_POLYGON_CONFIG } from '@/lib/renderers/polygonSpectrum'
import { DEFAULT_PARTICLE_CONFIG } from '@/store/useParticleStore'
import { DEFAULT_FRAME_CONFIG } from '@/store/useFrameStore'
import {
  DEFAULT_BACKGROUND_CONFIG,
  DEFAULT_BLOOM_CONFIG,
  DEFAULT_LOGO_LAYER_CONFIG,
  DEFAULT_TEXT_CONFIG,
  generateLayerName,
  LAYER_TYPES,
  type Layer,
  type LayerData,
  type LayerType,
} from '@/types/layer'

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function defaultData(type: LayerType): LayerData {
  switch (type) {
    case 'bars':
      return { type: 'bars', config: { ...DEFAULT_LINEAR_BARS } }
    case 'circular':
      return { type: 'circular', config: { ...DEFAULT_CIRCULAR_SPECTRUM } }
    case 'wave':
      return { type: 'wave', config: { ...DEFAULT_WAVE } }
    case 'polygon':
      return { type: 'polygon', config: { ...DEFAULT_POLYGON_CONFIG } }
    case 'bloom':
      return { type: 'bloom', config: { ...DEFAULT_BLOOM_CONFIG } }
    case 'particles':
      return { type: 'particles', config: { ...DEFAULT_PARTICLE_CONFIG } }
    case 'logo':
      return {
        type: 'logo',
        config: {
          ...DEFAULT_LOGO_LAYER_CONFIG,
          position: { ...DEFAULT_LOGO_LAYER_CONFIG.position },
        },
      }
    case 'frame':
      return { type: 'frame', config: { ...DEFAULT_FRAME_CONFIG } }
    case 'background':
      return { type: 'background', config: { ...DEFAULT_BACKGROUND_CONFIG } }
    case 'text':
      return { type: 'text', config: { ...DEFAULT_TEXT_CONFIG } }
  }
}

/**
 * Build a Layer with explicit literal `type` so the discriminated union
 * narrows correctly (a shared helper would widen it).
 */
function createLayer(
  type: LayerType,
  existingNames: string[],
  zOrder: number,
  enabled = true,
): Layer {
  const name = generateLayerName(type, existingNames)
  const base = {
    id: makeId(),
    name,
    enabled,
    locked: false,
    zOrder,
    createdAt: Date.now(),
  }
  switch (type) {
    case 'bars':
      return { ...base, type: 'bars', config: { ...DEFAULT_LINEAR_BARS } }
    case 'circular':
      return {
        ...base,
        type: 'circular',
        config: { ...DEFAULT_CIRCULAR_SPECTRUM },
      }
    case 'wave':
      return { ...base, type: 'wave', config: { ...DEFAULT_WAVE } }
    case 'polygon':
      return { ...base, type: 'polygon', config: { ...DEFAULT_POLYGON_CONFIG } }
    case 'bloom':
      return {
        ...base,
        type: 'bloom',
        config: {
          ...DEFAULT_BLOOM_CONFIG,
          palette: DEFAULT_BLOOM_CONFIG.palette
            ? [...DEFAULT_BLOOM_CONFIG.palette]
            : undefined,
        },
      }
    case 'particles':
      return {
        ...base,
        type: 'particles',
        config: { ...DEFAULT_PARTICLE_CONFIG },
      }
    case 'logo':
      return {
        ...base,
        type: 'logo',
        config: {
          ...DEFAULT_LOGO_LAYER_CONFIG,
          position: { ...DEFAULT_LOGO_LAYER_CONFIG.position },
        },
      }
    case 'frame':
      return {
        ...base,
        type: 'frame',
        config: { ...DEFAULT_FRAME_CONFIG },
      }
    case 'background':
      return {
        ...base,
        type: 'background',
        config: { ...DEFAULT_BACKGROUND_CONFIG },
      }
    case 'text':
      return {
        ...base,
        type: 'text',
        config: { ...DEFAULT_TEXT_CONFIG },
      }
  }
}

function makeDefaultLayers(): Layer[] {
  return [createLayer('bars', [], 0, true)]
}

export interface LayerStore {
  layers: Layer[]
  activeLayerId: string | null
  /**
   * Transient: which TEXT layer (if any) is being inline-edited on
   * canvas. Drives `drawTextLayer`'s "skip" branch so the canvas-painted
   * text doesn't double up with the HTML input. Always a text-layer id.
   */
  editingTextLayerId: string | null
  /**
   * Transient: an in-memory draft layer that's rendered on canvas (live
   * preview) but NOT yet in the `layers` array. Created via `startDraft`
   * when the user clicks a category tile / "+ Add Layer". Becomes a real
   * layer via `commitDraft`, or is destroyed via `discardDraft`. Setters
   * (updateConfig, toggleEnabled, …) route to the draft when its id is
   * passed, so panels and overlays can edit it transparently.
   */
  draftLayer: Layer | null

  setActiveLayer: (id: string | null) => void
  setEditingTextLayerId: (id: string | null) => void
  toggleEnabled: (id: string) => void
  toggleLocked: (id: string) => void
  setEnabled: (id: string, enabled: boolean) => void
  setLocked: (id: string, locked: boolean) => void
  updateConfig: (id: string, partial: object) => void

  /**
   * User-initiated add: creates a DRAFT (not committed to `layers`).
   * Returns the draft's id, makes it active.
   */
  addLayer: (type: LayerType) => string
  /**
   * System-initiated add (presets, migrations, filename auto-populate):
   * bypasses the draft flow and commits directly to `layers`.
   */
  addLayerImmediate: (type: LayerType) => string

  /** Start a new draft layer. Replaces any existing draft. Returns its id. */
  startDraft: (type: LayerType) => string
  /** Commit the current draft into `layers`. No-op if no draft. */
  commitDraft: () => string | null
  /** Throw away the current draft. No-op if no draft. */
  discardDraft: () => void
  /** Whether an unsaved draft currently exists. */
  hasUnsavedDraft: () => boolean

  removeLayer: (id: string) => void
  /** Returns the new layer id, makes it active. */
  duplicateLayer: (id: string) => string
  renameLayer: (id: string, name: string) => void
  /** Reset config to type defaults; keep id/name/enabled/locked/zOrder. */
  resetLayer: (id: string) => void

  getOrderedLayers: () => Layer[]
  getEnabledLayers: () => Layer[]
  /** Includes draft lookup. */
  getLayerById: (id: string) => Layer | undefined
  /** Includes draft lookup. */
  getActiveLayer: () => Layer | null

  moveLayerToIndex: (id: string, targetIndex: number) => void

  /** Replace the entire layer stack (preset apply / project load). */
  replaceLayers: (layers: Layer[], activeId?: string | null) => void

  resetAll: () => void
}

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: makeDefaultLayers(),
  activeLayerId: null,
  editingTextLayerId: null,
  draftLayer: null,

  setActiveLayer: (activeLayerId) => set({ activeLayerId }),
  setEditingTextLayerId: (editingTextLayerId) => set({ editingTextLayerId }),

  toggleEnabled: (id) =>
    set((s) => {
      if (s.draftLayer && s.draftLayer.id === id) {
        return {
          draftLayer: { ...s.draftLayer, enabled: !s.draftLayer.enabled } as Layer,
        }
      }
      return {
        layers: s.layers.map((l) =>
          l.id === id ? ({ ...l, enabled: !l.enabled } as Layer) : l,
        ),
      }
    }),

  toggleLocked: (id) =>
    set((s) => {
      if (s.draftLayer && s.draftLayer.id === id) {
        return {
          draftLayer: { ...s.draftLayer, locked: !s.draftLayer.locked } as Layer,
        }
      }
      return {
        layers: s.layers.map((l) =>
          l.id === id ? ({ ...l, locked: !l.locked } as Layer) : l,
        ),
      }
    }),

  setEnabled: (id, enabled) =>
    set((s) => {
      if (s.draftLayer && s.draftLayer.id === id) {
        return { draftLayer: { ...s.draftLayer, enabled } as Layer }
      }
      return {
        layers: s.layers.map((l) =>
          l.id === id ? ({ ...l, enabled } as Layer) : l,
        ),
      }
    }),

  setLocked: (id, locked) =>
    set((s) => {
      if (s.draftLayer && s.draftLayer.id === id) {
        return { draftLayer: { ...s.draftLayer, locked } as Layer }
      }
      return {
        layers: s.layers.map((l) =>
          l.id === id ? ({ ...l, locked } as Layer) : l,
        ),
      }
    }),

  updateConfig: (id, partial) =>
    set((s) => {
      if (s.draftLayer && s.draftLayer.id === id) {
        // Drafts ignore the locked check — they're being actively edited.
        return {
          draftLayer: {
            ...s.draftLayer,
            config: { ...s.draftLayer.config, ...partial },
          } as Layer,
        }
      }
      return {
        layers: s.layers.map((l) => {
          if (l.id !== id) return l
          if (l.locked) return l
          return { ...l, config: { ...l.config, ...partial } } as Layer
        }),
      }
    }),

  // User-initiated path: opens a draft instead of committing immediately.
  addLayer: (type) => get().startDraft(type),

  // System-initiated path: commits directly, no draft.
  addLayerImmediate: (type) => {
    let newId = ''
    set((s) => {
      const maxZ = s.layers.reduce((m, l) => Math.max(m, l.zOrder), -1)
      const existingNames = s.layers.map((l) => l.name)
      const layer = createLayer(type, existingNames, maxZ + 1, true)
      newId = layer.id
      return {
        layers: [...s.layers, layer],
        activeLayerId: newId,
      }
    })
    return newId
  },

  startDraft: (type) => {
    let draftId = ''
    set((s) => {
      // Existing draft (if any) is silently replaced — callers that
      // care about preserving it must show a confirm dialog first.
      const existingNames = [
        ...s.layers.map((l) => l.name),
        ...(s.draftLayer ? [s.draftLayer.name] : []),
      ]
      const maxZ = Math.max(
        -1,
        ...s.layers.map((l) => l.zOrder),
        s.draftLayer?.zOrder ?? -1,
      )
      const draft = createLayer(type, existingNames, maxZ + 1, true)
      draftId = draft.id
      return { draftLayer: draft, activeLayerId: draftId }
    })
    return draftId
  },

  commitDraft: () => {
    let committedId: string | null = null
    set((s) => {
      if (!s.draftLayer) return s
      committedId = s.draftLayer.id
      return {
        layers: [...s.layers, s.draftLayer],
        draftLayer: null,
        // activeLayerId stays — the id is preserved as the draft
        // becomes a real layer.
      }
    })
    return committedId
  },

  discardDraft: () =>
    set((s) => {
      if (!s.draftLayer) return s
      const newActive =
        s.activeLayerId === s.draftLayer.id
          ? (s.layers[s.layers.length - 1]?.id ?? null)
          : s.activeLayerId
      return { draftLayer: null, activeLayerId: newActive }
    }),

  hasUnsavedDraft: () => get().draftLayer !== null,

  removeLayer: (id) =>
    set((s) => {
      // If the draft is being "removed", just discard it.
      if (s.draftLayer && s.draftLayer.id === id) {
        const newActive =
          s.activeLayerId === id
            ? (s.layers[s.layers.length - 1]?.id ?? null)
            : s.activeLayerId
        return { draftLayer: null, activeLayerId: newActive }
      }
      const removed = s.layers.find((l) => l.id === id)
      // Particle systems own per-layer simulation state in a module-level
      // Map; prune the entry so we don't leak the 500-particle pool.
      if (removed?.type === 'particles') {
        void import('@/lib/renderers/particles').then((m) =>
          m.cleanupParticleSystem(id),
        )
      }
      const remaining = s.layers.filter((l) => l.id !== id)
      // Re-pack zOrder so it stays dense (0..N-1) — keeps the up/down
      // chevron disabled-edge logic predictable.
      const packed: Layer[] = [...remaining]
        .sort((a, b) => a.zOrder - b.zOrder)
        .map((l, idx) => ({ ...l, zOrder: idx }) as Layer)
      const newActive =
        s.activeLayerId === id
          ? (packed[packed.length - 1]?.id ?? null)
          : s.activeLayerId
      return { layers: packed, activeLayerId: newActive }
    }),

  duplicateLayer: (id) => {
    let newId = ''
    set((s) => {
      const source = s.layers.find((l) => l.id === id)
      if (!source) return s
      const maxZ = s.layers.reduce((m, l) => Math.max(m, l.zOrder), -1)
      const existingNames = s.layers.map((l) => l.name)
      const name = generateLayerName(source.type, existingNames)
      const newLayerId = makeId()
      newId = newLayerId
      // Construct with literal type for narrowing.
      let dup: Layer
      const base = {
        id: newLayerId,
        name,
        enabled: source.enabled,
        locked: source.locked,
        zOrder: maxZ + 1,
        createdAt: Date.now(),
      }
      switch (source.type) {
        case 'bars':
          dup = { ...base, type: 'bars', config: { ...source.config } }
          break
        case 'circular':
          dup = { ...base, type: 'circular', config: { ...source.config } }
          break
        case 'wave':
          dup = { ...base, type: 'wave', config: { ...source.config } }
          break
        case 'polygon':
          dup = { ...base, type: 'polygon', config: { ...source.config } }
          break
        case 'bloom':
          dup = {
            ...base,
            type: 'bloom',
            config: {
              ...source.config,
              palette: source.config.palette
                ? [...source.config.palette]
                : undefined,
            },
          }
          break
        case 'particles':
          dup = { ...base, type: 'particles', config: { ...source.config } }
          break
        case 'logo':
          dup = {
            ...base,
            type: 'logo',
            config: {
              ...source.config,
              position: { ...source.config.position },
            },
          }
          break
        case 'frame':
          dup = { ...base, type: 'frame', config: { ...source.config } }
          break
        case 'background':
          dup = { ...base, type: 'background', config: { ...source.config } }
          break
        case 'text':
          dup = { ...base, type: 'text', config: { ...source.config } }
          break
      }
      return {
        layers: [...s.layers, dup],
        activeLayerId: newId,
      }
    })
    return newId
  },

  renameLayer: (id, name) =>
    set((s) => {
      if (s.draftLayer && s.draftLayer.id === id) {
        return {
          draftLayer: {
            ...s.draftLayer,
            name: name.trim() || s.draftLayer.name,
          } as Layer,
        }
      }
      return {
        layers: s.layers.map((l) =>
          l.id === id ? ({ ...l, name: name.trim() || l.name } as Layer) : l,
        ),
      }
    }),

  resetLayer: (id) =>
    set((s) => {
      // Draft branch: rebuild draft.config from its type defaults while
      // preserving id/name/enabled/locked/zOrder/createdAt.
      if (s.draftLayer && s.draftLayer.id === id) {
        const fresh = defaultData(s.draftLayer.type)
        const draft = s.draftLayer
        let newDraft: Layer
        switch (draft.type) {
          case 'bars':
            newDraft = { ...draft, type: 'bars',
              config: { ...(fresh as { type: 'bars'; config: object }).config } } as Layer
            break
          case 'circular':
            newDraft = { ...draft, type: 'circular',
              config: { ...(fresh as { type: 'circular'; config: object }).config } } as Layer
            break
          case 'wave':
            newDraft = { ...draft, type: 'wave',
              config: { ...(fresh as { type: 'wave'; config: object }).config } } as Layer
            break
          case 'polygon':
            newDraft = { ...draft, type: 'polygon',
              config: { ...(fresh as { type: 'polygon'; config: object }).config } } as Layer
            break
          case 'bloom':
            newDraft = { ...draft, type: 'bloom',
              config: { ...(fresh as { type: 'bloom'; config: object }).config } } as Layer
            break
          case 'particles':
            newDraft = { ...draft, type: 'particles',
              config: { ...(fresh as { type: 'particles'; config: object }).config } } as Layer
            break
          case 'logo':
            newDraft = { ...draft, type: 'logo',
              config: { ...(fresh as { type: 'logo'; config: object }).config } } as Layer
            break
          case 'frame':
            newDraft = { ...draft, type: 'frame',
              config: { ...(fresh as { type: 'frame'; config: object }).config } } as Layer
            break
          case 'background':
            newDraft = { ...draft, type: 'background',
              config: { ...(fresh as { type: 'background'; config: object }).config } } as Layer
            break
          case 'text':
            newDraft = { ...draft, type: 'text',
              config: { ...(fresh as { type: 'text'; config: object }).config } } as Layer
            break
        }
        return { draftLayer: newDraft }
      }
      return {
      layers: s.layers.map((l) => {
        if (l.id !== id) return l
        const fresh = defaultData(l.type)
        // Spread fresh.config (which is correctly typed for l.type) and
        // keep id/name/enabled/locked/zOrder/createdAt intact.
        switch (l.type) {
          case 'bars':
            return {
              ...l,
              type: 'bars',
              config: { ...(fresh as { type: 'bars'; config: object })
                .config },
            } as Layer
          case 'circular':
            return {
              ...l,
              type: 'circular',
              config: { ...(fresh as { type: 'circular'; config: object })
                .config },
            } as Layer
          case 'wave':
            return {
              ...l,
              type: 'wave',
              config: { ...(fresh as { type: 'wave'; config: object })
                .config },
            } as Layer
          case 'polygon':
            return {
              ...l,
              type: 'polygon',
              config: { ...(fresh as { type: 'polygon'; config: object })
                .config },
            } as Layer
          case 'bloom':
            return {
              ...l,
              type: 'bloom',
              config: { ...(fresh as { type: 'bloom'; config: object })
                .config },
            } as Layer
          case 'particles':
            return {
              ...l,
              type: 'particles',
              config: { ...(fresh as { type: 'particles'; config: object })
                .config },
            } as Layer
          case 'logo':
            return {
              ...l,
              type: 'logo',
              config: { ...(fresh as { type: 'logo'; config: object })
                .config },
            } as Layer
          case 'frame':
            return {
              ...l,
              type: 'frame',
              config: { ...(fresh as { type: 'frame'; config: object })
                .config },
            } as Layer
          case 'background':
            return {
              ...l,
              type: 'background',
              config: { ...(fresh as { type: 'background'; config: object })
                .config },
            } as Layer
          case 'text':
            return {
              ...l,
              type: 'text',
              config: { ...(fresh as { type: 'text'; config: object })
                .config },
            } as Layer
        }
      }),
      }
    }),

  getOrderedLayers: () => {
    return [...get().layers].sort(
      (a, b) => a.zOrder - b.zOrder || a.createdAt - b.createdAt,
    )
  },

  getEnabledLayers: () => {
    return get()
      .getOrderedLayers()
      .filter((l) => l.enabled)
  },

  getLayerById: (id) => {
    const s = get()
    if (s.draftLayer && s.draftLayer.id === id) return s.draftLayer
    return s.layers.find((l) => l.id === id)
  },

  getActiveLayer: () => {
    const s = get()
    const id = s.activeLayerId
    if (!id) return null
    if (s.draftLayer && s.draftLayer.id === id) return s.draftLayer
    return s.layers.find((l) => l.id === id) ?? null
  },

  moveLayerToIndex: (id, targetIndex) =>
    set((s) => {
      const ordered = [...s.layers].sort((a, b) => a.zOrder - b.zOrder)
      const currentIndex = ordered.findIndex((l) => l.id === id)
      if (currentIndex === -1) return s
      const clampedTarget = Math.max(
        0,
        Math.min(ordered.length - 1, targetIndex),
      )
      if (currentIndex === clampedTarget) return s
      const [moved] = ordered.splice(currentIndex, 1)
      ordered.splice(clampedTarget, 0, moved)
      const newLayers: Layer[] = ordered.map(
        (l, idx) => ({ ...l, zOrder: idx }) as Layer,
      )
      return { layers: newLayers }
    }),

  replaceLayers: (layers, activeId) =>
    set({
      layers,
      activeLayerId:
        activeId !== undefined
          ? activeId
          : layers.length > 0
            ? layers[layers.length - 1].id
            : null,
      // Replace = clean slate — any in-flight draft is silently dropped.
      draftLayer: null,
    }),

  resetAll: () => {
    const defaults = makeDefaultLayers()
    set({
      layers: defaults,
      activeLayerId: defaults[0]?.id ?? null,
      draftLayer: null,
    })
  },
}))

/**
 * One-time migration: copy legacy useVisualizerStore state into the
 * layer store. Creates four layers (one per type) with only the
 * formerly-active visualType enabled, preserving the user's current look.
 */
export function initializeLayersFromVisualizerStore(): void {
  import('./useVisualizerStore').then(({ useVisualizerStore }) => {
    const vis = useVisualizerStore.getState()
    const visualType = vis.visualType
    const cfg = vis.visualizerConfig

    const layers: Layer[] = []
    const now = Date.now()
    let z = 0

    const push = (
      type: LayerType,
      configClone: object,
      enabled: boolean,
    ): void => {
      const name = generateLayerName(
        type,
        layers.map((l) => l.name),
      )
      const base = {
        id: makeId(),
        name,
        enabled,
        locked: false,
        zOrder: z++,
        createdAt: now + z,
      }
      // Literal type so the union narrows.
      let layer: Layer
      switch (type) {
        case 'bars':
          layer = {
            ...base,
            type: 'bars',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
        case 'circular':
          layer = {
            ...base,
            type: 'circular',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
        case 'wave':
          layer = {
            ...base,
            type: 'wave',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
        case 'polygon':
          layer = {
            ...base,
            type: 'polygon',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
        case 'bloom':
          layer = {
            ...base,
            type: 'bloom',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
        case 'particles':
          layer = {
            ...base,
            type: 'particles',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
        case 'logo':
          layer = {
            ...base,
            type: 'logo',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
        case 'frame':
          layer = {
            ...base,
            type: 'frame',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
        case 'background':
          layer = {
            ...base,
            type: 'background',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
        case 'text':
          layer = {
            ...base,
            type: 'text',
            config: { ...(configClone as Layer['config']) } as Layer['config'],
          } as Layer
          break
      }
      layers.push(layer)
    }

    // Background goes FIRST so it has the lowest z-order (drawn behind
    // everything). Legacy single-color background → 'color' bgType.
    push(
      'background',
      {
        bgType: 'color',
        color: vis.backgroundColor,
        color2: '#1a1a1a',
        gradientAngle: 135,
        imageSrc: null,
        imageFit: 'cover',
        blur: 0,
        opacity: 1,
      },
      true,
    )

    push('bars', cfg.linearBars, visualType === 'bars')
    push('circular', cfg.circularSpectrum, visualType === 'circular')
    push('wave', cfg.wave, visualType === 'wave')
    push('polygon', cfg.polygon, visualType === 'polygon')

    // Pull legacy single-instance state from the dedicated stores.
    // Loaded lazily so this file doesn't take a hard dep on them.
    Promise.all([
      import('./useParticleStore'),
      import('./useFrameStore'),
      import('./useCoverArtStore'),
      import('./useTextStore'),
    ]).then(([particleMod, frameMod, coverArtMod, textMod]) => {
      const p = particleMod.useParticleStore.getState()
      const f = frameMod.useFrameStore.getState()
      const c = coverArtMod.useCoverArtStore.getState()

      const particleConfig = {
        enabled: p.enabled,
        shape: p.shape,
        motion: p.motion,
        density: p.density,
        size: p.size,
        speed: p.speed,
        lifespan: p.lifespan,
        fadeOut: p.fadeOut,
        glowEnabled: p.glowEnabled,
        glowIntensity: p.glowIntensity,
        palette: [...p.palette],
        useVisualizerPalette: p.useVisualizerPalette,
        beatReactive: p.beatReactive,
        beatBurstAmount: p.beatBurstAmount,
        beatSizeMultiplier: p.beatSizeMultiplier,
        gravity: p.gravity,
        friction: p.friction,
        spread: p.spread,
      }
      push('particles', particleConfig, p.enabled)

      const logoConfig = {
        logoSize: c.logoSize,
        logoCropMode: c.logoCropMode,
        position: { ...c.coverArtPosition },
        autoLogoSync: c.autoLogoSync,
      }
      // Enable the Logo layer if the user has uploaded a logo (preserves
      // the visual behavior from before the migration).
      push('logo', logoConfig, c.logo !== null)

      // Text layers — migrate the 3 legacy sub-layers (title/artist/
      // custom) into TextLayers if they have content. Each gets its
      // own zOrder slot; their existing position/font/etc. carry over.
      const t = textMod.useTextStore.getState()
      for (const legacyId of ['title', 'artist', 'custom'] as const) {
        const sub = t[legacyId]
        if (!sub || !sub.text || !sub.text.trim()) continue
        push(
          'text',
          {
            text: sub.text,
            font: sub.font,
            fontWeight: sub.fontWeight,
            fontSize: sub.fontSize,
            color: sub.color,
            x: sub.x,
            y: sub.y,
            letterSpacing: sub.letterSpacing,
            shadowEnabled: sub.shadowEnabled,
            shadowIntensity: sub.shadowIntensity,
            shadowColor: sub.shadowColor,
          },
          sub.enabled,
        )
      }

      const frameConfig = {
        enabled: f.enabled,
        color: f.color,
        thickness: f.thickness,
        smoothness: f.smoothness,
        haloEnabled: f.haloEnabled,
        haloIntensity: f.haloIntensity,
        shadowEnabled: f.shadowEnabled,
        shadowIntensity: f.shadowIntensity,
        shadowColor: f.shadowColor,
        reflectionEnabled: f.reflectionEnabled,
        reflectionIntensity: f.reflectionIntensity,
        pulseEnabled: f.pulseEnabled,
        pulseIntensity: f.pulseIntensity,
      }
      push('frame', frameConfig, f.enabled)

      const validType: LayerType = LAYER_TYPES.includes(
        visualType as LayerType,
      )
        ? (visualType as LayerType)
        : 'bars'
      const active =
        layers.find((l) => l.type === validType && l.enabled) ?? layers[0]

      useLayerStore.setState({
        layers,
        activeLayerId: active?.id ?? null,
      })
    })
  })
}
