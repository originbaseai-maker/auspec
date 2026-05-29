/**
 * Shared offscreen-blur glow utility — replaces per-frame
 * ctx.shadowBlur in glowing visualisers.
 *
 * Why this exists:
 *   ctx.shadowBlur on Canvas2D is software-rendered on every modern
 *   browser (Chrome, Safari, Firefox all use a CPU gaussian-blur
 *   path). On a full-canvas-width stroke or fill it costs ~10–15 ms
 *   per frame — roughly the entire 60-fps budget. That's the actual
 *   stutter Winter Dream / Spring Morning report when a glowing
 *   Wave runs over a video background.
 *
 *   ctx.filter='blur(Npx)' is GPU-accelerated in every modern
 *   browser. Even at full resolution it's ~1–2 ms; at half-res it's
 *   sub-millisecond. So we render the path to a downscaled offscreen
 *   canvas with filter blur, then composite back onto the main canvas
 *   with 'lighter' (additive — matches the visual feel of shadowBlur).
 *
 * Visual fidelity: shadowBlur and filter-blur both produce a soft
 * gaussian-ish halo; at glow radii ≥ 4 px they're indistinguishable
 * to the eye. Downscaling to half-res is invisible because the blur
 * radius dominates — any high-frequency detail is already lost.
 *
 * Cost model:
 *   Old: 1 shadowBlur stroke ≈ 10–15 ms (full-res, software blur).
 *   New: 1 offscreen draw (~0.5–1 ms) + 1 filter blur (~0.5–1 ms,
 *        GPU) + 1 drawImage upscale (~0.5 ms) ≈ 2 ms total.
 *
 * Lifecycle: the offscreen canvas is cached per main-context in a
 * WeakMap, sized to current main-canvas dims. A canvas resize busts
 * the cache; otherwise it survives the full session. Multiple
 * glowing layers within one frame share the offscreen — each call
 * clears + draws + composites sequentially, no cross-layer leakage.
 */

interface OffscreenEntry {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
}

const offscreenByMain = new WeakMap<
  CanvasRenderingContext2D,
  OffscreenEntry
>()

function getOffscreen(
  mainCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
): OffscreenEntry | null {
  const existing = offscreenByMain.get(mainCtx)
  if (existing && existing.width === w && existing.height === h) {
    return existing
  }
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const entry: OffscreenEntry = { canvas, ctx, width: w, height: h }
  offscreenByMain.set(mainCtx, entry)
  return entry
}

export interface DrawGlowOptions {
  /** Visual glow radius in main-canvas pixels. */
  blurPx: number
  /** Main canvas width in CSS pixels. */
  width: number
  /** Main canvas height in CSS pixels. */
  height: number
  /**
   * Render the glow source onto the offscreen context. The offscreen
   * has already been pre-scaled so all caller coordinates are in
   * MAIN-canvas space — no need to compensate for the downscale.
   * Callers set strokeStyle/fillStyle/lineWidth/etc. on the passed
   * ctx and call beginPath/stroke/fill as normal.
   *
   * Anything drawn here gets blurred and composited additively onto
   * the main canvas. Callers typically use ONE representative colour
   * for the whole glow path — per-segment colours are pointless once
   * blurred.
   */
  drawSource: (offCtx: CanvasRenderingContext2D) => void
  /**
   * 0..1. 0.5 is the default sweet spot (4x fewer offscreen pixels
   * to blur, invisible quality loss because the blur dominates any
   * high-frequency detail). Drop to 0.33 for an even cheaper glow
   * when the halo is large.
   */
  downscale?: number
  /**
   * Multiplier applied to the composited glow's alpha. Useful for
   * dialling halo strength without re-rendering. Default 1.
   */
  opacity?: number
  /**
   * Composite mode for the glow → main canvas blend. 'lighter' is
   * the additive-halo default — matches shadowBlur's brightening
   * behaviour. Use 'source-over' for non-additive needs.
   */
  composite?: GlobalCompositeOperation
}

/**
 * Render an offscreen-blur glow and composite it onto `mainCtx`.
 * Safe to call multiple times per frame (different layers / passes)
 * — each call clears the shared offscreen before drawing.
 */
export function drawGlow(
  mainCtx: CanvasRenderingContext2D,
  opts: DrawGlowOptions,
): void {
  if (opts.blurPx <= 0 || opts.width <= 0 || opts.height <= 0) return

  const downscale = clamp(opts.downscale ?? 0.5, 0.1, 1)
  const w = Math.max(1, Math.round(opts.width * downscale))
  const h = Math.max(1, Math.round(opts.height * downscale))

  const off = getOffscreen(mainCtx, w, h)
  if (!off) return

  // Always start from a known-clean offscreen — previous layers'
  // glow may still be on it. Reset transform first so clearRect
  // covers the whole buffer regardless of any leftover scale.
  off.ctx.save()
  off.ctx.setTransform(1, 0, 0, 1, 0, 0)
  off.ctx.clearRect(0, 0, w, h)
  off.ctx.restore()

  // Apply filter blur, then scale so caller-side coords are in main
  // space. ctx.filter applies to subsequent stroke/fill/drawImage
  // operations on this context.
  off.ctx.save()
  // Blur in OFFSCREEN pixels: when we drawImage the offscreen back
  // onto main at 1/downscale upscale, a blur of (blurPx * downscale)
  // offscreen-px reads as exactly blurPx main-px.
  off.ctx.filter = `blur(${Math.max(0.1, opts.blurPx * downscale)}px)`
  off.ctx.scale(downscale, downscale)
  opts.drawSource(off.ctx)
  off.ctx.restore()

  // Composite the blurred buffer onto the main canvas. 'lighter'
  // adds RGB values — the halo brightens whatever's underneath,
  // mimicking shadowBlur's appearance over a dark background.
  //
  // Transform contract: callers MUST call drawGlow when the main
  // context's transform is the canvas's "base" transform (DPR scale
  // only — no caller translate/rotate on top). The composite
  // drawImage is at CSS-pixel coords (0, 0) → (width, height); the
  // canvas's DPR scale carries that to the full physical area. If
  // the caller has translated to a shape centre, they must do so
  // INSIDE the drawSource callback (on the offscreen context) and
  // either call drawGlow before their own ctx.translate or wrap the
  // translate in a save/restore around drawGlow.
  mainCtx.save()
  mainCtx.globalCompositeOperation = opts.composite ?? 'lighter'
  if (opts.opacity !== undefined) {
    mainCtx.globalAlpha *= clamp(opts.opacity, 0, 1)
  }
  mainCtx.drawImage(off.canvas, 0, 0, w, h, 0, 0, opts.width, opts.height)
  mainCtx.restore()
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
