import { DEFAULT_ANALYZER_CONFIG } from '../types/analyzer'

let ctx: AudioContext | null = null
let source: MediaElementAudioSourceNode | null = null
let analyser: AnalyserNode | null = null
let connectedElement: HTMLMediaElement | null = null
let recordingDest: MediaStreamAudioDestinationNode | null = null

/**
 * `createMediaElementSource` can ONLY be called once per HTMLMediaElement
 * — calling it again throws InvalidStateError, even after disconnect.
 * We cache the source node per element so a later toggle back to the
 * same element reuses the existing graph instead of crashing.
 *
 * Holds nodes for both <audio> (uploaded file) and <video> (video-as-
 * audio-source) elements. Entries are never evicted; the count is
 * bounded by the user's session asset count.
 */
const sourceCache = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>()

export function getAudioContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  return ctx
}

export async function resumeAudioContext(): Promise<void> {
  const context = getAudioContext()
  if (context.state === 'suspended') {
    await context.resume()
  }
}

export function connectMediaElement(element: HTMLMediaElement): {
  source: MediaElementAudioSourceNode
  analyser: AnalyserNode
} {
  const context = getAudioContext()

  // Already wired to this element — reuse.
  if (connectedElement === element && source && analyser) {
    return { source, analyser }
  }

  // Different element coming in. Disconnect the analyser end-points so
  // the previous element stops feeding the destination, but DON'T
  // recreate the source node — createMediaElementSource is one-shot
  // per element and we want to be able to toggle back.
  if (analyser) {
    try {
      analyser.disconnect()
    } catch {
      /* ignore */
    }
  }
  if (source) {
    try {
      source.disconnect()
    } catch {
      /* ignore */
    }
  }

  // Reuse cached source node for `element` if one exists; otherwise
  // create it now and cache. The cache survives toggling so a video
  // → audio → video flip doesn't throw.
  let nextSource = sourceCache.get(element)
  if (!nextSource) {
    nextSource = context.createMediaElementSource(element)
    sourceCache.set(element, nextSource)
  }
  source = nextSource

  if (!analyser) {
    analyser = context.createAnalyser()
    analyser.fftSize = DEFAULT_ANALYZER_CONFIG.fftSize
    analyser.smoothingTimeConstant =
      DEFAULT_ANALYZER_CONFIG.smoothingTimeConstant
    analyser.minDecibels = DEFAULT_ANALYZER_CONFIG.minDecibels
    analyser.maxDecibels = DEFAULT_ANALYZER_CONFIG.maxDecibels
  }

  source.connect(analyser)
  analyser.connect(context.destination)

  connectedElement = element

  return { source, analyser }
}

export function disconnectAll(): void {
  try {
    source?.disconnect()
  } catch {
    // already disconnected
  }
  try {
    analyser?.disconnect()
  } catch {
    // already disconnected
  }
  try {
    recordingDest?.disconnect()
  } catch {
    // already disconnected
  }
  source = null
  analyser = null
  recordingDest = null
  connectedElement = null
  // NOTE: the per-element sourceCache survives — its entries
  // correspond to live <audio>/<video> elements whose
  // createMediaElementSource was already paid for. Recreating them
  // would throw. They're WeakMap-keyed so GC handles cleanup when
  // the element itself is collected.

  // Intentionally do NOT close the AudioContext — recreating it is expensive
  // and browsers limit how many can exist simultaneously.
}

export function getAnalyser(): AnalyserNode | null {
  return analyser
}

/**
 * Returns a MediaStreamAudioDestinationNode tapped off the analyzer's source.
 * Used by the recorder (Phase 11) to capture audio alongside the canvas stream.
 *
 * MediaElementAudioSourceNode is one-shot per HTMLAudioElement — calling
 * createMediaElementSource again throws InvalidStateError. So we reuse the
 * existing source (created by connectMediaElement for the analyzer) and add
 * the recording destination as another output. If the analyzer hasn't wired
 * up yet (audio loaded but never played), this hooks it up first.
 */
export function getOrCreateRecordingDestination(
  element: HTMLMediaElement,
): MediaStreamAudioDestinationNode | null {
  if (!source || connectedElement !== element) {
    connectMediaElement(element)
  }
  if (!source || !ctx) return null
  // If the user hasn't played the audio yet, the AudioContext is still in
  // its initial suspended state. captureStream tracks built on a suspended
  // context stay silent even after play() — explicitly resume so audio
  // flows the moment recording starts.
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  if (!recordingDest) {
    recordingDest = ctx.createMediaStreamDestination()
    source.connect(recordingDest)
  }
  return recordingDest
}
