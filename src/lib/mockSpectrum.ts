import type { FrequencyData } from '@/types/analyzer'

/**
 * Generates synthetic frequency + time-domain data for the visualizer
 * when no real audio is playing. Mimics the spectral shape of music —
 * bass-heavy lows, decaying highs, rhythmic 120 BPM beat pulse, slow
 * breathing modulation.
 *
 * Buffer sizes match the real analyzer (fftSize 2048 → 1024 frequency
 * bins, 2048 time-domain samples) so swapping between real and mock
 * is visually identical to the renderers.
 */

const RAW_SIZE = 1024
const TIME_DOMAIN_SIZE = 2048

// Pre-allocated buffers — reused every frame, zero per-frame allocations.
const mockRaw = new Uint8Array(RAW_SIZE)
const mockTimeDomain = new Uint8Array(TIME_DOMAIN_SIZE)

export function generateMockFrequencyData(time: number): FrequencyData {
  // Beat at 120 BPM = 2 Hz (Math.PI * 4 over t in seconds).
  const beat = Math.sin(time * Math.PI * 4) * 0.5 + 0.5
  const beatPulse = Math.pow(beat, 3) * 0.6 // sharp attack
  const breath = Math.sin(time * 0.5) * 0.15 + 0.85

  let peak = 0
  let bassSum = 0
  let bassCount = 0
  let midSum = 0
  let midCount = 0
  let trebleSum = 0
  let trebleCount = 0

  for (let i = 0; i < RAW_SIZE; i++) {
    const n = i / RAW_SIZE

    let v = 0
    if (n < 0.15) {
      // Bass — strong, beat-reactive, slight rolloff inside the band
      const bassShape = 1 - (n / 0.15) * 0.4
      v = bassShape * (180 + beatPulse * 60)
    } else if (n < 0.5) {
      // Mids — wavy, decays with index, modulated by slow breath
      const midShape = Math.sin(n * 18 + time * 2) * 0.3 + 0.7
      const decay = 1 - (n - 0.15) * 0.8
      v = midShape * decay * 130 * breath
    } else {
      // Highs — quick decay, sparkly
      const decay = Math.pow(1 - n, 2)
      const sparkle = Math.sin(i * 0.5 + time * 8) * 0.5 + 0.5
      v = decay * sparkle * 80 * breath
    }

    v += (Math.random() - 0.5) * 8
    const clamped = v < 0 ? 0 : v > 255 ? 255 : v
    mockRaw[i] = clamped

    if (clamped > peak) peak = clamped

    if (n < 0.15) {
      bassSum += clamped
      bassCount++
    } else if (n < 0.5) {
      midSum += clamped
      midCount++
    } else {
      trebleSum += clamped
      trebleCount++
    }
  }

  // Time-domain — mix of sines for a natural-looking waveform.
  // Compute RMS in the same pass.
  let sumSquares = 0
  for (let i = 0; i < TIME_DOMAIN_SIZE; i++) {
    const t = i / TIME_DOMAIN_SIZE
    const w1 = Math.sin(t * Math.PI * 4 + time * 6) * 0.3
    const w2 = Math.sin(t * Math.PI * 12 + time * 3) * 0.15
    const w3 = Math.sin(t * Math.PI * 2 + time * 8) * 0.2
    const sample = (w1 + w2 + w3) * 0.5 + 0.5
    const byte = (sample * 255) | 0
    mockTimeDomain[i] = byte
    const norm = (byte - 128) / 128
    sumSquares += norm * norm
  }

  const bass = bassCount > 0 ? bassSum / bassCount : 0
  const mid = midCount > 0 ? midSum / midCount : 0
  const treble = trebleCount > 0 ? trebleSum / trebleCount : 0
  const rms = Math.sqrt(sumSquares / TIME_DOMAIN_SIZE)
  const beatEnergy = Math.pow(beat, 3)

  return {
    raw: mockRaw,
    bass,
    mid,
    treble,
    rms,
    peak,
    beatEnergy,
    timeDomain: mockTimeDomain,
  }
}
