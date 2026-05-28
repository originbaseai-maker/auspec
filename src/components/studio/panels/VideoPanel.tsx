import { useLayerStore } from '@/store/useLayerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import type { VideoLayerConfig } from '@/types/layer'
import { FillConnectionsList } from './FillConnectionsList'
import {
  CenterSliderRow,
  LockedLayerBanner,
  PanelGroup,
  SegmentedGroup,
  SliderRow,
} from './shared'

interface Props {
  layerId: string
}

const SYNC_MODES = [
  { id: 'loop' as const, label: 'Loop' },
  { id: 'music_sync' as const, label: 'Sync to Music' },
]

const FIT_MODES = [
  { id: 'cover' as const, label: 'Cover' },
  { id: 'contain' as const, label: 'Contain' },
  { id: 'fill' as const, label: 'Fill' },
]

export function VideoPanel({ layerId }: Props) {
  // Needs draft + committed lookup so a freshly-added draft works too.
  const layer = useLayerStore((s) => {
    if (
      s.draftLayer &&
      s.draftLayer.id === layerId &&
      s.draftLayer.type === 'video'
    ) {
      return s.draftLayer
    }
    return s.layers.find((l) => l.id === layerId && l.type === 'video')
  })
  const updateConfig = useLayerStore((s) => s.updateConfig)
  const assets = useVideoAssetStore((s) => s.assets)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a video layer in the sidebar.
      </div>
    )
  }

  const cfg = layer.config as VideoLayerConfig
  const isLocked = layer.locked
  const update = (partial: Partial<VideoLayerConfig>) =>
    updateConfig(layerId, partial)

  return (
    <div
      className="space-y-5"
      style={{
        opacity: isLocked ? 0.5 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
      }}
    >
      {isLocked && <LockedLayerBanner />}

      <PanelGroup title="Source">
        {assets.length === 0 ? (
          <p
            className="rounded-md border px-3 py-2 text-[11px] text-white/60"
            style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}
          >
            No videos uploaded yet. Open the Videos modal (Film icon in
            the top bar) to add one.
          </p>
        ) : (
          <select
            value={cfg.videoAssetId ?? ''}
            onChange={(e) =>
              update({ videoAssetId: e.target.value || null })
            }
            className="w-full rounded border bg-[#0f0f0f] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#3b82f6]"
            style={{ borderColor: '#2a2a2a' }}
            aria-label="Video source"
          >
            <option value="">— Select a video —</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.duration > 0 ? ` (${a.duration.toFixed(1)}s)` : ''}
              </option>
            ))}
          </select>
        )}
      </PanelGroup>

      {cfg.videoAssetId && (
        <>
          {/* Bidirectional: list every container layer using this
              same asset as its fill. Updates live as connections
              come/go. Each chip is clickable to jump to the container. */}
          <FillConnectionsList kind="video" assetKey={cfg.videoAssetId} />
          <PanelGroup title="Sync Mode">
            <SegmentedGroup
              options={SYNC_MODES}
              value={cfg.syncMode}
              onChange={(v) => update({ syncMode: v })}
              cols={2}
            />
            <p className="mt-1 text-[9px] text-white/30">
              {cfg.syncMode === 'loop'
                ? 'Video loops independently of music'
                : 'Video time follows music playback'}
            </p>
          </PanelGroup>

          <PanelGroup title="Fit">
            <SegmentedGroup
              options={FIT_MODES}
              value={cfg.fit}
              onChange={(v) => update({ fit: v })}
              cols={3}
            />
          </PanelGroup>

          <PanelGroup title="Transform">
            <CenterSliderRow
              label="X"
              hint={`${Math.round(cfg.offsetX * 100)}%`}
              value={cfg.offsetX * 100}
              min={0}
              max={100}
              step={1}
              center={50}
              onChange={(v) => update({ offsetX: v / 100 })}
              ariaLabel="Horizontal position"
            />
            <CenterSliderRow
              label="Y"
              hint={`${Math.round(cfg.offsetY * 100)}%`}
              value={cfg.offsetY * 100}
              min={0}
              max={100}
              step={1}
              center={50}
              onChange={(v) => update({ offsetY: v / 100 })}
              ariaLabel="Vertical position"
            />
            <SliderRow
              label="Scale"
              hint={`${cfg.scale.toFixed(2)}×`}
              value={cfg.scale}
              min={0.1}
              max={3}
              step={0.05}
              onChange={(v) => update({ scale: v })}
              ariaLabel="Scale"
            />
            <SliderRow
              label="Rotation"
              hint={`${Math.round(cfg.rotation)}°`}
              value={cfg.rotation}
              min={0}
              max={360}
              step={1}
              onChange={(v) => update({ rotation: v })}
              ariaLabel="Rotation"
            />
          </PanelGroup>

          {cfg.syncMode === 'loop' && (
            <PanelGroup title="Playback">
              <SliderRow
                label="Speed"
                hint={`${cfg.playbackRate.toFixed(2)}×`}
                value={cfg.playbackRate}
                min={0.25}
                max={2}
                step={0.05}
                onChange={(v) => update({ playbackRate: v })}
                ariaLabel="Playback speed"
              />
            </PanelGroup>
          )}
        </>
      )}
    </div>
  )
}

export default VideoPanel
