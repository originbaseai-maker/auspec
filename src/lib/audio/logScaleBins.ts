import { SPECTRUM_MAX_HZ, SPECTRUM_MIN_HZ } from './constants'

export type LogScaleMode = 'average' | 'peak'

/**
 * Map a linear FFT buffer onto `outputBins` slots spaced logarithmically
 * across [minFreq, maxFreq]. Bass gets more relative resolution than
 * raw FFT gives it (where 20–250 Hz spans only ~12 bins of a 2048
 * FFT); treble is condensed but stays present.
 *
 * `mode`:
 *   - 'average' — softer, better for waveform-style fills (default)
 *   - 'peak'    — punchier, better for bar visualisers
 *
 * Output is normalised to 0..1 for Uint8Array input (divide by 255).
 * Float32Array input is assumed already in 0..1.
 */
export function toLogScaleBins(
  fftData: Uint8Array | Float32Array,
  sampleRate: number,
  outputBins: number,
  out: Float32Array,
  mode: LogScaleMode = 'average',
  minFreq: number = SPECTRUM_MIN_HZ,
  maxFreq: number = SPECTRUM_MAX_HZ,
): Float32Array {
  const nyquist = sampleRate / 2
  const fftSize = fftData.length
  const logMin = Math.log(minFreq)
  const logMax = Math.log(maxFreq)
  const isByte = fftData instanceof Uint8Array
  const norm = isByte ? 1 / 255 : 1

  for (let i = 0; i < outputBins; i++) {
    const freqLow = Math.exp(logMin + (i / outputBins) * (logMax - logMin))
    const freqHigh = Math.exp(
      logMin + ((i + 1) / outputBins) * (logMax - logMin),
    )
    const binLow = Math.max(0, Math.floor((freqLow / nyquist) * fftSize))
    const binHigh = Math.min(
      fftSize - 1,
      Math.ceil((freqHigh / nyquist) * fftSize),
    )

    if (mode === 'peak') {
      let peak = 0
      for (let b = binLow; b <= binHigh; b++) {
        const v = fftData[b]
        if (v > peak) peak = v
      }
      out[i] = peak * norm
    } else {
      let sum = 0
      let count = 0
      for (let b = binLow; b <= binHigh; b++) {
        sum += fftData[b]
        count++
      }
      out[i] = count > 0 ? (sum / count) * norm : 0
    }
  }
  return out
}

/**
 * Convert a spectrum index back to its central frequency. Useful when
 * a renderer needs to know "what Hz is this bin?" — e.g. to apply
 * per-band gain by frequency rather than by linear-FFT bin position.
 */
export function spectrumIdxToFreq(
  idx: number,
  bins: number,
  minFreq: number = SPECTRUM_MIN_HZ,
  maxFreq: number = SPECTRUM_MAX_HZ,
): number {
  const logMin = Math.log(minFreq)
  const logMax = Math.log(maxFreq)
  const t = bins > 0 ? idx / bins : 0
  return Math.exp(logMin + t * (logMax - logMin))
}

/**
 * Convert a frequency in Hz to a (fractional) spectrum index. Used by
 * renderers that expose a startFrequency/endFrequency window: map the
 * Hz range onto the log-scaled spectrum array.
 */
export function freqToSpectrumIdx(
  freq: number,
  bins: number,
  minFreq: number = SPECTRUM_MIN_HZ,
  maxFreq: number = SPECTRUM_MAX_HZ,
): number {
  const logMin = Math.log(minFreq)
  const logMax = Math.log(maxFreq)
  const f = Math.max(minFreq, Math.min(maxFreq, freq))
  return ((Math.log(f) - logMin) / (logMax - logMin)) * bins
}

/**
 * Frequency-aware band sensitivity. The bass/mid/treble split honours
 * the same Hz boundaries as AnalyzerEngine (250 Hz, 4 kHz) so the
 * user's per-band gain still maps to "what they hear."
 *
 * Input + output are normalised to 0..1 (spectrum values), not 0..255.
 */
export function applyBandSensitivityByFreq(
  value: number,
  freq: number,
  bassSensitivity: number = 1,
  midSensitivity: number = 1,
  trebleSensitivity: number = 1,
): number {
  let gain: number
  if (freq < 250) gain = bassSensitivity
  else if (freq < 4000) gain = midSensitivity
  else gain = trebleSensitivity
  return Math.min(1, value * gain)
}
