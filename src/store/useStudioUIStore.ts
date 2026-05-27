import { create } from 'zustand'
import type { StudioCategory } from '@/types/studio'

export interface StudioUIStore {
  activeCategory: StudioCategory | null
  setActiveCategory: (cat: StudioCategory | null) => void
  /**
   * Monotonically-incrementing token. StudioPage's mobile branch
   * subscribes and switches the mobile tab to 'tools'; the AIHeroCard
   * gets focused via its own focusToken pipe. Lets pieces of the UI
   * outside the mobile shell (e.g. the audio-upload discovery hint)
   * imperatively open the Tools sheet without prop drilling.
   */
  openToolsToken: number
  requestOpenTools: () => void
}

export const useStudioUIStore = create<StudioUIStore>((set) => ({
  activeCategory: null,
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  openToolsToken: 0,
  requestOpenTools: () =>
    set((s) => ({ openToolsToken: s.openToolsToken + 1 })),
}))
