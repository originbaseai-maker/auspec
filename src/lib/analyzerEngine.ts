import type { AnalyzerConfig, FrequencyData } from '@/types/analyzer'
import { calcRMS, calcPeak } from '@/lib/frequencyUtils'

function bandAverageFromBins(
  data: Uint8Array,
  start: number,
  end: number
): number {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const cap = Math.min(hi, data.length)
  if (cap <= lo) return 0
  let sum = 0
  let count = 0
  for (let i = lo; i < cap; i++) {
    sum += data[i]
    count++
  }
  return count > 0 ? sum / count : 0
}

const BEAT_HISTORY_MAX = 43

const BAND_HZ = {
  bassLow: 20,
  bassHigh: 250,
  midLow: 250,
  midHigh: 4000,
  trebleLow: 4000,
  trebleHigh: 20000,
} as const

interface BandBins {
  bassStart: number
  bassEnd: number
  midStart: number
  midEnd: number
  trebleStart: number
  trebleEnd: number
}

export class AnalyzerEngine {
  private analyser: AnalyserNode
  private frequencyBuffer: Uint8Array<ArrayBuffer>
  private timeDomainBuffer: Uint8Array<ArrayBuffer>
  private beatHistory: number[] = []
  private animationId: number | null = null
  private config: AnalyzerConfig
  private onFrame: (data: FrequencyData) => void
  private sampleRate: number
  private bins: BandBins
  private readonly tickBound: () => void

  constructor(
    analyser: AnalyserNode,
    config: AnalyzerConfig,
    onFrame: (data: FrequencyData) => void
  ) {
    this.analyser = analyser
    this.config = { ...config }
    this.onFrame = onFrame
    this.sampleRate = analyser.context.sampleRate

    this.applyConfigToAnalyser(this.config)

    this.frequencyBuffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    this.timeDomainBuffer = new Uint8Array(new ArrayBuffer(analyser.fftSize))
    this.bins = this.computeBins()
    this.tickBound = () => this.tick()
  }

  start(): void {
    if (this.animationId !== null) return
    this.animationId = requestAnimationFrame(this.tickBound)
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  isRunning(): boolean {
    return this.animationId !== null
  }

  updateConfig(config: Partial<AnalyzerConfig>): void {
    const next = { ...this.config, ...config }
    const fftChanged = next.fftSize !== this.config.fftSize
    this.config = next
    this.applyConfigToAnalyser(this.config)

    if (fftChanged) {
      this.frequencyBuffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount))
      this.timeDomainBuffer = new Uint8Array(new ArrayBuffer(this.analyser.fftSize))
      this.bins = this.computeBins()
      this.beatHistory.length = 0
    }
  }

  private applyConfigToAnalyser(config: AnalyzerConfig): void {
    if (typeof config.fftSize === 'number' && this.analyser.fftSize !== config.fftSize) {
      this.analyser.fftSize = config.fftSize
    }
    if (typeof config.smoothingTimeConstant === 'number') {
      this.analyser.smoothingTimeConstant = config.smoothingTimeConstant
    }
    if (typeof config.minDecibels === 'number') {
      this.analyser.minDecibels = config.minDecibels
    }
    if (typeof config.maxDecibels === 'number') {
      this.analyser.maxDecibels = config.maxDecibels
    }
  }

  private computeBins(): BandBins {
    const binHz = this.sampleRate / this.analyser.fftSize
    const last = this.analyser.frequencyBinCount - 1
    const toBin = (hz: number) =>
      Math.min(last, Math.max(0, Math.round(hz / binHz)))
    return {
      bassStart: toBin(BAND_HZ.bassLow),
      bassEnd: toBin(BAND_HZ.bassHigh),
      midStart: toBin(BAND_HZ.midLow),
      midEnd: toBin(BAND_HZ.midHigh),
      trebleStart: toBin(BAND_HZ.trebleLow),
      trebleEnd: toBin(BAND_HZ.trebleHigh),
    }
  }

  private tick(): void {
    this.analyser.getByteFrequencyData(this.frequencyBuffer)
    this.analyser.getByteTimeDomainData(this.timeDomainBuffer)

    const bass = bandAverageFromBins(
      this.frequencyBuffer,
      this.bins.bassStart,
      this.bins.bassEnd
    )
    const mid = bandAverageFromBins(
      this.frequencyBuffer,
      this.bins.midStart,
      this.bins.midEnd
    )
    const treble = bandAverageFromBins(
      this.frequencyBuffer,
      this.bins.trebleStart,
      this.bins.trebleEnd
    )
    const rms = calcRMS(this.timeDomainBuffer)
    const peak = calcPeak(this.frequencyBuffer)

    const history = this.beatHistory
    let sum = 0
    for (let i = 0; i < history.length; i++) sum += history[i]
    const avg = history.length > 0 ? sum / history.length : 0
    const beatEnergy = avg > 0 ? bass / avg : 0

    history.push(bass)
    if (history.length > BEAT_HISTORY_MAX) history.shift()

    this.onFrame({
      raw: this.frequencyBuffer,
      bass,
      mid,
      treble,
      rms,
      peak,
      beatEnergy,
      timeDomain: this.timeDomainBuffer,
    })

    this.animationId = requestAnimationFrame(this.tickBound)
  }
}
