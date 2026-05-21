import type { FrequencyData } from '@/types/analyzer'
import { getBarColor, getFrequencyBinRange } from '@/lib/frequencyUtils'

export type DisplayMode = 'digital' | 'analog_lines' | 'analog_dots'
export type BarsSideMode = 'both' | 'side_a' | 'side_b'

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
  startFrequency: number
  endFrequency: number
  sideMode: BarsSideMode
}

const FALLBACK_SAMPLE_RATE = 44100

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
    startFrequency,
    endFrequency,
    sideMode,
  } = config
  const { raw } = frequencyData

  // Frequency range slicing — only sample bins inside [startFrequency, endFrequency].
  const { startBin, endBin } = getFrequencyBinRange(
    raw.length * 2,
    FALLBACK_SAMPLE_RATE,
    startFrequency,
    endFrequency,
  )
  const slicedRaw = raw.subarray(startBin, endBin + 1)
  const sourceLen = slicedRaw.length || 1

  const totalGap = barGap * (barCount - 1)
  const barWidth = Math.max(1, (width - totalGap) / barCount)
  const step = Math.max(1, Math.floor(sourceLen / barCount))

  if (glowEnabled) {
    ctx.shadowBlur = glowIntensity
    ctx.shadowColor = colorEnd
  } else {
    ctx.shadowBlur = 0
  }

  // sideMode only has visual effect when mirrorMode is on (selects which half).
  const drawTop = sideMode !== 'side_b'
  const drawBottom = sideMode !== 'side_a'
  const centerY = height / 2

  // Smoothing pass — runs every frame regardless of display mode so the
  // perceived response is consistent when switching modes.
  for (let i = 0; i < barCount; i++) {
    const rawValue = slicedRaw[i * step] ?? 0
    const targetHeight = Math.max(
      minBarHeight,
      (rawValue / 255) * height * (mirrorMode ? 0.5 : 1),
    )
    previousHeights[i] =
      previousHeights[i] + (targetHeight - previousHeights[i]) * smoothing
  }

  if (displayMode === 'analog_lines') {
    // Smooth quadratic-bezier polyline through every bar peak.
    const peakY = (i: number, flip: boolean): number => {
      const h = previousHeights[i]
      if (mirrorMode) return flip ? centerY + h : centerY - h
      return flip ? h : height - h
    }

    const drawPeakCurve = (flip: boolean) => {
      ctx.beginPath()
      ctx.moveTo(barWidth / 2, peakY(0, flip))
      for (let i = 0; i < barCount - 1; i++) {
        const xCur = i * (barWidth + barGap) + barWidth / 2
        const xNext = (i + 1) * (barWidth + barGap) + barWidth / 2
        const xMid = (xCur + xNext) / 2
        const yMid = (peakY(i, flip) + peakY(i + 1, flip)) / 2
        ctx.quadraticCurveTo(xCur, peakY(i, flip), xMid, yMid)
      }
      const xLast = (barCount - 1) * (barWidth + barGap) + barWidth / 2
      ctx.lineTo(xLast, peakY(barCount - 1, flip))
    }

    if (hueInterpolation > 0) {
      // Per-segment color so the rainbow runs along the curve.
      const drawSegments = (flip: boolean) => {
        for (let i = 0; i < barCount - 1; i++) {
          const xCur = i * (barWidth + barGap) + barWidth / 2
          const xNext = (i + 1) * (barWidth + barGap) + barWidth / 2
          ctx.strokeStyle = getBarColor(
            i / barCount,
            colorStart,
            colorEnd,
            hueInterpolation,
          )
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(xCur, peakY(i, flip))
          ctx.lineTo(xNext, peakY(i + 1, flip))
          ctx.stroke()
        }
      }
      if (!mirrorMode) {
        drawSegments(false)
      } else {
        if (drawTop) drawSegments(false)
        if (drawBottom) drawSegments(true)
      }
    } else {
      const gradient = ctx.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, colorStart)
      gradient.addColorStop(1, colorEnd)
      ctx.strokeStyle = gradient
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (!mirrorMode) {
        drawPeakCurve(false)
        ctx.stroke()
      } else {
        if (drawTop) {
          drawPeakCurve(false)
          ctx.stroke()
        }
        if (drawBottom) {
          drawPeakCurve(true)
          ctx.stroke()
        }
      }
    }

    ctx.shadowBlur = 0
    return
  }

  if (displayMode === 'analog_dots') {
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

      const baseY = mirrorMode ? centerY : height
      for (let d = 0; d < numDots; d++) {
        const offset = d * dotSpacing + radius
        if (mirrorMode) {
          if (drawTop) {
            ctx.beginPath()
            ctx.arc(x, baseY - offset, radius, 0, Math.PI * 2)
            ctx.fill()
          }
          if (drawBottom) {
            ctx.beginPath()
            ctx.arc(x, baseY + offset, radius, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          ctx.beginPath()
          ctx.arc(x, baseY - offset, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    ctx.shadowBlur = 0
    return
  }

  // 'digital' — solid rectangles (default behavior)
  const useHue = hueInterpolation > 0
  if (!useHue) {
    const gradient = ctx.createLinearGradient(0, height, 0, 0)
    gradient.addColorStop(0, colorStart)
    gradient.addColorStop(1, colorEnd)
    ctx.fillStyle = gradient
  }

  for (let i = 0; i < barCount; i++) {
    const barHeight = previousHeights[i]
    const x = i * (barWidth + barGap)
    if (useHue) {
      ctx.fillStyle = getBarColor(
        i / barCount,
        colorStart,
        colorEnd,
        hueInterpolation,
      )
    }
    if (mirrorMode) {
      if (drawTop) ctx.fillRect(x, centerY - barHeight, barWidth, barHeight)
      if (drawBottom) ctx.fillRect(x, centerY, barWidth, barHeight)
    } else {
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)
    }
  }

  ctx.shadowBlur = 0
}
