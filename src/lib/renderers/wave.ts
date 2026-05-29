import type { FrequencyData } from '@/types/analyzer'
import {
  addPaletteStops,
  firstColor,
  lastColor,
  parseColor,
  resolveBarColor,
} from '@/lib/colorPalette'

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
    // PERF: previously, `usePerSegment` (any palette ≥ 2 stops) ran a
    // beginPath/moveTo/lineTo/stroke loop with shadowBlur enabled
    // GLOBALLY — each of the ~1024 timeDomain segments fired a full
    // gaussian-blur composite for a 1px line. On Winter Dream that
    // alone cost 50–100 ms/frame and was the entire stutter budget.
    //
    // Two-pass fix:
    //   1. Glow halo — ONE shadowBlur'd stroke on the full path at a
    //      single representative colour (last palette stop). Soft by
    //      nature, so a single uniform colour reads identically to
    //      the previous per-segment glow.
    //   2. Sharp line — shadowBlur OFF, then either the existing
    //      per-segment loop (preserving the discrete palette banding)
    //      or a single gradient stroke. shadowBlur=0 makes 1000+ tiny
    //      strokes cheap again.
    if (glowEnabled && glowIntensity > 0) {
      ctx.shadowBlur = glowIntensity
      ctx.shadowColor = glowColor
      ctx.strokeStyle = glowColor
      tracePath(flip)
      ctx.stroke()
      ctx.shadowBlur = 0
    } else {
      ctx.shadowBlur = 0
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
