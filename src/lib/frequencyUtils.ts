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
