import { useMemo, type JSX } from 'react'
import { Film, Music } from 'lucide-react'
import { useAudioStore } from '@/store/useAudioStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import type { VideoLayerConfig } from '@/types/layer'

/**
 * Two-state segmented toggle: which audio stream feeds the visualiser
 * AnalyserNode. Renders only when at least one enabled Video layer
 * points at an asset (otherwise there's no second option to pick).
 *
 * Behaviour when 'Video Audio' is selected:
 *   - The chosen video gets unmuted, its createMediaElementSource is
 *     cached + connected to the analyser (see useAudioAnalyzer +
 *     audioContext).
 *   - The uploaded audio element keeps playing silently — it remains
 *     the timeline's master clock so Timeline scrubbing / trim /
 *     loop all behave the same. Only the AUDIO ROUTING changes.
 *
 * CORS: every video in the pool comes from a local upload (blob:
 * URL) so the source is never tainted; cross-origin URL videos can't
 * enter the pool through any current code path, so we don't need to
 * detect taint here.
 */
export function AudioSourceToggle(): JSX.Element | null {
  const audioSource = useAudioStore((s) => s.audioSource)
  const videoAudioAssetId = useAudioStore((s) => s.videoAudioAssetId)
  const setAudioSource = useAudioStore((s) => s.setAudioSource)
  const layers = useLayerStore((s) => s.layers)
  const assets = useVideoAssetStore((s) => s.assets)

  // List of video layers that have a registered asset and could be
  // the audio source. Order: layer zOrder DESC (top-most first) so
  // the default selection is whatever the user most-recently added.
  const candidates = useMemo(() => {
    return layers
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
      .filter(
        (
          row,
        ): row is { layer: typeof row.layer; asset: NonNullable<typeof row.asset> } =>
          row.asset !== undefined,
      )
      .sort((a, b) => b.layer.zOrder - a.layer.zOrder)
  }, [layers, assets])

  if (candidates.length === 0) return null

  // Active asset for 'video' mode. Picks the explicit selection if
  // it's still around, otherwise the top candidate (so toggling
  // without first picking a video still "just works").
  const activeAssetId =
    videoAudioAssetId &&
    candidates.some((c) => c.asset.id === videoAudioAssetId)
      ? videoAudioAssetId
      : candidates[0].asset.id

  const handleClickUploaded = () => setAudioSource('uploaded')
  const handleClickVideo = () => setAudioSource('video', activeAssetId)

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-wider text-white/40">
        Audio
      </span>
      <div
        role="group"
        aria-label="Audio source"
        className="flex items-center overflow-hidden rounded-md border"
        style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
      >
        <button
          type="button"
          onClick={handleClickUploaded}
          aria-pressed={audioSource === 'uploaded'}
          title="Use uploaded audio"
          className="flex items-center gap-1 px-2 py-1 text-[10px] transition-colors"
          style={{
            background:
              audioSource === 'uploaded'
                ? 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18))'
                : 'transparent',
            color:
              audioSource === 'uploaded'
                ? '#fff'
                : 'rgba(255,255,255,0.55)',
          }}
        >
          <Music className="h-3 w-3" aria-hidden="true" />
          Uploaded
        </button>
        <div className="h-4 w-px" style={{ background: '#2a2a2a' }} />
        <button
          type="button"
          onClick={handleClickVideo}
          aria-pressed={audioSource === 'video'}
          title="Use the video layer's own audio"
          className="flex items-center gap-1 px-2 py-1 text-[10px] transition-colors"
          style={{
            background:
              audioSource === 'video'
                ? 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18))'
                : 'transparent',
            color:
              audioSource === 'video' ? '#fff' : 'rgba(255,255,255,0.55)',
          }}
        >
          <Film className="h-3 w-3" aria-hidden="true" />
          Video
        </button>
      </div>
      {/* When multiple candidates exist, surface a tiny picker so the
          user can choose which video supplies the audio. Single-
          candidate case skips the picker entirely (auto-selected
          above). */}
      {audioSource === 'video' && candidates.length > 1 && (
        <select
          value={activeAssetId}
          onChange={(e) => setAudioSource('video', e.target.value)}
          aria-label="Audio source video"
          className="rounded-md border bg-[#1a1a1a] px-1 py-0.5 text-[10px] text-white/80"
          style={{ borderColor: '#2a2a2a' }}
        >
          {candidates.map(({ layer, asset }) => (
            <option key={asset.id} value={asset.id}>
              {layer.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export default AudioSourceToggle
