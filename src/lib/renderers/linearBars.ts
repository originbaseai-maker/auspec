import type { FrequencyData } from '@/types/analyzer'
import { getBarColor } from '@/lib/frequencyUtils'

export type DisplayMode = 'digital' | 'analog_lines' | 'analog_dots'

export interface LinearBarsConfig {
  barCount: number
  barGap: number
  minBarHeight: number
  colorStart: string
  colorEnd: string
  glowEnabled: boolean
  glowIntensity: number
  mirrorMode: boolean
  smoothing: number
  displayMode: DisplayMode
  dotSize: number
  hueInterpolation: number
}

export function renderLinearBars(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: LinearBarsConfig,
  width: number,
  height: number,
  previousHeights: Float32Array,
): void {
  const {
    barCount,
    barGap,
    minBarHeight,
    colorStart,
    colorEnd,
    glowEnabled,
    glowIntensity,
    mirrorMode,
    smoothing,
    displayMode,
    dotSize,
    hueInterpolation,
  } = config
  const { raw } = frequencyData

  const totalGap = barGap * (barCount - 1)
  const barWidth = Math.max(1, (width - totalGap) / barCount)
  const step = Math.floor(raw.length / barCount) || 1

  if (glowEnabled) {
    ctx.shadowBlur = glowIntensity
    ctx.shadowColor = colorEnd
  } else {
    ctx.shadowBlur = 0
  }

  // First pass: advance the smoothed heights so every display mode shares the
  // same per-frame smoothing.
  for (let i = 0; i < barCount; i++) {
    const rawValue = raw[i * step] ?? 0
    const targetHeight = Math.max(
      minBarHeight,
      (rawValue / 255) * height * (mirrorMode ? 0.5 : 1),
    )
    previousHeights[i] =
      previousHeights[i] + (targetHeight - previousHeights[i]) * smoothing
  }

  if (displayMode === 'analog_lines') {
    // Smooth polyline through bar peaks instead of solid rectangles.
    // Bezier-smoothed using midpoint control points for a curve that
    // hugs every peak.
    const drawPeakCurve = (flip: boolean) => {
      ctx.beginPath()
      const peakY = (i: number) => {
        const h = previousHeights[i]
        if (mirrorMode) {
          const centerY = height / 2
          return flip ? centerY + h : centerY - h
        }
        return flip ? h : height - h
      }

      // Start at first peak
      const x0 = barWidth / 2
      ctx.moveTo(x0, peakY(0))

      for (let i = 0; i < barCount - 1; i++) {
        const xCur = i * (barWidth + barGap) + barWidth / 2
        const xNext = (i + 1) * (barWidth + barGap) + barWidth / 2
        const yCur = peakY(i)
        const yNext = peakY(i + 1)
        // Midpoint as the end of a quadratic curve from current → next
        const xMid = (xCur + xNext) / 2
        const yMid = (yCur + yNext) / 2
        ctx.quadraticCurveTo(xCur, yCur, xMid, yMid)
      }
      // Final segment to last point
      const xLast = (barCount - 1) * (barWidth + barGap) + barWidth / 2
      ctx.lineTo(xLast, peakY(barCount - 1))
    }

    // hue interpolation across the line: stroke with a precomputed gradient
    // if hue mode is off, otherwise stroke segment-by-segment.
    if (hueInterpolation > 0) {
      // Segment-by-segment with per-segment hue color.
      const drawSegments = (flip: boolean) => {
        for (let i = 0; i < barCount - 1; i++) {
          const xCur = i * (barWidth + barGap) + barWidth / 2
          const xNext = (i + 1) * (barWidth + barGap) + barWidth / 2
          const hCur = previousHeights[i]
          const hNext = previousHeights[i + 1]
          const centerY = height / 2
          const yCur = mirrorMode
            ? flip
              ? centerY + hCur
              : centerY - hCur
            : flip
              ? hCur
              : height - hCur
          const yNext = mirrorMode
            ? flip
              ? centerY + hNext
              : centerY - hNext
            : flip
              ? hNext
              : height - hNext
          ctx.strokeStyle = getBarColor(
            i / barCount,
            colorStart,
            colorEnd,
            hueInterpolation,
          )
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(xCur, yCur)
          ctx.lineTo(xNext, yNext)
          ctx.stroke()
        }
      }
      drawSegments(false)
      if (mirrorMode) drawSegments(true)
    } else {
      const gradient = ctx.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, colorStart)
      gradient.addColorStop(1, colorEnd)
      ctx.strokeStyle = gradient
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      drawPeakCurve(false)
      ctx.stroke()
      if (mirrorMode) {
        drawPeakCurve(true)
        ctx.stroke()
      }
    }

    ctx.shadowBlur = 0
    return
  }

  if (displayMode === 'analog_dots') {
    // Series of dots along each bar's height instead of a filled rectangle.
    const dotSpacing = dotSize * 2.5
    const radius = dotSize / 2

    for (let i = 0; i < barCount; i++) {
      const barHeight = previousHeights[i]
      const x = i * (barWidth + barGap) + barWidth / 2
      const numDots = Math.max(1, Math.floor(barHeight / dotSpacing))

      ctx.fillStyle = getBarColor(
        i / barCount,
        colorStart,
        colorEnd,
        hueInterpolation,
      )

      const baseY = mirrorMode ? height / 2 : height
      for (let d = 0; d < numDots; d++) {
        const offset = d * dotSpacing + radius
        const dotY = baseY - offset
        ctx.beginPath()
        ctx.arc(x, dotY, radius, 0, Math.PI * 2)
        ctx.fill()
        if (mirrorMode) {
          ctx.beginPath()
          ctx.arc(x, baseY + offset, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    ctx.shadowBlur = 0
    return
  }

  // 'digital' — solid rectangles (existing behavior, now hue-aware)
  if (hueInterpolation > 0) {
    for (let i = 0; i < barCount; i++) {
      const barHeight = previousHeights[i]
      const x = i * (barWidth + barGap)
      ctx.fillStyle = getBarColor(
        i / barCount,
        colorStart,
        colorEnd,
        hueInterpolation,
      )
      if (mirrorMode) {
        const centerY = height / 2
        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2)
      } else {
        ctx.fillRect(x, height - barHeight, barWidth, barHeight)
      }
    }
  } else {
    const gradient = ctx.createLinearGradient(0, height, 0, 0)
    gradient.addColorStop(0, colorStart)
    gradient.addColorStop(1, colorEnd)
    ctx.fillStyle = gradient

    for (let i = 0; i < barCount; i++) {
      const barHeight = previousHeights[i]
      const x = i * (barWidth + barGap)
      if (mirrorMode) {
        const centerY = height / 2
        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2)
      } else {
        ctx.fillRect(x, height - barHeight, barWidth, barHeight)
      }
    }
  }

  ctx.shadowBlur = 0
}
