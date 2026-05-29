import type { FrequencyData } from '@/types/analyzer'
import {
  addPaletteStops,
  firstColor,
  lastColor,
  parseColor,
  resolveBarColor,
} from '@/lib/colorPalette'
import { drawGlow } from './glow'

function withAlpha(color: string, alpha: number): string {
  const { r, g, b } = parseColor(color)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface WaveConfig {
  colorStart: string
  colorEnd: string
  /** Optional multi-color palette (3-7). When set, overrides colorStart/colorEnd. */
  palette?: string[]
  lineThickness: number
  glowEnabled: boolean
  glowIntensity: number
  filled: boolean
  smoothing: number
  mirrorMode: boolean
  hueInterpolation: number
  startFrequency: number
  endFrequency: number
}

export const DEFAULT_WAVE_CONFIG: WaveConfig = {
  colorStart: '#3b82f6',
  colorEnd: '#8b5cf6',
  lineThickness: 3,
  glowEnabled: true,
  glowIntensity: 8,
  filled: true,
  smoothing: 0.3,
  mirrorMode: false,
  hueInterpolation: 0,
  startFrequency: 20,
  endFrequency: 20000,
}

export function renderWave(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: WaveConfig,
  width: number,
  height: number,
): void {
  const { timeDomain } = frequencyData
  const {
    colorStart,
    colorEnd,
    palette,
    lineThickness,
    glowEnabled,
    glowIntensity,
    filled,
    mirrorMode,
    hueInterpolation,
  } = config

  if (!timeDomain || timeDomain.length === 0) return

  const sliceWidth = width / timeDomain.length
  const centerY = height / 2

  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  addPaletteStops(gradient, palette, colorStart, colorEnd)

  ctx.save()

  const usePerSegment = hueInterpolation > 0 || (palette && palette.length >= 2)
  const glowColor = lastColor(palette, colorEnd)

  ctx.lineWidth = lineThickness
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const sampleY = (i: number, flip: boolean) => {
    const v = timeDomain[i] / 128.0 - 1.0
    return flip ? centerY - v * centerY * 0.8 : centerY + v * centerY * 0.8
  }

  /**
   * Trace the wave path once on the current context (caller controls
   * stroke / fill afterwards). Hoisted so the glow pass, sharp pass,
   * and fill pass all share one path-building loop instead of three.
   */
  const tracePath = (flip: boolean): void => {
    ctx.beginPath()
    for (let i = 0; i < timeDomain.length; i++) {
      const x = i * sliceWidth
      const y = sampleY(i, flip)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
  }

  const drawWavePath = (flip: boolean) => {
    // PERF: shadowBlur on Canvas2D is software-rendered and dominates
    // the frame budget on full-canvas-width strokes (~10–15 ms/frame).
    // Even after collapsing the per-segment loop to one shadowBlur'd
    // stroke, the single call was still too expensive for video-
    // background stacks (Winter Dream, Spring Morning).
    //
    // Two-pass fix using the shared drawGlow helper:
    //   1. Glow halo — drawn on a downscaled offscreen with GPU-
    //      accelerated ctx.filter='blur(...)', composited additively
    //      with 'lighter'. ~5–10x cheaper than shadowBlur.
    //   2. Sharp line — drawn on main with shadowBlur=0, either per-
    //      segment (palette branch) or single gradient stroke.
    ctx.shadowBlur = 0
    if (glowEnabled && glowIntensity > 0) {
      drawGlow(ctx, {
        blurPx: glowIntensity,
        width,
        height,
        drawSource: (off) => {
          off.lineWidth = lineThickness
          off.lineCap = 'round'
          off.lineJoin = 'round'
          off.strokeStyle = glowColor
          off.beginPath()
          for (let i = 0; i < timeDomain.length; i++) {
            const x = i * sliceWidth
            const y = sampleY(i, flip)
            if (i === 0) off.moveTo(x, y)
            else off.lineTo(x, y)
          }
          off.stroke()
        },
      })
    }

    if (usePerSegment) {
      for (let i = 0; i < timeDomain.length - 1; i++) {
        ctx.strokeStyle = resolveBarColor(
          i / timeDomain.length,
          palette,
          colorStart,
          colorEnd,
          hueInterpolation,
        )
        ctx.beginPath()
        ctx.moveTo(i * sliceWidth, sampleY(i, flip))
        ctx.lineTo((i + 1) * sliceWidth, sampleY(i + 1, flip))
        ctx.stroke()
      }
    } else {
      ctx.strokeStyle = gradient
      tracePath(flip)
      ctx.stroke()
    }

    if (filled) {
      // shadowBlur is already 0 from the sharp pass above. The fill is
      // a soft tint underlay — blurring it on top of the glow halo
      // would double the cost and just smear the silhouette.
      ctx.beginPath()
      for (let i = 0; i < timeDomain.length; i++) {
        const x = i * sliceWidth
        const y = sampleY(i, flip)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.lineTo(width, centerY)
      ctx.lineTo(0, centerY)
      ctx.closePath()
      // The fill uses palette endpoints at low alpha so the filled area
      // tints toward the line color without overwhelming it.
      const fillGradient = ctx.createLinearGradient(0, 0, width, 0)
      const fillStart = firstColor(palette, colorStart)
      const fillEnd = lastColor(palette, colorEnd)
      fillGradient.addColorStop(0, withAlpha(fillStart, 0.2))
      fillGradient.addColorStop(1, withAlpha(fillEnd, 0.2))
      ctx.fillStyle = fillGradient
      ctx.fill()
    }
  }

  drawWavePath(false)
  if (mirrorMode) {
    ctx.globalAlpha = 0.5
    drawWavePath(true)
    ctx.globalAlpha = 1.0
  }

  ctx.restore()
}
