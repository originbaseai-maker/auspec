import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { SocialFormat } from '@/lib/socialFormats'

export interface FormatStore {
  activeFormat: SocialFormat
  /**
   * True once the user has explicitly picked a format via the UI (or
   * loaded a project that carries one). Smart-default logic in
   * StudioPage gates on this so we never override an explicit choice.
   */
  formatChosenByUser: boolean

  /** Explicit user pick — marks `formatChosenByUser` true. */
  setFormat: (format: SocialFormat) => void
  /**
   * Smart-default applier (mount-time, viewport-change). No-op if the
   * user has already chosen a format. Pass the device-appropriate
   * default and let the store decide whether to apply it.
   */
  setFormatAuto: (format: SocialFormat) => void
}

export const useFormatStore = create<FormatStore>()(
  persist(
    (set) => ({
      activeFormat: 'youtube',
      formatChosenByUser: false,

      setFormat: (activeFormat) =>
        set({ activeFormat, formatChosenByUser: true }),

      setFormatAuto: (activeFormat) =>
        set((s) => {
          if (s.formatChosenByUser) return s
          return { activeFormat }
        }),
    }),
    {
      name: 'auspec-format-v1',
      storage: createJSONStorage(() => localStorage),
      // Persist both fields so the user's choice (and the
      // already-applied smart default) survive reloads.
      partialize: (s) => ({
        activeFormat: s.activeFormat,
        formatChosenByUser: s.formatChosenByUser,
      }),
    },
  ),
)
