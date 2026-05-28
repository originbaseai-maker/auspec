import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { Film } from 'lucide-react'
import { useLayerStore } from '@/store/useLayerStore'
import { useAudioStore } from '@/store/useAudioStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import { useMasterClock } from '@/lib/masterClock'
import type { VideoLayerConfig } from '@/types/layer'

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * Slim track shown directly above the audio Timeline whenever any
 * enabled Video layer points at a registered asset. Displays the
 * video's duration and the SHARED audio-clock playhead — scrubbing
 * the audio timeline moves both, exactly the same way the existing
 * VisualizerCanvas video-sync effect already keeps the videos in
 * lockstep with currentTime.
 *
 * Multiple videos collapse into stacked thin lanes; the active layer
 * (or topmost if none active) gets a thicker accent. Trim handles
 * are intentionally NOT rendered here — startTime / endTime live in
 * VideoLayerConfig and are tuned via the Video Fine Tune panel,
 * which keeps the audio timeline as the single primary scrubbing
 * surface.
 */
export function VideoTimelineTrack(): JSX.Element | null {
  const layers = useLayerStore((s) => s.layers)
  const activeLayerId = useLayerStore((s) => s.activeLayerId)
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer)
  const assets = useVideoAssetStore((s) => s.assets)
  const currentTime = useAudioStore((s) => s.currentTime)
  const audioDuration = useAudioStore((s) => s.duration)
  // When the master clock is a video, this track is the PRIMARY
  // scrub surface (the audio Timeline collapses its waveform to a
  // trim-only band). Otherwise it's a passive read-only display.
  const clock = useMasterClock()
  const isPrimary = clock.kind === 'video'
  const trackRef = useRef<HTMLDivElement>(null)
  const [scrubbing, setScrubbing] = useState(false)

  const videoLayers = useMemo(
    () =>
      layers
        .filter(
          (l) =>
            l.type === 'video' &&
            l.enabled &&
            (l.config as VideoLayerConfig).videoAssetId,
        )
        .map((l) => {
          const cfg = l.config as VideoLayerConfig
          const asset = assets.find((a) => a.id === cfg.videoAssetId)
          return { layer: l, asset }
        })
        .filter((row): row is { layer: typeof row.layer; asset: NonNullable<typeof row.asset> } =>
          row.asset !== undefined,
        ),
    [layers, assets],
  )

  if (videoLayers.length === 0) return null

  // Scale: longest of audio duration or any video duration. Using the
  // max means a long video doesn't get clipped if the audio is shorter
  // (or absent — preview mode has duration 0).
  const maxDuration = videoLayers.reduce(
    (m, { asset }) => Math.max(m, asset.duration || 0),
    audioDuration,
  )
  if (maxDuration <= 0) return null

  const playheadPct = Math.max(
    0,
    Math.min(100, (currentTime / maxDuration) * 100),
  )

  const pointToTime = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    return (x / rect.width) * maxDuration
  }

  const seekTo = (t: number) => {
    if (!clock.element) return
    try {
      clock.element.currentTime = Math.max(0, Math.min(maxDuration, t))
    } catch {
      /* element not seekable yet */
    }
  }

  // Drag-to-scrub. Pointer events on document (not on the track)
  // so the user can drag outside the row and the playhead still
  // follows — same UX as the audio Timeline's playhead drag.
  useEffect(() => {
    if (!scrubbing) return
    const onMove = (e: PointerEvent) => seekTo(pointToTime(e.clientX))
    const onUp = () => setScrubbing(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // pointToTime + seekTo close over current refs; deps cover what changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubbing, clock.element, maxDuration])

  return (
    <div
      className="flex shrink-0 items-stretch gap-3 border-t bg-[#0a0a0a] px-5 py-1.5"
      style={{ borderColor: '#1a1a1a' }}
      aria-label={
        isPrimary ? 'Video timeline (master)' : 'Video timeline tracks'
      }
    >
      <div className="flex w-[44px] items-center justify-end pr-1">
        <Film className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
      </div>
      <div
        ref={trackRef}
        className="relative flex flex-1 flex-col justify-center gap-1 py-0.5"
        style={{ cursor: isPrimary ? 'pointer' : 'default' }}
        onPointerDown={
          isPrimary
            ? (e) => {
                seekTo(pointToTime(e.clientX))
                setScrubbing(true)
              }
            : undefined
        }
      >
        {videoLayers.map(({ layer, asset }) => {
          const cfg = layer.config as VideoLayerConfig
          const isActive = activeLayerId === layer.id
          // Each video starts at t=0 of the master clock and runs for
          // its own duration (mirroring how VisualizerCanvas drives
          // `video.currentTime = audio.currentTime % video.duration`).
          // So the bar's width is the video's duration as a fraction
          // of the overall timeline span.
          const widthPct = Math.min(
            100,
            (asset.duration / maxDuration) * 100,
          )
          // Per-video trim window (VideoLayerConfig.startTime/endTime)
          // is rendered as a darker tint at the edges. Defaults to
          // [0, duration] → no visible tint.
          const trimStart = Math.max(0, cfg.startTime || 0)
          const trimEnd =
            cfg.endTime !== null && cfg.endTime !== undefined
              ? Math.min(asset.duration, cfg.endTime)
              : asset.duration
          const trimStartPct = (trimStart / asset.duration) * widthPct
          const trimWidthPct =
            ((trimEnd - trimStart) / asset.duration) * widthPct
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              aria-pressed={isActive}
              aria-label={`Select ${layer.name}`}
              title={`${layer.name} · ${formatTime(asset.duration)}`}
              className="relative flex items-center rounded transition-colors"
              style={{
                width: '100%',
                height: isActive ? 12 : 8,
                background: '#131313',
                border: isActive
                  ? '1px solid rgba(59,130,246,0.45)'
                  : '1px solid #1f1f1f',
                cursor: 'pointer',
              }}
            >
              {/* The asset's duration bar (lighter background swatch). */}
              <div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{
                  width: `${widthPct}%`,
                  background:
                    'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18))',
                }}
                aria-hidden="true"
              />
              {/* Trim window — slightly brighter tint inside the bar. */}
              {trimWidthPct > 0 && (
                <div
                  className="absolute inset-y-0 rounded-sm"
                  style={{
                    left: `${trimStartPct}%`,
                    width: `${trimWidthPct}%`,
                    background:
                      'linear-gradient(90deg, rgba(59,130,246,0.45), rgba(139,92,246,0.45))',
                  }}
                  aria-hidden="true"
                />
              )}
              <span
                className="relative ml-1.5 truncate text-[9px] uppercase tracking-wider text-white/60"
                style={{ zIndex: 1, maxWidth: '70%' }}
              >
                {layer.name}
              </span>
            </button>
          )
        })}
        {/* Shared playhead — same vertical white line the audio
            timeline uses, positioned by the same master clock so the
            two visually align. Beefed up to a draggable cap when this
            track is the primary scrub surface (video-only mode). */}
        <div
          className="pointer-events-none absolute top-0 bottom-0"
          style={{
            left: `${playheadPct}%`,
            width: isPrimary ? 2 : 1.5,
            background: '#fff',
            boxShadow: '0 0 4px rgba(255,255,255,0.7)',
          }}
          aria-hidden="true"
        >
          {isPrimary && (
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
              aria-hidden="true"
            />
          )}
        </div>
      </div>
      <div className="flex w-[44px] items-center justify-start pl-1 text-[10px] tabular-nums text-white/40">
        {formatTime(maxDuration)}
      </div>
    </div>
  )
}

export default VideoTimelineTrack
