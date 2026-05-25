import type { FontFamily } from '@/types/layer'

export interface BrandColor {
  id: string
  /** User-editable, e.g. "Primary", "Accent", "Background". */
  name: string
  /** Hex like '#3b82f6'. */
  value: string
}

export interface BrandLogo {
  id: string
  /** User-editable, e.g. "Main Logo", "Dark Variant". */
  name: string
  /** Data URL (base64). V1 uses inline storage for portability. */
  imageSrc: string
  /** Approximate file size in bytes — drives storage warnings. */
  sizeBytes: number
}

export interface BrandFonts {
  primary: FontFamily | null
  secondary: FontFamily | null
}

export interface BrandKit {
  name: string
  colors: BrandColor[]
  logos: BrandLogo[]
  fonts: BrandFonts
  updatedAt: number
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  name: 'My Brand',
  colors: [],
  logos: [],
  fonts: { primary: null, secondary: null },
  updatedAt: 0,
}

/** Total size of all logos in bytes — used for storage warnings. */
export function brandKitSize(kit: BrandKit): number {
  return kit.logos.reduce((sum, l) => sum + l.sizeBytes, 0)
}

/** Soft cap. localStorage can hold ~5 MB per origin; reserve room for the rest. */
export const MAX_BRAND_KIT_BYTES = 3 * 1024 * 1024
/** Per-logo hard cap. */
export const MAX_BRAND_LOGO_BYTES = 1024 * 1024
