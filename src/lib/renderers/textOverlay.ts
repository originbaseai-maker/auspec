import type { TextLayer, TextLayerId } from '@/store/useTextStore'
import type { TextLayerConfig } from '@/types/layer'
import { drawGlow } from '@/lib/renderers/glow'

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
  if (!config.text.trim()) return

  // Audio-reactive scale pulse. Capped at ~6% so the text "breathes"
  // with the bass without becoming distracting. Same multiplier maths
  // as the Background-Video pulse, just scaled smaller because text
  // contrast amplifies motion perceptually.
  let scale = 1
  if (config.audioReactiveEnabled) {
    const intensity = clamp01(config.audioReactiveIntensity ?? 0.5)
    const e = clamp01(bassEnergy)
    scale = 1 + e * 0.06 * intensity
  }

  const fontPx = config.fontSize * scale
  const x = config.x * width
  const y = config.y * height
  const fontSpec = `${config.fontWeight} ${fontPx}px "${config.font}", sans-serif`

  // --- GLOW PASS (offscreen + GPU filter-blur, never shadowBlur) ---
  // shadowBlur was removed from Wave / Bloom Organic for the same
  // reason it'd be wrong here: it's software-rendered and costs 10+
  // ms per call. drawGlow renders to a half-res offscreen with
  // ctx.filter='blur(...)' then composites with 'lighter' — ~2 ms
  // regardless of glow radius.
  if (config.glowEnabled && (config.glowIntensity ?? 0) > 0) {
    const glowColor = config.glowColor ?? config.color
    drawGlow(ctx, {
      blurPx: config.glowIntensity ?? 24,
      width,
      height,
      drawSource: (off) => {
        off.font = fontSpec
        off.fillStyle = glowColor
        off.textAlign = 'center'
        off.textBaseline = 'middle'
        if ('letterSpacing' in off) {
          ;(off as CanvasRenderingContext2D & {
            letterSpacing: string
          }).letterSpacing = `${config.letterSpacing}px`
        }
        off.fillText(config.text, x, y)
      },
    })
  }

  // --- SHARP PASS (main canvas) ---
  ctx.save()
  ctx.font = fontSpec
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if ('letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${config.letterSpacing}px`
  }

  // Drop shadow stays on shadowBlur — it's a single offset shadow,
  // small radius (intensity * 0.3, max 30 px), and per-letter rather
  // than per-path. The cost is bounded and the offset+blur effect
  // can't be done cheaply with filter (would need a second offscreen
  // pass with a translate). Acceptable.
  if (config.shadowEnabled && config.shadowIntensity > 0) {
    ctx.shadowColor = config.shadowColor
    ctx.shadowBlur = config.shadowIntensity * 0.3
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = config.shadowIntensity * 0.04
  }

  // Outline first so the fill (or gradient) lands on top — outline
  // sticking out beyond the silhouette is the desired look.
  if (config.outlineEnabled && (config.outlineWidth ?? 0) > 0) {
    ctx.strokeStyle = config.outlineColor ?? '#000000'
    ctx.lineWidth = config.outlineWidth ?? 2
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
    ctx.strokeText(config.text, x, y)
  }

  // Fill — solid or two-stop linear gradient. The gradient extends
  // across the measured text bounding box so each glyph gets the
  // full sweep regardless of fontSize.
  if (config.gradientEnabled) {
    const metrics = ctx.measureText(config.text)
    const ascent = metrics.actualBoundingBoxAscent || fontPx * 0.8
    const descent = metrics.actualBoundingBoxDescent || fontPx * 0.2
    const w = metrics.width
    const h = ascent + descent
    const angleRad = ((config.gradientAngle ?? 90) * Math.PI) / 180
    const dx = Math.cos(angleRad)
    const dy = Math.sin(angleRad)
    const halfDiag = Math.sqrt(w * w + h * h) / 2
    const x1 = x - dx * halfDiag
    const y1 = y - dy * halfDiag
    const x2 = x + dx * halfDiag
    const y2 = y + dy * halfDiag
    const grad = ctx.createLinearGradient(x1, y1, x2, y2)
    grad.addColorStop(0, config.color)
    grad.addColorStop(1, config.gradientColor2 ?? config.color)
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = config.color
  }

  ctx.fillText(config.text, x, y)
  ctx.restore()
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
