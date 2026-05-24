import { getOrCreateRecordingDestination } from '@/lib/audioContext'

export interface RecordingOptions {
  duration: number
  frameRate: number
  videoBitsPerSecond: number
  mimeType: 'video/webm;codecs=vp9' | 'video/webm'
}

export const DEFAULT_RECORDING_OPTIONS: RecordingOptions = {
  duration: 30,
  frameRate: 60,
  videoBitsPerSecond: 5_000_000,
  mimeType: 'video/webm',
}

export interface RecordingState {
  status: 'idle' | 'recording' | 'processing' | 'done' | 'error'
  progress: number
  error: string | null
  blobUrl: string | null
}

export const DEFAULT_RECORDING_STATE: RecordingState = {
  status: 'idle',
  progress: 0,
  error: null,
  blobUrl: null,
}

export function getSupportedMimeType(): RecordingOptions['mimeType'] {
  if (
    typeof MediaRecorder !== 'undefined' &&
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
  ) {
    return 'video/webm;codecs=vp9'
  }
  return 'video/webm'
}

// Contract alias — Phase11-Contracts.md spec uses this name.
export const pickSupportedMimeType = getSupportedMimeType

export function startRecording(
  canvas: HTMLCanvasElement,
  options: RecordingOptions,
  onStateChange: (state: RecordingState) => void,
  audioElement?: HTMLAudioElement | null,
): () => void {
  const chunks: Blob[] = []
  let stopped = false
  let progressInterval: number | null = null
  let autoStopTimeout: number | null = null

  const cleanup = () => {
    if (progressInterval !== null) {
      window.clearInterval(progressInterval)
      progressInterval = null
    }
    if (autoStopTimeout !== null) {
      window.clearTimeout(autoStopTimeout)
      autoStopTimeout = null
    }
  }

  // Combine canvas video with the analyzer's audio source (Web Audio's
  // MediaStreamAudioDestinationNode tap — see audioContext.ts).
  const videoStream = canvas.captureStream(options.frameRate)
  const combinedStream = new MediaStream()
  for (const track of videoStream.getVideoTracks()) combinedStream.addTrack(track)

  if (audioElement) {
    try {
      const dest = getOrCreateRecordingDestination(audioElement)
      if (dest) {
        for (const track of dest.stream.getAudioTracks()) {
          combinedStream.addTrack(track)
        }
      }
    } catch (err) {
      // Non-fatal — record silent video and warn.
      console.warn('[recorder] audio capture failed:', err)
    }
  }

  const mimeType = MediaRecorder.isTypeSupported(options.mimeType)
    ? options.mimeType
    : 'video/webm'

  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond,
    })
  } catch (err) {
    onStateChange({
      status: 'error',
      progress: 0,
      error: `MediaRecorder init failed: ${err instanceof Error ? err.message : String(err)}`,
      blobUrl: null,
    })
    return () => {
      /* no-op */
    }
  }

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  recorder.onstop = () => {
    cleanup()
    onStateChange({
      status: 'processing',
      progress: 100,
      error: null,
      blobUrl: null,
    })

    const blob = new Blob(chunks, { type: mimeType })
    const blobUrl = URL.createObjectURL(blob)

    // Auto-download
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `auspec-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    onStateChange({ status: 'done', progress: 100, error: null, blobUrl })
  }

  recorder.onerror = (e) => {
    cleanup()
    const errMsg =
      (e as unknown as { error?: { message?: string } })?.error?.message ??
      'unknown'
    onStateChange({
      status: 'error',
      progress: 0,
      error: `Recording error: ${errMsg}`,
      blobUrl: null,
    })
  }

  // Collect a chunk every 100 ms so we don't lose buffered data on early stop.
  recorder.start(100)
  onStateChange({
    status: 'recording',
    progress: 0,
    error: null,
    blobUrl: null,
  })

  if (options.duration > 0) {
    const startTime = Date.now()
    // Progress ticks at ~4 Hz — well under the 10 Hz cap in the contract.
    progressInterval = window.setInterval(() => {
      if (stopped) return
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(100, (elapsed / options.duration) * 100)
      onStateChange({
        status: 'recording',
        progress,
        error: null,
        blobUrl: null,
      })
    }, 250)

    autoStopTimeout = window.setTimeout(() => {
      if (!stopped && recorder.state === 'recording') {
        stopped = true
        recorder.stop()
      }
    }, options.duration * 1000)
  }

  // Stop handle — safe to call before/after auto-stop fires.
  return () => {
    if (!stopped && recorder.state === 'recording') {
      stopped = true
      cleanup()
      recorder.stop()
    }
  }
}
