import type { FrequencyData } from '@/types/analyzer'

export interface WaveConfig {
  colorStart: string
  colorEnd: string
  lineThickness: number
  glowEnabled: boolean
  glowIntensity: number
  filled: boolean
  smoothing: number
  mirrorMode: boolean
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
    lineThickness,
    glowEnabled,
    glowIntensity,
    filled,
    mirrorMode,
  } = config

  if (!timeDomain || timeDomain.length === 0) return

  const sliceWidth = width / timeDomain.length
  const centerY = height / 2

  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)

  ctx.save()

  if (glowEnabled) {
    ctx.shadowBlur = glowIntensity
    ctx.shadowColor = colorEnd
  } else {
    ctx.shadowBlur = 0
  }

  ctx.strokeStyle = gradient
  ctx.lineWidth = lineThickness
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const drawWavePath = (flip: boolean) => {
    ctx.beginPath()
    for (let i = 0; i < timeDomain.length; i++) {
      const v = timeDomain[i] / 128.0 - 1.0
      const y = flip
        ? centerY - v * centerY * 0.8
        : centerY + v * centerY * 0.8
      const x = i * sliceWidth
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    if (filled) {
      ctx.lineTo(width, centerY)
      ctx.lineTo(0, centerY)
      ctx.closePath()
      const fillGradient = ctx.createLinearGradient(0, 0, width, 0)
      fillGradient.addColorStop(0, colorStart + '33')
      fillGradient.addColorStop(1, colorEnd + '33')
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
