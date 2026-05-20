import { DEFAULT_ANALYZER_CONFIG } from '../types/analyzer'

let ctx: AudioContext | null = null
let source: MediaElementAudioSourceNode | null = null
let analyser: AnalyserNode | null = null
let connectedElement: HTMLAudioElement | null = null

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
  source = null
  analyser = null
  connectedElement = null
  // Intentionally do NOT close the AudioContext — recreating it is expensive
  // and browsers limit how many can exist simultaneously.
}

export function getAnalyser(): AnalyserNode | null {
  return analyser
}
