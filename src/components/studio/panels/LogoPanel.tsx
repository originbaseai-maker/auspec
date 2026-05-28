import { useBrandKitStore } from '@/store/useBrandKitStore'
import { useCoverArtStore } from '@/store/useCoverArtStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import { loadImageFile } from '@/types/coverArt'
import type { CropMode } from '@/types/coverArt'
import type { LogoLayerConfig } from '@/types/layer'
import CoverArtUploaderSingle from '@/components/coverart/CoverArtUploaderSingle'
import { FillConnectionsList } from './FillConnectionsList'
import {
  CenterSliderRow,
  LockedLayerBanner,
  PanelGroup,
  SegmentedGroup,
  Slider,
} from './shared'

const CROP_MODES = [
  { id: 'circle' as const, label: 'Circle' },
  { id: 'square' as const, label: 'Square' },
  { id: 'none' as const, label: 'None' },
]

const SYNC_MODES = [
  { id: 'loop' as const, label: 'Loop' },
  { id: 'music_sync' as const, label: 'Sync to Music' },
]

interface Props {
  layerId: string
}

export function LogoPanel({ layerId }: Props) {
  const layer = useLayerStore((s) =>
    s.layers.find((l) => l.id === layerId && l.type === 'logo'),
  )
  const updateConfig = useLayerStore((s) => s.updateConfig)

  // The IMAGE itself still lives in useCoverArtStore (one upload shared
  // across all logo layers in V1). The layer owns size/crop/position.
  const logo = useCoverArtStore((s) => s.logo)
  const setCoverArtLogo = useCoverArtStore((s) => s.setLogo)
  const brandLogos = useBrandKitStore((s) => s.kit.logos)
  const videoAssets = useVideoAssetStore((s) => s.assets)

  /** Convert a brand kit's data-URL logo into a CoverArtImage and apply. */
  const applyBrandLogo = async (
    name: string,
    imageSrc: string,
  ): Promise<void> => {
    try {
      const res = await fetch(imageSrc)
      const blob = await res.blob()
      const file = new File(
        [blob],
        `${name}.${blob.type.split('/')[1] ?? 'png'}`,
        { type: blob.type || 'image/png' },
      )
      const image = await loadImageFile(file)
      setCoverArtLogo(image)
    } catch (err) {
      console.warn('[brand-kit] failed to apply brand logo:', err)
    }
  }

  // Polygon rotation legacy slider — still global because logo-in-polygon
  // uses the polygon layer's own rotation; kept for back-compat UX.
  const polygonRotation = useVisualizerStore(
    (s) => s.visualizerConfig.polygon.rotation,
  )
  const updatePolygon = useVisualizerStore((s) => s.updatePolygon)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a layer in the Layers sidebar.
      </div>
    )
  }

  const cfg = layer.config as LogoLayerConfig
  const isLocked = layer.locked
  const update = (partial: Partial<LogoLayerConfig>) =>
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

      {/* Bidirectional: list every container layer that has THIS
          Logo wired as its image fill. Drives a quick navigation
          path back to the containers using this logo (one tap →
          container's fine tune). */}
      <FillConnectionsList kind="image" assetKey={layerId} />

      {brandLogos.length > 0 && (
        <PanelGroup title="From Brand Kit">
          <div className="grid grid-cols-3 gap-2">
            {brandLogos.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => void applyBrandLogo(l.name, l.imageSrc)}
                title={l.name}
                aria-label={`Apply brand logo ${l.name}`}
                className="aspect-square rounded border bg-[#0f0f0f] p-1 hover:border-blue-500"
                style={{ borderColor: '#2a2a2a' }}
              >
                <img
                  src={l.imageSrc}
                  alt={l.name}
                  className="h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
        </PanelGroup>
      )}

      <PanelGroup title="Logo Overlay">
        <CoverArtUploaderSingle type="logo" />
      </PanelGroup>

      <PanelGroup title="Use Video Instead">
        {videoAssets.length === 0 ? (
          <p
            className="rounded-md border px-3 py-2 text-[11px] text-white/60"
            style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}
          >
            No videos uploaded yet. Open the Videos modal (Film icon in
            the top bar) to add one. When a video is selected here, it
            replaces the logo image in this slot.
          </p>
        ) : (
          <div className="space-y-2">
            <select
              value={cfg.videoAssetId ?? ''}
              onChange={(e) =>
                update({ videoAssetId: e.target.value || null })
              }
              className="w-full rounded border bg-[#0f0f0f] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#3b82f6]"
              style={{ borderColor: '#2a2a2a' }}
              aria-label="Logo video override"
            >
              <option value="">— Use image (no video) —</option>
              {videoAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {cfg.videoAssetId && (
              <SegmentedGroup
                options={SYNC_MODES}
                value={cfg.videoSyncMode ?? 'loop'}
                onChange={(v) => update({ videoSyncMode: v })}
                cols={2}
              />
            )}
          </div>
        )}
      </PanelGroup>

      {logo && (
        <>
          <PanelGroup title="Crop Mode">
            <SegmentedGroup<CropMode>
              options={CROP_MODES}
              value={cfg.logoCropMode}
              onChange={(id) => update({ logoCropMode: id })}
              cols={3}
            />
          </PanelGroup>

          <PanelGroup title="Position">
            <CenterSliderRow
              label="X"
              hint={`${Math.round(cfg.position.x * 100)}%`}
              value={cfg.position.x * 100}
              min={0}
              max={100}
              step={1}
              center={50}
              onChange={(v) =>
                update({ position: { x: v / 100, y: cfg.position.y } })
              }
              ariaLabel="Logo horizontal position"
            />
            <CenterSliderRow
              label="Y"
              hint={`${Math.round(cfg.position.y * 100)}%`}
              value={cfg.position.y * 100}
              min={0}
              max={100}
              step={1}
              center={50}
              onChange={(v) =>
                update({ position: { x: cfg.position.x, y: v / 100 } })
              }
              ariaLabel="Logo vertical position"
            />
            <p className="text-[9px] text-white/30">
              Or drag the logo directly on the canvas
            </p>
          </PanelGroup>

          <PanelGroup
            title="Fill Scale"
            hint={`${Math.round(cfg.logoSize * 100)}%`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] text-white/70">Auto sync</span>
              <button
                type="button"
                onClick={() => update({ autoLogoSync: !cfg.autoLogoSync })}
                aria-pressed={cfg.autoLogoSync}
                className="rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-all"
                style={{
                  background: cfg.autoLogoSync
                    ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                    : '#1a1a1a',
                  border: cfg.autoLogoSync
                    ? '1px solid #3b82f6'
                    : '1px solid #2a2a2a',
                  color: cfg.autoLogoSync
                    ? '#fff'
                    : 'rgba(255,255,255,0.4)',
                  boxShadow: cfg.autoLogoSync
                    ? '0 0 8px rgba(59,130,246,0.5)'
                    : 'none',
                }}
              >
                Auto
              </button>
            </div>
            <div style={{ opacity: cfg.autoLogoSync ? 0.4 : 1 }}>
              <Slider
                value={cfg.logoSize * 100}
                min={10}
                max={100}
                step={1}
                onChange={(v) => {
                  update({
                    autoLogoSync: false,
                    logoSize: Math.max(0.1, Math.min(1.0, v / 100)),
                  })
                }}
                ariaLabel="Logo scale"
              />
              <div className="mt-1 flex justify-between text-[9px] text-white/30">
                <span>Fit</span>
                <span>Fill</span>
              </div>
            </div>
          </PanelGroup>

          <PanelGroup
            title="Rotation"
            hint={`${Math.round(polygonRotation)}°`}
          >
            <Slider
              value={polygonRotation}
              min={0}
              max={360}
              step={1}
              onChange={(v) => updatePolygon({ rotation: v })}
              ariaLabel="Logo rotation"
            />
          </PanelGroup>
        </>
      )}

      {!logo && (
        <p className="text-[10px] leading-relaxed text-white/40">
          Upload a logo to enable crop, scale and rotation controls. The logo
          automatically wraps polygon and circular shapes.
        </p>
      )}
    </div>
  )
}

export default LogoPanel
