/**
 * Multi-color palette helpers shared across visualizer renderers.
 *
 * The legacy 2-color (colorStart, colorEnd) fields stay on each config as
 * a fallback for presets saved before the palette upgrade. When a config
 * has `palette: string[]` set, it takes precedence; otherwise the helpers
 * use [colorStart, colorEnd] as a 2-stop palette.
 */

export interface RGB {
  r: number
  g: number
  b: number
}

/** Accepts `#rgb`, `#rrggbb`, and `rgb(r, g, b)`. Returns black on parse failure. */
export function parseColor(color: string): RGB {
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    }
  }
  const clean = color.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  if (full.length < 6) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = parseColor(a)
  const cb = parseColor(b)
  return `rgb(${Math.round(ca.r + (cb.r - ca.r) * t)}, ${Math.round(
    ca.g + (cb.g - ca.g) * t,
  )}, ${Math.round(ca.b + (cb.b - ca.b) * t)})`
}

/**
 * Returns the palette to use: the provided one if it has ≥2 colors,
 * otherwise [fallbackStart, fallbackEnd].
 */
export function resolvePalette(
  palette: string[] | undefined,
  fallbackStart: string,
  fallbackEnd: string,
): string[] {
  return palette && palette.length >= 2 ? palette : [fallbackStart, fallbackEnd]
}

/**
 * Interpolates a color from a palette at progress 0..1.
 */
export function colorFromPalette(
  palette: string[] | undefined,
  fallbackStart: string,
  fallbackEnd: string,
  progress: number,
): string {
  const colors = resolvePalette(palette, fallbackStart, fallbackEnd)
  const p = Math.max(0, Math.min(1, progress))
  const scaled = p * (colors.length - 1)
  const lowerIdx = Math.floor(scaled)
  const upperIdx = Math.min(colors.length - 1, lowerIdx + 1)
  const t = scaled - lowerIdx
  return lerpColor(colors[lowerIdx], colors[upperIdx], t)
}

/**
 * Returns a per-bar color honoring (in priority order): hue interpolation,
 * palette, then the 2-color fallback. Used by every visualizer renderer.
 */
export function resolveBarColor(
  progress: number,
  palette: string[] | undefined,
  fallbackStart: string,
  fallbackEnd: string,
  hueInterpolation: number,
): string {
  if (hueInterpolation > 0) {
    const hue = (progress * hueInterpolation) % 360
    return `hsl(${hue}, 90%, 60%)`
  }
  return colorFromPalette(palette, fallbackStart, fallbackEnd, progress)
}

/**
 * Adds evenly-spaced palette stops to an existing canvas gradient. The
 * stops are distributed [0, 1] regardless of palette length.
 */
export function addPaletteStops(
  gradient: CanvasGradient,
  palette: string[] | undefined,
  fallbackStart: string,
  fallbackEnd: string,
): void {
  const colors = resolvePalette(palette, fallbackStart, fallbackEnd)
  const last = colors.length - 1
  for (let i = 0; i < colors.length; i++) {
    gradient.addColorStop(i / last, colors[i])
  }
}

/** First color of the active palette (or fallback). Used for accents. */
export function firstColor(
  palette: string[] | undefined,
  fallbackStart: string,
): string {
  if (palette && palette.length > 0) return palette[0]
  return fallbackStart
}

/** Last color of the active palette (or fallback). Used for shadow/glow accents. */
export function lastColor(
  palette: string[] | undefined,
  fallbackEnd: string,
): string {
  if (palette && palette.length > 0) return palette[palette.length - 1]
  return fallbackEnd
}

/**
 * Common preset palettes for the PaletteEditor "Presets" dropdown.
 */
export const PRESET_PALETTES: { name: string; colors: string[] }[] = [
  { name: 'Sunset', colors: ['#f97316', '#ef4444', '#8b5cf6'] },
  { name: 'Ocean', colors: ['#06b6d4', '#3b82f6', '#8b5cf6'] },
  { name: 'Forest', colors: ['#10b981', '#84cc16', '#facc15'] },
  { name: 'Vaporwave', colors: ['#ec4899', '#a855f7', '#06b6d4'] },
  { name: 'Fire', colors: ['#fbbf24', '#f97316', '#dc2626'] },
  {
    name: 'Rainbow',
    colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'],
  },
  { name: 'Mono Blue', colors: ['#1e3a8a', '#3b82f6', '#93c5fd'] },
  { name: 'Mono Pink', colors: ['#831843', '#ec4899', '#fbcfe8'] },
]
