import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'

/**
 * Signature shared by every Bloom variant. The router and withEcho
 * both consume this — keeps the wrapper variant-agnostic.
 */
export type BloomVariantFn = (
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  data: FrequencyData,
  width: number,
  height: number,
  /**
   * Resolved image source for the `image` fill kind. Threaded from
   * VisualizerCanvas which resolves a Logo-layer reference to the
   * Logo's current imageSrc. Non-fillable variants ignore it.
   */
  resolvedImageFillSrc?: string | null,
) => void

/**
 * Render a Bloom variant N times, each pass at increasing scale and
 * decreasing opacity — gives any variant the same "concentric echo"
 * effect that used to live inside drawBloomClassic.
 *
 * Math:
 *   scale_i  = 1 + (i * spacing) / referenceSize   (i = 0 → original)
 *   alpha_i  = falloff^i
 *   rot_i    = i * rotationOffset (deg)
 *
 * Echoes are drawn farthest-first so closer echoes land on top. The
 * outer save/restore wraps the whole loop AND each iteration wraps
 * itself — no transform / globalAlpha leak to subsequent layers.
 *
 * Reference size for the scale calculation is min(width, height) so
 * the spacing reads consistently regardless of canvas aspect ratio.
 */
export function withEcho(
  drawFn: BloomVariantFn,
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  data: FrequencyData,
  width: number,
  height: number,
  resolvedImageFillSrc?: string | null,
): void {
  const count = Math.max(1, Math.floor(config.echoCount ?? 1))
  const spacing = config.echoSpacing ?? 30
  const falloff = config.echoFalloff ?? 0.7
  const direction = config.echoMode ?? 'outward'
  const rotationOffsetDeg = config.echoRotationOffset ?? 0

  // Single echo or fewer — wrapper is a no-op pass-through. Still
  // wrap in save/restore so accidental state changes in the variant
  // don't leak; the variants do this themselves but belt-and-suspenders.
  if (count <= 1) {
    drawFn(ctx, config, data, width, height, resolvedImageFillSrc)
    return
  }

  // Echo offset is normalised by the canvas's smallest dimension so a
  // value tuned on a square canvas still feels right on widescreen.
  const referenceSize = Math.min(width, height)

  // Translate-rotate-scale needs a centre. Variants own their own
  // offsetX/Y → world position internally; here we use the canvas
  // centre as the transform origin. That matches the layer's
  // legacy behaviour (echoes pivot from the canvas centre).
  const cx = width * (config.offsetX ?? 0.5)
  const cy = height * (config.offsetY ?? 0.5)

  // Render farthest-first so the brightest (innermost) ring lands
  // on top — matches the legacy classic look.
  const renderOrder: number[] = []
  for (let i = 0; i < count; i++) renderOrder.push(i)
  // outward = larger i renders farther outside (drawn first)
  // inward  = reverse so smaller i renders farther (still drawn first)
  if (direction === 'inward') renderOrder.reverse()
  renderOrder.reverse() // farthest-first paint order

  for (const i of renderOrder) {
    // i === 0 → original size, scale = 1, no extra rotation.
    const stepSize = direction === 'outward' ? i : -i
    const scale = 1 + (stepSize * spacing) / Math.max(1, referenceSize)
    if (scale <= 0) continue // safety — inward stack can flip negative
    const alpha = Math.pow(falloff, i)
    const rotRad = (rotationOffsetDeg * i * Math.PI) / 180

    ctx.save()
    // Stack onto whatever alpha the caller had — multiplies cleanly
    // with the layer-opacity already applied by VisualizerCanvas.
    ctx.globalAlpha = ctx.globalAlpha * alpha
    ctx.translate(cx, cy)
    ctx.rotate(rotRad)
    ctx.scale(scale, scale)
    ctx.translate(-cx, -cy)
    // Only the FIRST (i === 0, original-size) echo carries the
    // resolved fill src. Echo copies are scaled/rotated versions
    // and applying a stationary image fill to each would render
    // the asset multiple times at different scales — visually
    // chaotic and almost certainly not what the user wants.
    drawFn(
      ctx,
      config,
      data,
      width,
      height,
      i === 0 ? resolvedImageFillSrc : null,
    )
    ctx.restore()
  }
}
