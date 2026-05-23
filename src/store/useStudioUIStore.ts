import { create } from 'zustand'
import type { StudioCategory } from '@/types/studio'

export interface StudioUIStore {
  activeCategory: StudioCategory | null
  setActiveCategory: (cat: StudioCategory | null) => void
}

export const useStudioUIStore = create<StudioUIStore>((set) => ({
  activeCategory: null,
  setActiveCategory: (activeCategory) => set({ activeCategory }),
}))
