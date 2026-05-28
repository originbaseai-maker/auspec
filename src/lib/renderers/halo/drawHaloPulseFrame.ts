import type { HaloLayerConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { firstColor, lastColor } from '@/lib/colorPalette'
import { getVideoElement } from '@/lib/videoPool'

/**
 * Lazy image cache for Halo image fills. Keyed by data URL — Logo
 * references resolve to the same URLs across containers, so this
 * cache double-duties for both upload + reference paths.
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
 * Pulse Frame — a single closed shape framing the centre. Stroke
 * thickness and radius pulse on bass; beat hits jump the thickness
 * and momentarily flash to the palette's accent (last) colour.
 * Soft outer shadow scales with energy.
 *
 * Three geometries:
 *   - 'circle'        — perfect circle stroke
 *   - 'roundedRect'   — square with rounded corners
 *   - 'square'        — sharp-cornered square
 *
 * With a fill source configured, the asset (video frame or image) is
 * clipped to the inner area of the frame and drawn UNDER the
 * stroke + glow so the framed "window into media" look comes
 * through with the signature glowing edge on top.
 */
export function drawHaloPulseFrame(
  ctx: CanvasRenderingContext2D,
  config: HaloLayerConfig,
  data: FrequencyData,
  width: number,
  height: number,
  resolvedImageFillSrc?: string | null,
): void {
  const cx = width * config.offsetX
  const cy = height * config.offsetY

  const bassEnergy = (data.bass / 255) * config.bassSensitivity
  const beat = Math.min(1, data.beatEnergy)

  const baseR = config.baseRadius + bassEnergy * 15
  const baseThickness = config.frameThickness ?? 8
  const thickness = baseThickness + bassEnergy * 8 + beat * 6

  const baseColor = firstColor(config.palette, config.colorStart)
  const accentColor = lastColor(config.palette, config.colorEnd)
  const strokeColor = beat > 0.6 ? accentColor : baseColor

  const shape = config.frameShape ?? 'circle'
  const rotRad = (config.rotation * Math.PI) / 180

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotRad)

  // Build the frame path on a Path2D so it can be reused: first to
  // clip the asset fill, then for the existing stroke pass. The
  // bbox is the frame's inscribed bounding box in local coords —
  // straightforward for all three shapes since the centre is (0,0).
  const path = new Path2D()
  let minX: number, minY: number, maxX: number, maxY: number
  if (shape === 'circle') {
    path.arc(0, 0, baseR, 0, Math.PI * 2)
    minX = -baseR
    maxX = baseR
    minY = -baseR
    maxY = baseR
  } else {
    const side = baseR * 2
    const inset = -baseR
    const corner =
      shape === 'roundedRect' ? Math.min(baseR * 0.25, 24) : 0
    if (corner > 0 && typeof Path2D.prototype.roundRect === 'function') {
      path.roundRect(inset, inset, side, side, corner)
    } else {
      path.rect(inset, inset, side, side)
    }
    minX = -baseR
    maxX = baseR
    minY = -baseR
    maxY = baseR
  }

  // FILL — drawn before stroke so the glow lands on top. Video wins
  // over image when both flags are accidentally on.
  drawHaloPulseFrameFill(
    ctx,
    config,
    path,
    { minX, minY, maxX, maxY },
    resolvedImageFillSrc,
  )

  // GLOW + STROKE — unchanged behaviour, using the same Path2D.
  if (config.glowEnabled && config.glowIntensity > 0) {
    ctx.shadowColor = strokeColor
    ctx.shadowBlur =
      config.glowIntensity * (0.4 + beat * 0.6 + bassEnergy * 0.3)
  }
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = thickness
  ctx.lineJoin = shape === 'square' ? 'miter' : 'round'
  ctx.lineCap = shape === 'square' ? 'butt' : 'round'
  ctx.stroke(path)

  ctx.restore()
}

/**
 * Halo-local mirror of the bloom fill helper. Same shape, separate
 * file to keep halo's renderer dependency-graph self-contained —
 * halo doesn't import from bloom anywhere else and we don't want
 * to start.
 */
function drawHaloPulseFrameFill(
  ctx: CanvasRenderingContext2D,
  config: HaloLayerConfig,
  path: Path2D,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  resolvedImageFillSrc: string | null | undefined,
): void {
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
    }
    return
  }
  if (config.imageFillEnabled) {
    const src = resolvedImageFillSrc ?? config.imageFillSrc ?? null
    if (!src) return
    const img = getOrLoadFillImage(src)
    if (!img.complete || img.naturalWidth === 0) return
    drawFitted(
      ctx,
      path,
      img,
      img.naturalWidth,
      img.naturalHeight,
      bbox,
      config.imageFillFit ?? 'cover',
    )
  }
}

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
