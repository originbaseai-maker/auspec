import { useEffect, useRef } from 'react'
import {
  X,
  Video,
  Download,
  Square,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useExportStore } from '@/store/useExportStore'
import { canvasRegistry } from '@/lib/canvasRegistry'
import { startRecording, getSupportedMimeType } from '@/lib/recorder'
import { useFormatStore } from '@/store/useFormatStore'
import { useAudioStore } from '@/store/useAudioStore'
import { getFormat } from '@/lib/socialFormats'

const DURATION_OPTIONS = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: 'Manual', value: 0 },
]

const QUALITY_OPTIONS = [
  { label: 'Low', value: 2_000_000, desc: '~2 Mbps' },
  { label: 'Medium', value: 5_000_000, desc: '~5 Mbps' },
  { label: 'High', value: 8_000_000, desc: '~8 Mbps' },
  { label: 'Ultra', value: 15_000_000, desc: '~15 Mbps' },
]

function ProgressRing({
  progress,
  size = 120,
}: {
  progress: number
  size?: number
}) {
  const r = (size - 10) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      className="rotate-[-90deg]"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="4"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#export-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.25s ease' }}
      />
      <defs>
        <linearGradient id="export-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function ExportModal() {
  const isOpen = useExportStore((s) => s.isOpen)
  const state = useExportStore((s) => s.state)
  const options = useExportStore((s) => s.options)
  const close = useExportStore((s) => s.close)
  const setOptions = useExportStore((s) => s.setOptions)
  const setState = useExportStore((s) => s.setState)
  const reset = useExportStore((s) => s.reset)

  const stopRef = useRef<(() => void) | null>(null)
  const activeFormat = useFormatStore((s) => s.activeFormat)
  const audioElement = useAudioStore((s) => s.audioElement)
  const format = getFormat(activeFormat)

  useEffect(() => {
    if (isOpen) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    return () => {
      stopRef.current?.()
      stopRef.current = null
    }
  }, [])

  const handleStart = () => {
    const canvas = canvasRegistry.get()
    if (!canvas) {
      setState({
        status: 'error',
        error: 'Canvas not available. Make sure audio is playing.',
      })
      return
    }

    const stopFn = startRecording(
      canvas,
      { ...options, mimeType: getSupportedMimeType() },
      (s) => setState(s),
      audioElement,
    )
    stopRef.current = stopFn
  }

  const handleStop = () => {
    stopRef.current?.()
    stopRef.current = null
  }

  const handleClose = () => {
    handleStop()
    close()
  }

  if (!isOpen) return null

  const isRecording = state.status === 'recording'
  const isDone = state.status === 'done'
  const isProcessing = state.status === 'processing'
  const isIdle = state.status === 'idle'
  const isError = state.status === 'error'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export video"
    >
      <div
        className="w-80 rounded-xl border bg-[#111111] shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: '#2a2a2a' }}
        >
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-[#3b82f6]" />
            <h2 className="text-sm font-semibold text-white">Export Video</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded p-1 text-white/40 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div
            className="mb-4 rounded-md border px-3 py-2"
            style={{ borderColor: '#2a2a2a', background: '#0a0a0a' }}
          >
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
              Canvas Format
            </p>
            <p className="text-sm text-white">
              {format.label} · {format.aspectRatio} · {format.width}×
              {format.height}
            </p>
          </div>

          {isIdle && (
            <>
              <div className="mb-4">
                <label className="mb-2 block text-[10px] uppercase tracking-wider text-white/50">
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {DURATION_OPTIONS.map((d) => {
                    const selected = options.duration === d.value
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setOptions({ duration: d.value })}
                        className="rounded border py-1.5 text-[11px] font-medium transition-all"
                        style={{
                          borderColor: selected ? '#3b82f6' : '#2a2a2a',
                          background: selected
                            ? 'rgba(59,130,246,0.15)'
                            : '#1a1a1a',
                          color: selected ? '#fff' : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-[10px] uppercase tracking-wider text-white/50">
                  Quality
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {QUALITY_OPTIONS.map((q) => {
                    const selected = options.videoBitsPerSecond === q.value
                    return (
                      <button
                        key={q.value}
                        type="button"
                        onClick={() =>
                          setOptions({ videoBitsPerSecond: q.value })
                        }
                        className="flex flex-col items-center rounded border py-1.5 transition-all"
                        style={{
                          borderColor: selected ? '#3b82f6' : '#2a2a2a',
                          background: selected
                            ? 'rgba(59,130,246,0.15)'
                            : '#1a1a1a',
                        }}
                      >
                        <span
                          className="text-[11px] font-medium"
                          style={{
                            color: selected
                              ? '#fff'
                              : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {q.label}
                        </span>
                        <span className="text-[9px] text-white/30">
                          {q.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStart}
                className="w-full rounded-md py-2.5 text-sm font-medium text-white"
                style={{
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                }}
              >
                Start Recording
              </button>
            </>
          )}

          {(isRecording || isProcessing) && (
            <div className="flex flex-col items-center py-4">
              <div className="relative mb-3">
                <ProgressRing progress={state.progress} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white tabular-nums">
                    {Math.round(state.progress)}%
                  </span>
                </div>
              </div>
              <p className="mb-1 text-sm font-medium text-white">
                {isProcessing ? 'Processing...' : 'Recording...'}
              </p>
              {isRecording && options.duration > 0 && (
                <p className="text-xs text-white/40 tabular-nums">
                  {Math.round((state.progress / 100) * options.duration)}s /{' '}
                  {options.duration}s
                </p>
              )}
              {isRecording && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="mt-4 flex items-center gap-2 rounded-md border px-4 py-2 text-sm text-white/80 transition-colors hover:text-white"
                  style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop Recording
                </button>
              )}
            </div>
          )}

          {isDone && (
            <div className="flex flex-col items-center py-4">
              <CheckCircle2 className="mb-2 h-10 w-10 text-green-400" />
              <p className="mb-1 text-sm font-medium text-white">
                Export Complete!
              </p>
              <p className="mb-4 text-xs text-white/40">
                Your video has been downloaded
              </p>
              {state.blobUrl && (
                <a
                  href={state.blobUrl}
                  download={`auspec-${Date.now()}.webm`}
                  className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
                  style={{
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Again
                </a>
              )}
              <button
                type="button"
                onClick={reset}
                className="mt-2 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Record Again
              </button>
            </div>
          )}

          {isError && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs text-red-400">{state.error}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="mt-3 w-full rounded-md border py-1.5 text-xs text-white/60 transition-colors hover:text-white"
                style={{ borderColor: '#2a2a2a' }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExportModal
