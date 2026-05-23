import { DEFAULT_ANALYZER_CONFIG } from '../types/analyzer'

let ctx: AudioContext | null = null
let source: MediaElementAudioSourceNode | null = null
let analyser: AnalyserNode | null = null
let connectedElement: HTMLAudioElement | null = null
let recordingDest: MediaStreamAudioDestinationNode | null = null

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

export function connectMediaElement(element: HTMLAudioElement): {
  source: MediaElementAudioSourceNode
  analyser: AnalyserNode
} {
  const context = getAudioContext()

  // MediaElementSourceNode can only be created ONCE per HTMLAudioElement.
  // If we're connecting the same element again, reuse the existing graph.
  if (connectedElement === element && source && analyser) {
    return { source, analyser }
  }

  // Different element coming in — tear the current graph down before rebuilding.
  if (source || analyser) {
    disconnectAll()
  }

  source = context.createMediaElementSource(element)
  analyser = context.createAnalyser()
  analyser.fftSize = DEFAULT_ANALYZER_CONFIG.fftSize
  analyser.smoothingTimeConstant = DEFAULT_ANALYZER_CONFIG.smoothingTimeConstant
  analyser.minDecibels = DEFAULT_ANALYZER_CONFIG.minDecibels
  analyser.maxDecibels = DEFAULT_ANALYZER_CONFIG.maxDecibels

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
  element: HTMLAudioElement,
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
