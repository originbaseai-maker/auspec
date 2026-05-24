import { create } from 'zustand'

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

export type TextLayerId = 'title' | 'artist' | 'custom'

/**
 * Kept as an exported enum for the panel's "Quick Position" shortcuts.
 * The store no longer carries a `position` field — layer positions are
 * free x/y now (0–1 normalized to canvas dimensions).
 */
export type TextPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type FontFamily =
  | 'Inter'
  | 'Bebas Neue'
  | 'Playfair Display'
  | 'Pacifico'
  | 'Space Mono'

export interface TextLayer {
  id: TextLayerId
  text: string
  enabled: boolean
  font: FontFamily
  fontWeight: 400 | 600 | 700
  fontSize: number // 12-120
  color: string
  /** 0–1 normalized horizontal center of the text on the canvas. */
  x: number
  /** 0–1 normalized vertical center of the text on the canvas. */
  y: number
  letterSpacing: number // -2 to 10 px
  shadowEnabled: boolean
  shadowIntensity: number // 0-100
  shadowColor: string
}

const DEFAULT_LAYER = (
  id: TextLayerId,
  text: string,
  x: number,
  y: number,
): TextLayer => ({
  id,
  text,
  enabled: false,
  font: 'Inter',
  fontWeight: 700,
  fontSize: id === 'title' ? 48 : id === 'artist' ? 28 : 20,
  color: '#ffffff',
  x,
  y,
  letterSpacing: 0,
  shadowEnabled: true,
  shadowIntensity: 60,
  shadowColor: '#000000',
})

const TITLE_DEFAULTS = { x: 0.5, y: 0.85 }
const ARTIST_DEFAULTS = { x: 0.5, y: 0.92 }
const CUSTOM_DEFAULTS = { x: 0.5, y: 0.1 }

export interface TextStore {
  title: TextLayer
  artist: TextLayer
  custom: TextLayer
  /** Transient: which layer (if any) is currently being inline-edited. */
  editingLayerId: TextLayerId | null

  setLayer: (id: TextLayerId, partial: Partial<TextLayer>) => void
  resetLayer: (id: TextLayerId) => void
  resetAll: () => void
  setEditingLayerId: (id: TextLayerId | null) => void
}

export const useTextStore = create<TextStore>((set) => ({
  title: DEFAULT_LAYER('title', '', TITLE_DEFAULTS.x, TITLE_DEFAULTS.y),
  artist: DEFAULT_LAYER('artist', '', ARTIST_DEFAULTS.x, ARTIST_DEFAULTS.y),
  custom: DEFAULT_LAYER('custom', '', CUSTOM_DEFAULTS.x, CUSTOM_DEFAULTS.y),
  editingLayerId: null,

  setLayer: (id, partial) =>
    set((state) => {
      const current = state[id]
      const next: TextLayer = { ...current, ...partial }
      if (partial.fontSize !== undefined)
        next.fontSize = clamp(partial.fontSize, 12, 120)
      if (partial.letterSpacing !== undefined)
        next.letterSpacing = clamp(partial.letterSpacing, -2, 10)
      if (partial.shadowIntensity !== undefined)
        next.shadowIntensity = clamp(partial.shadowIntensity, 0, 100)
      if (partial.x !== undefined) next.x = clamp(partial.x, 0, 1)
      if (partial.y !== undefined) next.y = clamp(partial.y, 0, 1)
      return { [id]: next } as Pick<TextStore, TextLayerId>
    }),

  resetLayer: (id) =>
    set((state) => {
      const { x, y } = state[id]
      return { [id]: DEFAULT_LAYER(id, '', x, y) } as Pick<TextStore, TextLayerId>
    }),

  resetAll: () =>
    set({
      title: DEFAULT_LAYER('title', '', TITLE_DEFAULTS.x, TITLE_DEFAULTS.y),
      artist: DEFAULT_LAYER(
        'artist',
        '',
        ARTIST_DEFAULTS.x,
        ARTIST_DEFAULTS.y,
      ),
      custom: DEFAULT_LAYER(
        'custom',
        '',
        CUSTOM_DEFAULTS.x,
        CUSTOM_DEFAULTS.y,
      ),
      editingLayerId: null,
    }),

  setEditingLayerId: (editingLayerId) => set({ editingLayerId }),
}))
