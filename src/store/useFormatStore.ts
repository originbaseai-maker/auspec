import { create } from 'zustand'
import type { SocialFormat } from '@/lib/socialFormats'

export interface FormatStore {
  activeFormat: SocialFormat
  setFormat: (format: SocialFormat) => void
}

export const useFormatStore = create<FormatStore>((set) => ({
  activeFormat: 'youtube',
  setFormat: (activeFormat) => set({ activeFormat }),
}))
