import { useRef, useState, useEffect } from 'react'
import {
  Activity,
  Pause,
  Play,
  Repeat,
  Scissors,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useAudioStore } from '@/store/useAudioStore'
import {
  detectFormat,
  isValidAudioFile,
  MAX_FILE_SIZE,
} from '@/types/audio'
import { useMasterClock } from '@/lib/masterClock'
import { AudioSourceToggle } from './AudioSourceToggle'

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

type DragTarget = 'start' | 'end' | 'playhead' | null

export function Timeline() {
  const isPlaying = useAudioStore((s) => s.isPlaying)
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration = useAudioStore((s) => s.duration)
  const trimStart = useAudioStore((s) => s.trimStart)
  const trimEnd = useAudioStore((s) => s.trimEnd)
  const loop = useAudioStore((s) => s.loop)
  const setTrimStart = useAudioStore((s) => s.setTrimStart)
  const setTrimEnd = useAudioStore((s) => s.setTrimEnd)
  const resetTrim = useAudioStore((s) => s.resetTrim)
  const setLoop = useAudioStore((s) => s.setLoop)
  // The master clock is the audio element when an audio file is
  // loaded; otherwise it's the active audio-source video. Every
  // transport handler in this component routes through it instead
  // of hardcoding `audioElement`, so the user gets the same play /
  // pause / scrub / trim controls regardless of clock kind.
  const masterClock = useMasterClock()
  const masterElement = masterClock.element
  const isVideoClock = masterClock.kind === 'video'
  const bpm = useAudioStore((s) => s.bpm)
  const bpmConfidence = useAudioStore((s) => s.bpmConfidence)
  const bpmAutoDetected = useAudioStore((s) => s.bpmAutoDetected)
  const bpmDetecting = useAudioStore((s) => s.bpmDetecting)
  const setBpmManual = useAudioStore((s) => s.setBpmManual)

  // Play/pause act on whichever element is the master clock. isPlaying
  // updates via the play/pause event listeners attached in
  // useAudioPlayer (audio path) or VideoClock (video path), so we
  // don't set it here.
  const handlePlayPause = () => {
    if (!masterElement) return
    if (isPlaying) {
      masterElement.pause()
    } else {
      if (masterElement.currentTime < trimStart) {
        try {
          masterElement.currentTime = trimStart
        } catch {
          /* element not seekable yet */
        }
      }
      void masterElement.play()
    }
  }

  const [muted, setMuted] = useState(false)
  const [showCutMenu, setShowCutMenu] = useState(false)
  const [showBpmEdit, setShowBpmEdit] = useState(false)
  const [bpmDraft, setBpmDraft] = useState('')
  const trackRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState<DragTarget>(null)

  const setAudioFile = useAudioStore((s) => s.setAudioFile)
  const cleanup = useAudioStore((s) => s.cleanup)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    if (!isValidAudioFile(file)) {
      alert('Please select a valid audio file (MP3, WAV, M4A, FLAC)')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Max 200 MB.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const duration = await new Promise<number>((resolve) => {
      const probe = new Audio(objectUrl)
      probe.onloadedmetadata = () => resolve(probe.duration || 0)
      probe.onerror = () => resolve(0)
    })

    // setAudioFile owns objectUrl lifecycle — it revokes the previous URL
    // and resets playback/trim state.
    setAudioFile({
      file,
      name: file.name,
      duration,
      size: file.size,
      format: detectFormat(file),
      objectUrl,
    })
  }

  const handleRemove = () => {
    if (confirm('Remove current audio?')) {
      cleanup()
    }
  }

  const effectiveTrimEnd = trimEnd ?? duration

  const pointToTime = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    return (x / rect.width) * duration
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => {
      const t = pointToTime(e.clientX)
      if (dragging === 'start') {
        setTrimStart(Math.min(t, effectiveTrimEnd - 0.5))
      } else if (dragging === 'end') {
        setTrimEnd(Math.max(t, trimStart + 0.5))
      } else if (dragging === 'playhead' && masterElement) {
        try {
          masterElement.currentTime = Math.max(
            trimStart,
            Math.min(effectiveTrimEnd, t),
          )
        } catch {
          /* element not seekable yet */
        }
      }
    }
    const onUp = () => setDragging(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [
    dragging,
    masterElement,
    trimStart,
    effectiveTrimEnd,
    duration,
    setTrimStart,
    setTrimEnd,
  ])

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0
  const endPct = duration > 0 ? (effectiveTrimEnd / duration) * 100 : 100
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className="flex h-16 shrink-0 items-center gap-4 border-t bg-[#0a0a0a] px-5"
      style={{ borderColor: '#1a1a1a' }}
    >
      <button
        type="button"
        onClick={handlePlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        )}
      </button>

      <span className="min-w-[44px] text-[11px] tabular-nums text-white/70">
        {formatTime(currentTime)}
      </span>

      <div
        ref={trackRef}
        className="relative h-10 flex-1 cursor-pointer rounded-lg border bg-[#131313]"
        style={{ borderColor: '#1f1f1f' }}
        onPointerDown={(e) => {
          const t = pointToTime(e.clientX)
          if (masterElement && t >= trimStart && t <= effectiveTrimEnd) {
            try {
              masterElement.currentTime = t
            } catch {
              /* element not seekable yet */
            }
          }
          setDragging('playhead')
        }}
      >
        {isVideoClock ? (
          /* Video clock: there's no waveform to draw (no audio file
             to sample). A flat duration bar fills the same visual
             slot — the trim window overlay, trim handles, and
             playhead all still work because they reference the
             timeline's geometry, not the bars. */
          <div className="absolute inset-x-1 top-1/2 -translate-y-1/2">
            <div
              className="h-1.5 w-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0.10), rgba(255,255,255,0.18), rgba(255,255,255,0.10))',
              }}
              aria-hidden="true"
            />
            {duration > 0 && (
              <div
                className="absolute top-0 h-1.5 rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                }}
                aria-hidden="true"
              />
            )}
          </div>
        ) : (
        <div className="absolute inset-0 flex items-center justify-between px-1">
          {Array.from({ length: 200 }).map((_, i) => {
            const pos = i / 200
            const t = pos * duration
            const inTrim = t >= trimStart && t <= effectiveTrimEnd
            const played = t < currentTime && inTrim
            const w1 = Math.sin(i * 0.18) * 0.4 + 0.5
            const w2 = Math.sin(i * 0.05) * 0.3
            const noise = (((i * 7919) % 100) / 100) * 0.3
            const h = Math.max(2, (w1 + w2 + noise) * 28)
            return (
              <div
                key={i}
                style={{
                  width: 2,
                  height: `${h}px`,
                  borderRadius: 1,
                  flex: '0 0 auto',
                  background: played
                    ? 'linear-gradient(180deg, #3b82f6, #8b5cf6)'
                    : inTrim
                      ? 'rgba(255,255,255,0.25)'
                      : 'rgba(255,255,255,0.08)',
                }}
              />
            )
          })}
        </div>
        )}

        <div
          className="pointer-events-none absolute inset-y-0"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            background: 'rgba(59,130,246,0.05)',
            borderLeft: '2px solid #3b82f6',
            borderRight: '2px solid #8b5cf6',
          }}
        />

        <div
          onPointerDown={(e) => {
            e.stopPropagation()
            setDragging('start')
          }}
          role="slider"
          aria-label="Trim start"
          aria-valuemin={0}
          aria-valuemax={effectiveTrimEnd}
          aria-valuenow={trimStart}
          tabIndex={0}
          className="absolute top-1/2 z-10 -translate-y-1/2 cursor-ew-resize rounded"
          style={{
            left: `calc(${startPct}% - 3px)`,
            width: 6,
            height: 26,
            background: '#3b82f6',
            boxShadow: '0 0 8px rgba(0,0,0,0.6)',
          }}
        />

        <div
          onPointerDown={(e) => {
            e.stopPropagation()
            setDragging('end')
          }}
          role="slider"
          aria-label="Trim end"
          aria-valuemin={trimStart}
          aria-valuemax={duration}
          aria-valuenow={effectiveTrimEnd}
          tabIndex={0}
          className="absolute top-1/2 z-10 -translate-y-1/2 cursor-ew-resize rounded"
          style={{
            left: `calc(${endPct}% - 3px)`,
            width: 6,
            height: 26,
            background: '#8b5cf6',
            boxShadow: '0 0 8px rgba(0,0,0,0.6)',
          }}
        />

        <div
          className="pointer-events-none absolute -top-0.5 -bottom-0.5 w-0.5"
          style={{
            left: `${playheadPct}%`,
            background: '#fff',
            boxShadow: '0 0 6px rgba(255,255,255,0.8)',
            zIndex: 5,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '6px solid #fff',
            }}
          />
        </div>
      </div>

      <span className="min-w-[44px] text-[11px] tabular-nums text-white/70">
        {formatTime(duration)}
      </span>

      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={() => setLoop(!loop)}
          aria-pressed={loop}
          title={loop ? 'Loop on' : 'Loop off'}
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors"
          style={{
            borderColor: loop ? 'rgba(59,130,246,0.4)' : '#2a2a2a',
            background: loop ? 'rgba(59,130,246,0.15)' : '#1a1a1a',
            color: loop ? '#3b82f6' : 'rgba(255,255,255,0.7)',
          }}
        >
          <Repeat className="h-3.5 w-3.5" />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCutMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={showCutMenu}
            title="Trim controls"
            className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:text-white"
            style={{
              borderColor: showCutMenu ? 'rgba(59,130,246,0.4)' : '#2a2a2a',
              background: showCutMenu ? 'rgba(59,130,246,0.15)' : '#1a1a1a',
              color: showCutMenu ? '#3b82f6' : 'rgba(255,255,255,0.7)',
            }}
          >
            <Scissors className="h-3.5 w-3.5" />
          </button>

          {showCutMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowCutMenu(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                className="absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg border p-1 shadow-2xl"
                style={{ borderColor: '#2a2a2a', background: '#131313' }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTrimStart(currentTime)
                    setShowCutMenu(false)
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[11px] text-white/80 hover:bg-white/5 hover:text-white"
                >
                  <span className="text-[#3b82f6]" aria-hidden="true">▶</span>
                  Set start at {formatTime(currentTime)}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTrimEnd(currentTime)
                    setShowCutMenu(false)
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[11px] text-white/80 hover:bg-white/5 hover:text-white"
                >
                  <span className="text-[#8b5cf6]" aria-hidden="true">◀</span>
                  Set end at {formatTime(currentTime)}
                </button>
                <div
                  className="my-1 h-px"
                  style={{ background: '#2a2a2a' }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    resetTrim()
                    setShowCutMenu(false)
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[11px] text-white/60 hover:bg-white/5 hover:text-white"
                >
                  ↻ Reset trim
                </button>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !muted
            // Mute the master element regardless of kind. When clock
            // is the video, this also silences the analyser's
            // signal (it reads from the same element) — the user's
            // explicit mute trumps the visualiser audio path.
            if (masterElement) masterElement.muted = next
            setMuted(next)
          }}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:text-white"
          style={{
            borderColor: '#2a2a2a',
            background: '#1a1a1a',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {muted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setBpmDraft(bpm > 0 ? String(bpm) : '120')
              setShowBpmEdit((v) => !v)
            }}
            title={
              bpmDetecting
                ? 'Detecting BPM…'
                : bpm > 0
                  ? `${bpm} BPM (${bpmAutoDetected ? 'auto' : 'manual'}, ${Math.round(bpmConfidence * 100)}% confidence)`
                  : 'Tap to set BPM'
            }
            aria-haspopup="dialog"
            aria-expanded={showBpmEdit}
            className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 transition-colors hover:text-white"
            style={{
              borderColor:
                bpm > 0
                  ? bpmConfidence >= 0.5
                    ? 'rgba(16,185,129,0.4)'
                    : bpmConfidence >= 0.25
                      ? 'rgba(245,158,11,0.4)'
                      : 'rgba(239,68,68,0.4)'
                  : '#2a2a2a',
              background: '#1a1a1a',
              color: bpm > 0 ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Activity className="h-3 w-3" aria-hidden="true" />
            <span className="text-[10px] font-mono tabular-nums">
              {bpmDetecting ? '…' : bpm > 0 ? bpm : '—'}
            </span>
            <span className="text-[8px] uppercase tracking-wider text-white/40">
              BPM
            </span>
          </button>

          {showBpmEdit && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowBpmEdit(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="Manual BPM"
                className="absolute bottom-full right-0 z-50 mb-2 w-56 rounded-lg border p-3 shadow-2xl"
                style={{ borderColor: '#2a2a2a', background: '#131313' }}
              >
                <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                  Manual BPM
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bpmDraft}
                    onChange={(e) => setBpmDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const n = parseInt(bpmDraft, 10)
                        if (n >= 40 && n <= 300) {
                          setBpmManual(n)
                          setShowBpmEdit(false)
                        }
                      } else if (e.key === 'Escape') {
                        setShowBpmEdit(false)
                      }
                    }}
                    min={40}
                    max={300}
                    placeholder="120"
                    className="flex-1 rounded border bg-[#0f0f0f] px-2 py-1 text-[12px] text-white outline-none focus:border-[#3b82f6]"
                    style={{ borderColor: '#2a2a2a' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const n = parseInt(bpmDraft, 10)
                      if (n >= 40 && n <= 300) {
                        setBpmManual(n)
                        setShowBpmEdit(false)
                      }
                    }}
                    className="rounded px-3 py-1 text-[11px] font-medium text-white"
                    style={{
                      background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    }}
                  >
                    Set
                  </button>
                </div>
                {bpm > 0 && bpmAutoDetected && (
                  <p className="mt-2 text-[9px] text-white/40">
                    Auto-detected: {bpm} BPM (
                    {Math.round(bpmConfidence * 100)}% confidence)
                  </p>
                )}
                <p className="mt-1 text-[9px] text-white/30">
                  Range: 40-300. Press Enter to apply.
                </p>
              </div>
            </>
          )}
        </div>

        <div
          className="mx-1 w-px self-stretch"
          style={{ background: '#2a2a2a' }}
          aria-hidden="true"
        />

        {/* Audio source picker — only renders when at least one
            Video layer has audio that COULD replace the uploaded
            track. Quiet on the common single-audio case. */}
        <AudioSourceToggle />

        <button
          type="button"
          onClick={handleUploadClick}
          title="Replace audio"
          aria-label="Replace audio"
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:text-white"
          style={{
            borderColor: '#2a2a2a',
            background: '#1a1a1a',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <Upload className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleRemove}
          title="Remove audio"
          aria-label="Remove audio"
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-400"
          style={{
            borderColor: '#2a2a2a',
            background: '#1a1a1a',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.flac"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  )
}

export default Timeline
