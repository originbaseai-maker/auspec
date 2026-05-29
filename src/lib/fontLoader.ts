/**
 * Font readiness helpers for Canvas2D text rendering.
 *
 * The canvas-gotcha: ctx.fillText silently falls back to a system
 * default if the requested font family hasn't actually FINISHED
 * loading yet — the @font-face CSS only declares it, doesn't force
 * a fetch. The Google Fonts <link> in index.html declares all our
 * faces, but each one only fetches when something on the page
 * references it; until then, the very first canvas frame that uses
 * the family draws in the fallback (usually Times New Roman).
 *
 * `ensureFontLoaded` kicks off the fetch eagerly via the FontFace
 * Loading API and returns a promise that resolves once the browser
 * reports the face as ready. Callers can then trigger a re-render
 * (or just rely on the next requestAnimationFrame tick, since the
 * canvas loop already runs continuously).
 *
 * Doubles as a one-shot prefetch: passing a list of families
 * preloads them all so the very first font-picker click on a less-
 * common family renders correctly instead of with the fallback.
 */

import { FONT_CATEGORIES, type FontFamily } from '@/types/layer'

const loadedFamilies = new Set<string>()
const inflight = new Map<string, Promise<void>>()

/**
 * Ensure `family` is loaded and ready for Canvas2D drawing. Idempotent
 * — subsequent calls for the same family return immediately.
 *
 * `document.fonts.load(spec)` triggers a fetch of any matching @font-
 * face whose unicode range covers an ASCII glyph (which "A" satisfies
 * universally). The browser awaits the network round-trip; the
 * returned promise resolves with the actually-loaded FontFace objects.
 * If the family isn't declared at all, the promise still resolves
 * (with an empty array) so we never hang on a typo.
 */
export function ensureFontLoaded(family: FontFamily): Promise<void> {
  if (loadedFamilies.has(family)) return Promise.resolve()
  const existing = inflight.get(family)
  if (existing) return existing
  if (typeof document === 'undefined' || !document.fonts) {
    // SSR or ancient browser: pretend it's loaded so callers don't stall.
    loadedFamilies.add(family)
    return Promise.resolve()
  }
  // The size in the spec doesn't matter — it's just a parse hint. 16px
  // is the canonical fallback. Quoting the family lets multi-word
  // names ("Press Start 2P") parse correctly.
  const promise = document.fonts
    .load(`16px "${family}"`)
    .then(() => {
      loadedFamilies.add(family)
      inflight.delete(family)
    })
    .catch(() => {
      // If the load fails (network blip, mistyped declaration), we
      // still cache the "tried it" result so we don't retry forever.
      // Canvas will render with the system fallback; the user can
      // pick a different font.
      loadedFamilies.add(family)
      inflight.delete(family)
    })
  inflight.set(family, promise)
  return promise
}

/**
 * Preload every font listed in FONT_CATEGORIES. Called once on app
 * mount — by the time the user opens the text panel for the first
 * time, all faces are decoded and ready, so picking any font shows
 * the actual glyphs on canvas immediately instead of a brief
 * Times-New-Roman flash.
 */
export function preloadAllAppFonts(): Promise<void> {
  const all = FONT_CATEGORIES.flatMap((cat) => cat.fonts)
  return Promise.all(all.map(ensureFontLoaded)).then(() => undefined)
}

/** Test-only / diagnostic. */
export function isFontLoaded(family: FontFamily): boolean {
  return loadedFamilies.has(family)
}
