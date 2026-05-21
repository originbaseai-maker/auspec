/**
 * Returns the FFT bin indices that correspond to a Hz frequency range.
 * @param fftSize    Number of FFT points (e.g. 2048)
 * @param sampleRate Audio context sample rate (usually 44100 or 48000)
 * @param startHz    Lower frequency bound in Hz
 * @param endHz      Upper frequency bound in Hz
 */
export function getFrequencyBinRange(
  fftSize: number,
  sampleRate: number,
  startHz: number,
  endHz: number,
): { startBin: number; endBin: number } {
  const nyquist = sampleRate / 2
  const binCount = fftSize / 2
  const hzPerBin = nyquist / binCount
  const startBin = Math.max(0, Math.floor(startHz / hzPerBin))
  const endBin = Math.min(binCount - 1, Math.ceil(endHz / hzPerBin))
  return { startBin, endBin }
}

export function calcBinIndex(
  hz: number,
  sampleRate: number,
  fftSize: number,
): number {
  const binHz = sampleRate / fftSize
  const binCount = fftSize / 2
  const index = Math.floor(hz / binHz)
  if (index < 0) return 0
  if (index > binCount) return binCount
  return index
}

export function calcBandAverage(
  data: Uint8Array,
  startHz: number,
  endHz: number,
  sampleRate: number,
  fftSize: number,
): number {
  const start = calcBinIndex(startHz, sampleRate, fftSize)
  const end = calcBinIndex(endHz, sampleRate, fftSize)
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  if (hi <= lo) return 0

  let sum = 0
  let count = 0
  const cap = Math.min(hi, data.length)
  for (let i = lo; i < cap; i++) {
    sum += data[i]
    count++
  }
  return count > 0 ? sum / count : 0
}

export function calcRMS(timeDomain: Uint8Array): number {
  if (timeDomain.length === 0) return 0
  let sumSquares = 0
  for (let i = 0; i < timeDomain.length; i++) {
    // Time-domain bytes are 0–255, centered at 128. Normalize to [-1, 1].
    const v = (timeDomain[i] - 128) / 128
    sumSquares += v * v
  }
  return Math.sqrt(sumSquares / timeDomain.length)
}

export function calcPeak(data: Uint8Array): number {
  let peak = 0
  for (let i = 0; i < data.length; i++) {
    if (data[i] > peak) peak = data[i]
  }
  return peak
}

/**
 * Compute bar color with optional hue interpolation (rainbow effect).
 * @param t            0–1 position along bar array
 * @param colorStart   hex color string e.g. '#3b82f6'
 * @param colorEnd     hex color string e.g. '#8b5cf6'
 * @param hueInterpolation  0 = use colorStart/colorEnd gradient,
 *                          >0 = rotate hue by this many degrees across bars
 */
export function getBarColor(
  t: number,
  colorStart: string,
  colorEnd: string,
  hueInterpolation: number,
): string {
  if (hueInterpolation > 0) {
    const hue = (t * hueInterpolation) % 360
    return `hsl(${hue}, 90%, 60%)`
  }
  const r1 = parseInt(colorStart.slice(1, 3), 16)
  const g1 = parseInt(colorStart.slice(3, 5), 16)
  const b1 = parseInt(colorStart.slice(5, 7), 16)
  const r2 = parseInt(colorEnd.slice(1, 3), 16)
  const g2 = parseInt(colorEnd.slice(3, 5), 16)
  const b2 = parseInt(colorEnd.slice(5, 7), 16)
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`
}

/**
 * Compute the FFT bin range covering [startHz, endHz] for a given fftSize and sampleRate.
 * Used by renderers that support a configurable frequency window.
 */
export function getFrequencyBinRange(
  fftSize: number,
  sampleRate: number,
  startHz: number,
  endHz: number,
): { startBin: number; endBin: number } {
  const binHz = sampleRate / fftSize
  const binCount = fftSize / 2
  const startBin = Math.min(
    binCount - 1,
    Math.max(0, Math.floor(startHz / binHz)),
  )
  const endBin = Math.min(
    binCount,
    Math.max(startBin + 1, Math.ceil(endHz / binHz)),
  )
  return { startBin, endBin }
}

export function calcBeatEnergy(bass: number, history: number[]): number {
  if (history.length === 0) return 0
  let sum = 0
  for (let i = 0; i < history.length; i++) sum += history[i]
  const avg = sum / history.length
  if (avg <= 0) return 0
  const ratio = bass / avg
  // Clamp to 0–1; ratio > 1 means current bass exceeds rolling average.
  if (ratio <= 0) return 0
  if (ratio >= 1) return 1
  return ratio
}
