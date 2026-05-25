import { useCoverArtStore } from '@/store/useCoverArtStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import type { CropMode } from '@/types/coverArt'
import type { LogoLayerConfig } from '@/types/layer'
import CoverArtUploaderSingle from '@/components/coverart/CoverArtUploaderSingle'
import {
  LockedLayerBanner,
  PanelGroup,
  SegmentedGroup,
  Slider,
  SliderRow,
} from './shared'

const CROP_MODES = [
  { id: 'circle' as const, label: 'Circle' },
  { id: 'square' as const, label: 'Square' },
  { id: 'none' as const, label: 'None' },
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

      <PanelGroup title="Logo Overlay">
        <CoverArtUploaderSingle type="logo" />
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
            <SliderRow
              label="X"
              hint={`${Math.round(cfg.position.x * 100)}%`}
              value={cfg.position.x * 100}
              min={0}
              max={100}
              step={1}
              onChange={(v) =>
                update({ position: { x: v / 100, y: cfg.position.y } })
              }
              ariaLabel="Logo horizontal position"
            />
            <SliderRow
              label="Y"
              hint={`${Math.round(cfg.position.y * 100)}%`}
              value={cfg.position.y * 100}
              min={0}
              max={100}
              step={1}
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
