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
  /**
   * Drives the AIStyleModal — opened from the AIStyleButton at the
   * bottom of the Tools panel and from the discovery hint under the
   * audio upload bar. Boolean (not a token) because the modal is a
   * proper open/closed UI affordance, not a one-shot signal.
   */
  aiModalOpen: boolean
  openAIModal: () => void
  closeAIModal: () => void
}

export const useStudioUIStore = create<StudioUIStore>((set) => ({
  activeCategory: null,
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  openToolsToken: 0,
  requestOpenTools: () =>
    set((s) => ({ openToolsToken: s.openToolsToken + 1 })),
  aiModalOpen: false,
  openAIModal: () => set({ aiModalOpen: true }),
  closeAIModal: () => set({ aiModalOpen: false }),
}))
