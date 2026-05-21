import type { FrequencyData } from '@/types/analyzer'
import { getFrequencyBinRange } from '@/lib/frequencyUtils'

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
    startFrequency,
    endFrequency,
    sideMode,
  } = config
  const { raw } = frequencyData

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

  const gradient = ctx.createLinearGradient(0, height, 0, 0)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)

  if (glowEnabled) {
    ctx.shadowBlur = glowIntensity
    ctx.shadowColor = colorEnd
  } else {
    ctx.shadowBlur = 0
  }

  ctx.fillStyle = gradient

  // sideMode only applies when mirrorMode is on; without mirroring there is
  // only a single bar, drawn from the bottom up (preserves prior behavior).
  const drawTop = sideMode !== 'side_b'
  const drawBottom = sideMode !== 'side_a'
  const centerY = height / 2

  for (let i = 0; i < barCount; i++) {
    const rawValue = slicedRaw[i * step] ?? 0
    const targetHeight = Math.max(
      minBarHeight,
      (rawValue / 255) * height * (mirrorMode ? 0.5 : 1),
    )

    previousHeights[i] =
      previousHeights[i] + (targetHeight - previousHeights[i]) * smoothing

    const barHeight = previousHeights[i]
    const x = i * (barWidth + barGap)

    if (mirrorMode) {
      if (drawTop) ctx.fillRect(x, centerY - barHeight, barWidth, barHeight)
      if (drawBottom) ctx.fillRect(x, centerY, barWidth, barHeight)
    } else {
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)
    }
  }

  ctx.shadowBlur = 0
}
