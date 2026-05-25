import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  DEFAULT_BRAND_KIT,
  type BrandColor,
  type BrandKit,
  type BrandLogo,
} from '@/types/brandKit'
import type { FontFamily } from '@/types/layer'

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `bk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface BrandKitStore {
  kit: BrandKit

  setName: (name: string) => void

  // Colors
  /** Returns the new id. */
  addColor: (name: string, value: string) => string
  removeColor: (id: string) => void
  updateColor: (id: string, partial: Partial<Omit<BrandColor, 'id'>>) => void
  reorderColors: (fromIdx: number, toIdx: number) => void

  // Logos
  /** Returns the new id. */
  addLogo: (name: string, imageSrc: string, sizeBytes: number) => string
  removeLogo: (id: string) => void
  updateLogo: (id: string, partial: Partial<Omit<BrandLogo, 'id'>>) => void

  // Fonts
  setFont: (slot: 'primary' | 'secondary', font: FontFamily | null) => void

  // Bulk
  reset: () => void

  // Derived helpers
  /** Returns colors as a string array for PaletteEditor. */
  getPalette: () => string[]
}

const cloneDefault = (): BrandKit => ({
  ...DEFAULT_BRAND_KIT,
  colors: [],
  logos: [],
  fonts: { ...DEFAULT_BRAND_KIT.fonts },
  updatedAt: Date.now(),
})

export const useBrandKitStore = create<BrandKitStore>()(
  persist(
    (set, get) => ({
      kit: cloneDefault(),

      setName: (name) =>
        set((s) => ({
          kit: {
            ...s.kit,
            name: name.trim() || s.kit.name,
            updatedAt: Date.now(),
          },
        })),

      addColor: (name, value) => {
        const id = makeId()
        set((s) => ({
          kit: {
            ...s.kit,
            colors: [
              ...s.kit.colors,
              { id, name: name || 'Color', value },
            ],
            updatedAt: Date.now(),
          },
        }))
        return id
      },

      removeColor: (id) =>
        set((s) => ({
          kit: {
            ...s.kit,
            colors: s.kit.colors.filter((c) => c.id !== id),
            updatedAt: Date.now(),
          },
        })),

      updateColor: (id, partial) =>
        set((s) => ({
          kit: {
            ...s.kit,
            colors: s.kit.colors.map((c) =>
              c.id === id ? { ...c, ...partial } : c,
            ),
            updatedAt: Date.now(),
          },
        })),

      reorderColors: (fromIdx, toIdx) =>
        set((s) => {
          const colors = [...s.kit.colors]
          if (
            fromIdx < 0 ||
            fromIdx >= colors.length ||
            toIdx < 0 ||
            toIdx >= colors.length
          ) {
            return s
          }
          const [moved] = colors.splice(fromIdx, 1)
          colors.splice(toIdx, 0, moved)
          return { kit: { ...s.kit, colors, updatedAt: Date.now() } }
        }),

      addLogo: (name, imageSrc, sizeBytes) => {
        const id = makeId()
        set((s) => ({
          kit: {
            ...s.kit,
            logos: [
              ...s.kit.logos,
              { id, name: name || 'Logo', imageSrc, sizeBytes },
            ],
            updatedAt: Date.now(),
          },
        }))
        return id
      },

      removeLogo: (id) =>
        set((s) => ({
          kit: {
            ...s.kit,
            logos: s.kit.logos.filter((l) => l.id !== id),
            updatedAt: Date.now(),
          },
        })),

      updateLogo: (id, partial) =>
        set((s) => ({
          kit: {
            ...s.kit,
            logos: s.kit.logos.map((l) =>
              l.id === id ? { ...l, ...partial } : l,
            ),
            updatedAt: Date.now(),
          },
        })),

      setFont: (slot, font) =>
        set((s) => ({
          kit: {
            ...s.kit,
            fonts: { ...s.kit.fonts, [slot]: font },
            updatedAt: Date.now(),
          },
        })),

      reset: () => set({ kit: cloneDefault() }),

      getPalette: () => get().kit.colors.map((c) => c.value),
    }),
    {
      name: 'auspec-brand-kit-v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
