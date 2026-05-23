import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Repeat, Scissors, Volume2, VolumeX } from 'lucide-react'
import { useAudioStore } from '@/store/useAudioStore'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

type DragTarget = 'start' | 'end' | 'playhead' | null

export function Timeline() {
  const { play, pause } = useAudioPlayer()
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
  const audioElement = useAudioStore((s) => s.audioElement)

  const [muted, setMuted] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<DragTarget>(null)

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
      } else if (dragging === 'playhead' && audioElement) {
        audioElement.currentTime = Math.max(
          trimStart,
          Math.min(effectiveTrimEnd, t),
        )
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
    audioElement,
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
        onClick={() => (isPlaying ? pause() : play())}
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
          if (audioElement && t >= trimStart && t <= effectiveTrimEnd) {
            audioElement.currentTime = t
          }
          setDragging('playhead')
        }}
      >
        <div className="absolute inset-x-2 inset-y-0 flex items-center justify-center gap-[1.5px]">
          {Array.from({ length: 120 }).map((_, i) => {
            const pos = i / 120
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
        <button
          type="button"
          onClick={resetTrim}
          title="Reset trim"
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:text-white"
          style={{
            borderColor: '#2a2a2a',
            background: '#1a1a1a',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <Scissors className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !muted
            if (audioElement) audioElement.muted = next
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
      </div>
    </div>
  )
}

export default Timeline
