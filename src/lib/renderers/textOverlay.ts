import type { TextLayer, TextLayerId } from '@/store/useTextStore'
import type { FontFamily, TextLayerConfig } from '@/types/layer'
import { drawGlow } from '@/lib/renderers/glow'

/**
 * Per-glyph styling vocabulary shared by drawTextLayer and the Lyrics
 * layer renderer. Lets karaoke text honour the same fonts / glow /
 * outline / gradient / audio-pulse pipeline without duplicating the
 * 90-line render dance below.
 *
 * Coordinates are CSS pixels in the main canvas. Effects flagged as
 * `…Enabled?: boolean` are off when undefined — that's how new code
 * paths can request "no effect" without explicitly listing every
 * field.
 */
export interface StyledTextOpts {
  text: string
  /** Absolute x in CSS pixels (centre of the text). */
  x: number
  /** Absolute y in CSS pixels (vertical centre / textBaseline=middle). */
  y: number
  fontSize: number
  font: FontFamily
  fontWeight: 400 | 600 | 700
  color: string
  letterSpacing: number

  shadowEnabled?: boolean
  shadowIntensity?: number
  shadowColor?: string

  glowEnabled?: boolean
  glowIntensity?: number
  glowColor?: string

  outlineEnabled?: boolean
  outlineColor?: string
  outlineWidth?: number

  gradientEnabled?: boolean
  gradientColor2?: string
  gradientAngle?: number

  audioReactiveEnabled?: boolean
  audioReactiveIntensity?: number

  /**
   * Multiplied onto ctx.globalAlpha before drawing. The Lyrics
   * renderer uses this to dim non-active lines and to cross-fade
   * between the current and next line.
   */
  opacityMul?: number
  /** Defaults to 'center'. */
  textAlign?: CanvasTextAlign
}

/**
 * Render a single piece of styled text into the main canvas using
 * the full effect pipeline (glow via drawGlow, drop-shadow, outline,
 * gradient fill, audio-reactive scale pulse). Idempotent w.r.t. ctx
 * state — save / restore is scoped internally.
 *
 * Called by drawTextLayer (Text-layer single text) and by
 * drawLyricsLayer (Lyrics-layer per line).
 */
export function drawStyledText(
  ctx: CanvasRenderingContext2D,
  opts: StyledTextOpts,
  width: number,
  height: number,
  bassEnergy: number,
): void {
  if (!opts.text.trim()) return

  let scale = 1
  if (opts.audioReactiveEnabled) {
    const intensity = clamp01(opts.audioReactiveIntensity ?? 0.5)
    const e = clamp01(bassEnergy)
    scale = 1 + e * 0.06 * intensity
  }
  const fontPx = opts.fontSize * scale
  const fontSpec = `${opts.fontWeight} ${fontPx}px "${opts.font}", sans-serif`
  const align = opts.textAlign ?? 'center'

  // --- GLOW PASS (offscreen + GPU filter-blur, never shadowBlur) ---
  if (opts.glowEnabled && (opts.glowIntensity ?? 0) > 0) {
    const glowColor = opts.glowColor ?? opts.color
    drawGlow(ctx, {
      blurPx: opts.glowIntensity ?? 24,
      width,
      height,
      opacity: opts.opacityMul,
      drawSource: (off) => {
        off.font = fontSpec
        off.fillStyle = glowColor
        off.textAlign = align
        off.textBaseline = 'middle'
        if ('letterSpacing' in off) {
          ;(off as CanvasRenderingContext2D & {
            letterSpacing: string
          }).letterSpacing = `${opts.letterSpacing}px`
        }
        off.fillText(opts.text, opts.x, opts.y)
      },
    })
  }

  // --- SHARP PASS ---
  ctx.save()
  if (opts.opacityMul !== undefined) {
    ctx.globalAlpha *= clamp01(opts.opacityMul)
  }
  ctx.font = fontSpec
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  if ('letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${opts.letterSpacing}px`
  }

  if (opts.shadowEnabled && (opts.shadowIntensity ?? 0) > 0) {
    const si = opts.shadowIntensity ?? 0
    ctx.shadowColor = opts.shadowColor ?? '#000000'
    ctx.shadowBlur = si * 0.3
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = si * 0.04
  }

  if (opts.outlineEnabled && (opts.outlineWidth ?? 0) > 0) {
    ctx.strokeStyle = opts.outlineColor ?? '#000000'
    ctx.lineWidth = opts.outlineWidth ?? 2
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
    ctx.strokeText(opts.text, opts.x, opts.y)
  }

  if (opts.gradientEnabled) {
    const metrics = ctx.measureText(opts.text)
    const ascent = metrics.actualBoundingBoxAscent || fontPx * 0.8
    const descent = metrics.actualBoundingBoxDescent || fontPx * 0.2
    const w = metrics.width
    const h = ascent + descent
    const angleRad = ((opts.gradientAngle ?? 90) * Math.PI) / 180
    const dx = Math.cos(angleRad)
    const dy = Math.sin(angleRad)
    const halfDiag = Math.sqrt(w * w + h * h) / 2
    const x1 = opts.x - dx * halfDiag
    const y1 = opts.y - dy * halfDiag
    const x2 = opts.x + dx * halfDiag
    const y2 = opts.y + dy * halfDiag
    const grad = ctx.createLinearGradient(x1, y1, x2, y2)
    grad.addColorStop(0, opts.color)
    grad.addColorStop(1, opts.gradientColor2 ?? opts.color)
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = opts.color
  }

  ctx.fillText(opts.text, opts.x, opts.y)
  ctx.restore()
}

/**
 * Per-layer text rendering used by the new TextLayer flow in the canvas
 * layer loop. Single text element; the legacy `drawTextOverlay` below
 * (3 fixed sub-layers) is kept for backward compat but no longer wired
 * into the render loop.
 *
 * `bassEnergy` (0..1) is the shared bass-band signal computed once per
 * frame in VisualizerCanvas — the same value the visualisers and the
 * Background-Video pulse read. Threading it here keeps the
 * audio-reactive text pulse in lockstep with everything else, including
 * during exports (captureStream / Railway worker — both drive the loop
 * off the master clock, so the same bassEnergy gets baked in).
 */
export function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  config: TextLayerConfig,
  width: number,
  height: number,
  isEditing: boolean,
  bassEnergy: number,
): void {
  if (isEditing) return
  drawStyledText(
    ctx,
    {
      text: config.text,
      x: config.x * width,
      y: config.y * height,
      fontSize: config.fontSize,
      font: config.font,
      fontWeight: config.fontWeight,
      color: config.color,
      letterSpacing: config.letterSpacing,
      shadowEnabled: config.shadowEnabled,
      shadowIntensity: config.shadowIntensity,
      shadowColor: config.shadowColor,
      glowEnabled: config.glowEnabled,
      glowIntensity: config.glowIntensity,
      glowColor: config.glowColor,
      outlineEnabled: config.outlineEnabled,
      outlineColor: config.outlineColor,
      outlineWidth: config.outlineWidth,
      gradientEnabled: config.gradientEnabled,
      gradientColor2: config.gradientColor2,
      gradientAngle: config.gradientAngle,
      audioReactiveEnabled: config.audioReactiveEnabled,
      audioReactiveIntensity: config.audioReactiveIntensity,
    },
    width,
    height,
    bassEnergy,
  )
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

interface TextOverlayConfig {
  title: TextLayer
  artist: TextLayer
  custom: TextLayer
}

/**
 * Painted on the canvas after the visualizer and frame, so the text:
 *   1. Sits on top of everything else.
 *   2. Is captured by canvas.captureStream() for video export.
 *
 * `editingLayerId` lets us skip painting a layer while the user is
 * inline-editing its HTML overlay — otherwise the canvas text would
 * show through behind the input field.
 *
 * Draw order: artist first, then title, then custom — so title dominates
 * if the two music-metadata layers overlap.
 */
export function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: TextOverlayConfig,
  editingLayerId: TextLayerId | null,
): void {
  const layers = [config.artist, config.title, config.custom]
  for (const layer of layers) {
    if (!layer.enabled || !layer.text.trim()) continue
    if (editingLayerId === layer.id) continue
    drawSingleText(ctx, width, height, layer)
  }
}

function drawSingleText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layer: TextLayer,
): void {
  ctx.save()

  ctx.font = `${layer.fontWeight} ${layer.fontSize}px "${layer.font}", sans-serif`
  ctx.fillStyle = layer.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if ('letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${layer.letterSpacing}px`
  }

  if (layer.shadowEnabled && layer.shadowIntensity > 0) {
    ctx.shadowColor = layer.shadowColor
    ctx.shadowBlur = layer.shadowIntensity * 0.3
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = layer.shadowIntensity * 0.04
  }

  ctx.fillText(layer.text, layer.x * width, layer.y * height)

  ctx.restore()
}
