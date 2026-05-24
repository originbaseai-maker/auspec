/**
 * BPM detection via offline analysis + peak interval clustering.
 *
 * Algorithm:
 *   1. Decode the file into an AudioBuffer
 *   2. Render through a 80 Hz peaking + 150 Hz lowpass chain to isolate
 *      the kick / sub bass (kick drum is the most reliable beat carrier)
 *   3. Find peaks above an adaptive threshold (55% of global max)
 *   4. Compute intervals between consecutive peaks → candidate BPMs
 *   5. Cluster BPMs with ±2 BPM tolerance; the largest cluster wins
 *   6. Confidence = cluster_count / total_intervals
 *
 * Runs once per file; not in the hot render path.
 */

export interface BPMResult {
  /** Rounded integer in [MIN_BPM, MAX_BPM]; 0 means "not detectable". */
  bpm: number
  /** 0–1, how dominant the winning cluster was. */
  confidence: number
  /** Wall-clock time when detection finished. */
  detectedAtMs: number
}

const MIN_BPM = 60
const MAX_BPM = 180

export async function detectBPM(audioBuffer: AudioBuffer): Promise<BPMResult> {
  const offlineCtx = new OfflineAudioContext(
    1,
    audioBuffer.length,
    audioBuffer.sampleRate,
  )

  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer

  // 80 Hz peak emphasizes the kick fundamental; 150 Hz lowpass drops
  // everything above sub-bass so the peak picker isn't fooled by hats.
  const peak = offlineCtx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 80
  peak.Q.value = 4
  peak.gain.value = 6

  const lowpass = offlineCtx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 150
  lowpass.Q.value = 1

  source.connect(peak).connect(lowpass).connect(offlineCtx.destination)
  source.start(0)

  const rendered = await offlineCtx.startRendering()
  const data = rendered.getChannelData(0)
  const sampleRate = rendered.sampleRate

  const peaks = findPeaks(data, sampleRate)
  if (peaks.length < 4) {
    return { bpm: 0, confidence: 0, detectedAtMs: Date.now() }
  }

  const result = bpmFromPeakIntervals(peaks, sampleRate)
  return { ...result, detectedAtMs: Date.now() }
}

function findPeaks(data: Float32Array, sampleRate: number): number[] {
  const peaks: number[] = []

  // Don't allow two peaks closer than the period at MAX_BPM — that's the
  // shortest legal beat interval. Prevents counting one kick twice.
  const minPeakDistance = Math.floor((sampleRate * 60) / MAX_BPM)

  let max = 0
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i])
    if (abs > max) max = abs
  }
  const threshold = max * 0.55

  let lastPeakIdx = -minPeakDistance
  for (let i = 1; i < data.length - 1; i++) {
    const v = Math.abs(data[i])
    if (
      v > threshold &&
      v > Math.abs(data[i - 1]) &&
      v > Math.abs(data[i + 1]) &&
      i - lastPeakIdx >= minPeakDistance
    ) {
      peaks.push(i)
      lastPeakIdx = i
    }
  }

  return peaks
}

function bpmFromPeakIntervals(
  peaks: number[],
  sampleRate: number,
): { bpm: number; confidence: number } {
  const bpmCounts = new Map<number, number>()

  for (let i = 1; i < peaks.length; i++) {
    const samplesBetween = peaks[i] - peaks[i - 1]
    const secondsBetween = samplesBetween / sampleRate
    const bpmRaw = 60 / secondsBetween

    if (bpmRaw < MIN_BPM || bpmRaw > MAX_BPM * 2) continue

    // Fold double-time / half-time into the canonical range. A 168 BPM
    // track can read as 84 BPM if every other kick is missed; 180+ usually
    // means we're picking up subdivisions and should be halved.
    let bpm = bpmRaw
    while (bpm > MAX_BPM) bpm /= 2
    while (bpm < MIN_BPM) bpm *= 2

    const rounded = Math.round(bpm)
    bpmCounts.set(rounded, (bpmCounts.get(rounded) || 0) + 1)
  }

  if (bpmCounts.size === 0) {
    return { bpm: 0, confidence: 0 }
  }

  // Cluster within ±2 BPM so rounding noise doesn't split a single tempo
  // across multiple buckets.
  const clustered = new Map<number, number>()
  for (const [bpm, count] of bpmCounts) {
    let added = false
    for (const [clusterBpm] of clustered) {
      if (Math.abs(bpm - clusterBpm) <= 2) {
        clustered.set(clusterBpm, (clustered.get(clusterBpm) || 0) + count)
        added = true
        break
      }
    }
    if (!added) clustered.set(bpm, count)
  }

  let bestBpm = 0
  let bestCount = 0
  let total = 0
  for (const [bpm, count] of clustered) {
    total += count
    if (count > bestCount) {
      bestCount = count
      bestBpm = bpm
    }
  }

  const confidence = total > 0 ? bestCount / total : 0
  return { bpm: bestBpm, confidence }
}

/**
 * Decode an audio file at the given object URL into an AudioBuffer.
 * Uses a throwaway AudioContext (closed immediately after) so we don't
 * pollute the global analyzer context.
 */
export async function loadAudioBufferFromUrl(
  url: string,
): Promise<AudioBuffer> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext
  const ctx = new AC()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  await ctx.close()

  return audioBuffer
}
