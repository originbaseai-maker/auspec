import { useEffect, useRef, useState, type JSX } from 'react'
import { Pause, Play, RotateCcw, SkipBack, Undo2, X } from 'lucide-react'
import { useAudioStore } from '@/store/useAudioStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useMasterClock } from '@/lib/masterClock'
import type { LyricsLayerConfig, LyricsLine } from '@/types/layer'

interface Props {
  layerId: string
  onClose: () => void
}

/**
 * Tap-to-sync flow.
 *
 *   - Lists every line of the layer's lyrics. The first un-synced
 *     line is "armed" — the next TAP assigns the current master-
 *     clock time to it, then advances the arm.
 *   - The PLAY / PAUSE control is a dedicated button (not the
 *     spacebar). Spacebar is bound to TAP — that's the most ergonomic
 *     mapping for sync work (drum on spacebar to the beat) and it
 *     avoids the usual "spacebar = play/pause" conflict on a screen
 *     where every keystroke matters.
 *   - Keyboard shortcuts (modal-scoped only):
 *       Space        → TAP (assign current time to armed line)
 *       Backspace    → UNDO last sync (re-arms the previous line)
 *       R            → Rewind to start
 *       Esc          → Close modal (timings already saved)
 *
 * The modal owns no audio state of its own — it reads currentTime
 * and isPlaying from useAudioStore each frame via a small rAF poll
 * so the "Now: 0:34.20" indicator stays current without flooding
 * React with re-renders per timeupdate event.
 */
export function LyricsSyncModal({ layerId, onClose }: Props): JSX.Element {
  const updateConfig = useLayerStore((s) => s.updateConfig)
  // Draft-aware lookup mirrors LyricsPanel — must match exactly so
  // a sync on a brand-new (not yet committed) layer still works.
  const layer = useLayerStore((s) => {
    if (
      s.draftLayer &&
      s.draftLayer.id === layerId &&
      s.draftLayer.type === 'lyrics'
    ) {
      return s.draftLayer
    }
    return s.layers.find((l) => l.id === layerId && l.type === 'lyrics')
  })

  // Master-clock control — works whether the user's playing audio,
  // video-as-audio, or a video-only timeline. handlePlayPause and
  // handleSeek route through whichever element is the master.
  const masterClock = useMasterClock()
  const masterElement = masterClock.element
  const isPlaying = useAudioStore((s) => s.isPlaying)

  // Live "now" indicator — we read currentTime from the audio store
  // through a small interval rather than via Zustand subscription so
  // the modal doesn't re-render on every timeupdate event (~60/s).
  const [nowSec, setNowSec] = useState(() => useAudioStore.getState().currentTime)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      setNowSec(useAudioStore.getState().currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // History stack of timed assignments — supports Backspace = undo.
  // Stores { lineIndex, prevTime } so undo restores the line to its
  // previous state (un-synced or its earlier timestamp).
  const historyRef = useRef<{ lineIndex: number; prevTime: number | null }[]>([])

  // Confirmation gate for the "discard sync" / re-sync flow — opening
  // the modal on a layer that already has timestamps shows a banner
  // asking before any TAP overwrites them.
  const initialSyncedCount = useRef(0)
  useEffect(() => {
    if (!layer || layer.type !== 'lyrics') return
    initialSyncedCount.current = layer.config.lines.filter(
      (l) => l.time !== null,
    ).length
  // initialise once on open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Body scroll lock + Esc-to-close (modal hygiene matching BrandKitModal).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Active line = first non-empty line whose time is null. Empty
  // instrumental rows are skipped so the user doesn't have to TAP
  // through silence. They can still sync them manually via fine-
  // tune in the panel.
  const findArmed = (lines: LyricsLine[]): number => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].text === '') continue
      if (lines[i].time === null) return i
    }
    return -1
  }

  if (!layer || layer.type !== 'lyrics') {
    return (
      <ModalShell onClose={onClose}>
        <div className="p-6 text-center text-[12px] text-white/60">
          Layer not found.
        </div>
      </ModalShell>
    )
  }

  const cfg = layer.config as LyricsLayerConfig
  const armed = findArmed(cfg.lines)
  const syncedCount = cfg.lines.filter((l) => l.time !== null).length
  const totalNonEmpty = cfg.lines.filter((l) => l.text !== '').length

  const handlePlayPause = (): void => {
    if (!masterElement) return
    if (isPlaying) {
      masterElement.pause()
    } else {
      void masterElement.play()
    }
  }

  const handleRewind = (): void => {
    if (!masterElement) return
    try {
      masterElement.currentTime = 0
    } catch {
      /* element not seekable yet */
    }
  }

  const handleTap = (): void => {
    if (armed < 0) return
    const t = useAudioStore.getState().currentTime
    const lines = cfg.lines.map((l, idx) => {
      if (idx !== armed) return l
      historyRef.current.push({ lineIndex: idx, prevTime: l.time })
      return { ...l, time: t }
    })
    updateConfig(layerId, { lines })
  }

  const handleUndo = (): void => {
    const last = historyRef.current.pop()
    if (!last) return
    const lines = cfg.lines.map((l, idx) =>
      idx === last.lineIndex ? { ...l, time: last.prevTime } : l,
    )
    updateConfig(layerId, { lines })
  }

  const handleDiscardAll = (): void => {
    if (
      syncedCount > 0 &&
      !window.confirm('Discard all synced timestamps for this layer?')
    ) {
      return
    }
    const lines = cfg.lines.map((l) => ({ ...l, time: null }))
    historyRef.current = []
    updateConfig(layerId, { lines })
  }

  // Modal-scoped keyboard handler. Bound to the modal root so global
  // shortcuts elsewhere on the page aren't affected. We register on
  // window because the modal may not have focus when the user first
  // hits a key — the test for "modal is open" is just our being
  // mounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when an input/textarea has focus — don't steal typing.
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        handleTap()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleUndo()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleRewind()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // handleTap captures cfg.lines / armed from current render; we
    // want the freshest closure so re-bind every render.
  })

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between border-b px-5 py-3"
           style={{ borderColor: '#222' }}>
        <h3 className="text-sm font-semibold text-white">Sync Lyrics</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Transport row */}
      <div className="flex items-center gap-3 border-b px-5 py-3"
           style={{ borderColor: '#1a1a1a' }}>
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={!masterElement}
          className="flex h-9 w-20 items-center justify-center gap-1 rounded-md text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30"
          style={{ background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={handleRewind}
          disabled={!masterElement}
          className="flex h-9 items-center justify-center gap-1 rounded-md border bg-[#1a1a1a] px-2 text-[12px] text-white/80 hover:border-[#3b82f6] disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: '#2a2a2a' }}
          title="Rewind to start (R)"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <div className="ml-1 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Now</p>
          <p className="tabular-nums text-[15px] font-semibold text-white">
            {formatTime(nowSec)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Synced</p>
          <p className="tabular-nums text-[13px] text-white/80">
            {syncedCount}/{totalNonEmpty}
          </p>
        </div>
      </div>

      {!masterElement && (
        <div className="px-5 py-3 text-[11px] text-amber-300/90">
          Load an audio file or a video to start syncing. The modal
          stays open — pick an audio source and the transport
          activates automatically.
        </div>
      )}

      {initialSyncedCount.current > 0 && syncedCount > 0 && (
        <div className="border-b px-5 py-2 text-[10px] text-amber-300/80"
             style={{ borderColor: '#1a1a1a' }}>
          This layer already has {initialSyncedCount.current} timestamp{initialSyncedCount.current === 1 ? '' : 's'}.
          New taps overwrite from the first un-synced line.
        </div>
      )}

      {/* Line list — armed line highlighted, synced grey, future dim */}
      <div className="max-h-80 overflow-y-auto px-5 py-3">
        <ul className="space-y-0.5">
          {cfg.lines.map((line, idx) => {
            const isArmed = idx === armed
            const isSynced = line.time !== null
            const isEmpty = line.text === ''
            return (
              <li
                key={idx}
                className="flex items-center gap-3 rounded px-2 py-1 text-[12px]"
                style={{
                  background: isArmed
                    ? 'linear-gradient(90deg,rgba(59,130,246,0.15),rgba(139,92,246,0.10))'
                    : 'transparent',
                  borderLeft: isArmed
                    ? '3px solid #3b82f6'
                    : '3px solid transparent',
                }}
              >
                <span className="w-[78px] tabular-nums text-white/50">
                  {isEmpty
                    ? '—'
                    : line.time !== null
                      ? formatTime(line.time)
                      : isArmed
                        ? '→ ??'
                        : '  ??'}
                </span>
                <span
                  className="flex-1 truncate"
                  style={{
                    color: isEmpty
                      ? 'rgba(255,255,255,0.25)'
                      : isArmed
                        ? '#fff'
                        : isSynced
                          ? 'rgba(255,255,255,0.55)'
                          : 'rgba(255,255,255,0.4)',
                    fontStyle: isEmpty ? 'italic' : 'normal',
                  }}
                >
                  {isEmpty ? '(instrumental)' : line.text}
                </span>
              </li>
            )
          })}
        </ul>
        {cfg.lines.length === 0 && (
          <p className="py-6 text-center text-[11px] text-white/40">
            No lyrics to sync. Paste lyrics into the panel first.
          </p>
        )}
      </div>

      {/* Big TAP affordance */}
      <div className="border-t px-5 py-4"
           style={{ borderColor: '#1a1a1a' }}>
        <button
          type="button"
          onClick={handleTap}
          disabled={armed < 0 || !masterElement}
          className="flex w-full items-center justify-center gap-3 rounded-lg py-5 text-[14px] font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background:
              armed < 0
                ? '#1a1a1a'
                : 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
          }}
        >
          {armed < 0 ? 'All lines synced' : 'TAP NOW'}
          {armed >= 0 && (
            <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
              Spacebar
            </span>
          )}
        </button>
        <p className="mt-2 text-center text-[10px] text-white/40">
          Spacebar = TAP &nbsp;·&nbsp; Backspace = undo &nbsp;·&nbsp; R
          = rewind &nbsp;·&nbsp; Esc = close
        </p>
      </div>

      <div className="flex items-center justify-between border-t px-5 py-3"
           style={{ borderColor: '#1a1a1a' }}>
        <button
          type="button"
          onClick={handleUndo}
          disabled={historyRef.current.length === 0}
          className="flex items-center gap-1 rounded border bg-[#1a1a1a] px-2.5 py-1.5 text-[11px] text-white/70 hover:border-[#3b82f6] disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: '#2a2a2a' }}
        >
          <Undo2 className="h-3 w-3" />
          Undo
        </button>
        <button
          type="button"
          onClick={handleDiscardAll}
          disabled={syncedCount === 0}
          className="flex items-center gap-1 rounded border bg-[#1a1a1a] px-2.5 py-1.5 text-[11px] text-red-300/80 hover:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: '#2a2a2a' }}
        >
          <RotateCcw className="h-3 w-3" />
          Discard all
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-[#2a2a2a] px-3 py-1.5 text-[11px] text-white hover:bg-[#333]"
        >
          Done
        </button>
      </div>
    </ModalShell>
  )
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}): JSX.Element {
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-[#0a0a0a] shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
        role="dialog"
        aria-modal="true"
        aria-label="Sync lyrics"
      >
        {children}
      </div>
    </>
  )
}

function formatTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00.00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t - m * 60)
  const ms = Math.floor((t - Math.floor(t)) * 100)
  return `${m}:${s.toString().padStart(2, '0')}.${ms
    .toString()
    .padStart(2, '0')}`
}
