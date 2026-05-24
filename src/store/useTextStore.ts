import { create } from 'zustand'

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

export type TextLayerId = 'title' | 'artist' | 'custom'

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
  position: TextPosition
  letterSpacing: number // -2 to 10 px
  shadowEnabled: boolean
  shadowIntensity: number // 0-100
  shadowColor: string
}

const DEFAULT_LAYER = (
  id: TextLayerId,
  text: string,
  position: TextPosition,
): TextLayer => ({
  id,
  text,
  enabled: false,
  font: 'Inter',
  fontWeight: 700,
  fontSize: id === 'title' ? 48 : id === 'artist' ? 28 : 20,
  color: '#ffffff',
  position,
  letterSpacing: 0,
  shadowEnabled: true,
  shadowIntensity: 60,
  shadowColor: '#000000',
})

export interface TextStore {
  title: TextLayer
  artist: TextLayer
  custom: TextLayer

  setLayer: (id: TextLayerId, partial: Partial<TextLayer>) => void
  resetLayer: (id: TextLayerId) => void
  resetAll: () => void
}

export const useTextStore = create<TextStore>((set) => ({
  title: DEFAULT_LAYER('title', '', 'bottom-center'),
  artist: DEFAULT_LAYER('artist', '', 'bottom-center'),
  custom: DEFAULT_LAYER('custom', '', 'top-center'),

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
      return { [id]: next } as Pick<TextStore, TextLayerId>
    }),

  resetLayer: (id) =>
    set((state) => ({
      [id]: DEFAULT_LAYER(id, '', state[id].position),
    })),

  resetAll: () =>
    set({
      title: DEFAULT_LAYER('title', '', 'bottom-center'),
      artist: DEFAULT_LAYER('artist', '', 'bottom-center'),
      custom: DEFAULT_LAYER('custom', '', 'top-center'),
    }),
}))
