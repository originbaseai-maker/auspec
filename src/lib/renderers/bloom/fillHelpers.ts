import type { BloomConfig } from '@/types/layer'
import { getVideoElement } from '@/lib/videoPool'

/**
 * Lazy image cache for Bloom image fills. Shared across all Bloom
 * variants — same decode cost regardless of which variant is using
 * the URL. Keyed by data URL (Logo-layer references resolve to the
 * same URLs across containers).
 */
const fillImageCache = new Map<string, HTMLImageElement>()

function getOrLoadFillImage(src: string): HTMLImageElement {
  let img = fillImageCache.get(src)
  if (!img) {
    img = new Image()
    img.src = src
    fillImageCache.set(src, img)
  }
  return img
}

/**
 * Shared fill helper for Bloom variants. Caller has ALREADY built
 * the path on `ctx` (and is about to stroke it) — this function
 * saves the context, clips to that path, fits the asset into the
 * caller-supplied bbox, draws it, and restores. The path remains
 * valid on `ctx` after restore so the caller can continue with the
 * existing stroke / glow pass on top.
 *
 * Returns true when something was actually drawn (caller can use
 * this to skip a redundant background pass if they want); false
 * when the layer has no fill configured, the asset isn't ready, or
 * the layer's style isn't fillable.
 *
 * `bbox` is in the SAME coordinate space as the path the caller
 * built — i.e. LOCAL (post-translate, post-rotate). The fit math
 * scales the asset to that bbox.
 */
export function drawBloomFill(
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  path: Path2D,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  resolvedImageFillSrc: string | null | undefined,
): boolean {
  // Video wins over image when both flags are accidentally on. The
  // panel UI prevents this; the priority rule keeps render output
  // deterministic if the data ever does say both.
  if (config.videoFillEnabled && config.videoFillAssetId) {
    const video = getVideoElement(config.videoFillAssetId)
    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      drawFitted(
        ctx,
        path,
        video,
        video.videoWidth,
        video.videoHeight,
        bbox,
        config.videoFillFit ?? 'cover',
      )
      return true
    }
    return false
  }
  if (config.imageFillEnabled) {
    const src = resolvedImageFillSrc ?? config.imageFillSrc ?? null
    if (!src) return false
    const img = getOrLoadFillImage(src)
    if (!img.complete || img.naturalWidth === 0) return false
    drawFitted(
      ctx,
      path,
      img,
      img.naturalWidth,
      img.naturalHeight,
      bbox,
      config.imageFillFit ?? 'cover',
    )
    return true
  }
  return false
}

/**
 * Shared cover/contain/fill math + clip + draw. The caller passes a
 * Path2D — we save the context, clip to that path (which DOESN'T
 * consume the path the way ctx.clip() without an arg would), draw
 * the asset fitted to bbox, then restore. The Path2D is still usable
 * by the caller for its stroke pass after.
 */
function drawFitted(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  fit: 'cover' | 'contain' | 'fill',
): void {
  const bw = bbox.maxX - bbox.minX
  const bh = bbox.maxY - bbox.minY
  if (bw <= 0 || bh <= 0) return
  const sAR = sw / sh
  const boxAR = bw / bh
  let dx = bbox.minX
  let dy = bbox.minY
  let dw = bw
  let dh = bh
  if (fit === 'cover') {
    if (sAR > boxAR) {
      dw = bh * sAR
      dx = bbox.minX + (bw - dw) / 2
    } else {
      dh = bw / sAR
      dy = bbox.minY + (bh - dh) / 2
    }
  } else if (fit === 'contain') {
    if (sAR > boxAR) {
      dh = bw / sAR
      dy = bbox.minY + (bh - dh) / 2
    } else {
      dw = bh * sAR
      dx = bbox.minX + (bw - dw) / 2
    }
  }
  ctx.save()
  ctx.clip(path)
  ctx.drawImage(source, dx, dy, dw, dh)
  ctx.restore()
}

/**
 * Compute a bbox from two Float32Arrays of point coordinates. Used
 * by Bloom variants whose path is built from per-frame point arrays
 * (Classic, Organic, Aura). Star uses a closed polygon traced via
 * lineTo so its bbox is computed inline.
 */
export function bboxOfPoints(
  xs: Float32Array | number[],
  ys: Float32Array | number[],
  count: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < count; i++) {
    const x = xs[i]
    const y = ys[i]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}
