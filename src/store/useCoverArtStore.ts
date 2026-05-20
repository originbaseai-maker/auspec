import { create } from 'zustand'
import type { CoverArtImage, CropMode } from '../types/coverArt'

export interface CoverArtStore {
  coverArt: CoverArtImage | null
  logo: CoverArtImage | null
  coverArtSize: number
  logoSize: number
  coverArtCropMode: CropMode
  logoCropMode: CropMode
  coverArtPosition: { x: number; y: number }
  blurredBgEnabled: boolean
  blurredBgIntensity: number

  setCoverArt: (image: CoverArtImage | null) => void
  setLogo: (image: CoverArtImage | null) => void
  setCoverArtSize: (size: number) => void
  setLogoSize: (size: number) => void
  setCoverArtCropMode: (mode: CropMode) => void
  setLogoCropMode: (mode: CropMode) => void
  setCoverArtPosition: (pos: { x: number; y: number }) => void
  setBlurredBgEnabled: (enabled: boolean) => void
  setBlurredBgIntensity: (intensity: number) => void
  cleanup: () => void
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const useCoverArtStore = create<CoverArtStore>((set, get) => ({
  coverArt: null,
  logo: null,
  coverArtSize: 0.3,
  logoSize: 0.25,
  coverArtCropMode: 'circle',
  logoCropMode: 'square',
  coverArtPosition: { x: 0.5, y: 0.5 },
  blurredBgEnabled: true,
  blurredBgIntensity: 20,

  setCoverArt: (image) => {
    const prev = get().coverArt
    if (prev && prev.objectUrl && prev.objectUrl !== image?.objectUrl) {
      URL.revokeObjectURL(prev.objectUrl)
    }
    set({ coverArt: image })
  },
  setLogo: (image) => {
    const prev = get().logo
    if (prev && prev.objectUrl && prev.objectUrl !== image?.objectUrl) {
      URL.revokeObjectURL(prev.objectUrl)
    }
    set({ logo: image })
  },
  setCoverArtSize: (coverArtSize) =>
    set({ coverArtSize: clamp(coverArtSize, 0.1, 0.5) }),
  setLogoSize: (logoSize) => set({ logoSize: clamp(logoSize, 0.1, 1.0) }),
  setCoverArtCropMode: (coverArtCropMode) => set({ coverArtCropMode }),
  setLogoCropMode: (logoCropMode) => set({ logoCropMode }),
  setCoverArtPosition: (coverArtPosition) =>
    set({
      coverArtPosition: {
        x: clamp(coverArtPosition.x, 0, 1),
        y: clamp(coverArtPosition.y, 0, 1),
      },
    }),
  setBlurredBgEnabled: (blurredBgEnabled) => set({ blurredBgEnabled }),
  setBlurredBgIntensity: (blurredBgIntensity) =>
    set({ blurredBgIntensity: clamp(blurredBgIntensity, 0, 40) }),

  cleanup: () => {
    const { coverArt, logo } = get()
    if (coverArt?.objectUrl) URL.revokeObjectURL(coverArt.objectUrl)
    if (logo?.objectUrl) URL.revokeObjectURL(logo.objectUrl)
    set({
      coverArt: null,
      logo: null,
    })
  },
}))
