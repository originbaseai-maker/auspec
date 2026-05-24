import { useCoverArtStore } from '@/store/useCoverArtStore'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import type { CropMode } from '@/types/coverArt'
import CoverArtUploaderSingle from '@/components/coverart/CoverArtUploaderSingle'
import { PanelGroup, SegmentedGroup, Slider } from './shared'

const CROP_MODES = [
  { id: 'circle' as const, label: 'Circle' },
  { id: 'square' as const, label: 'Square' },
  { id: 'none' as const, label: 'None' },
]

export function LogoPanel() {
  const logo = useCoverArtStore((s) => s.logo)
  const logoSize = useCoverArtStore((s) => s.logoSize)
  const setLogoSize = useCoverArtStore((s) => s.setLogoSize)
  const logoCropMode = useCoverArtStore((s) => s.logoCropMode)
  const setLogoCropMode = useCoverArtStore((s) => s.setLogoCropMode)
  const autoLogoSync = useCoverArtStore((s) => s.autoLogoSync)
  const setAutoLogoSync = useCoverArtStore((s) => s.setAutoLogoSync)

  const polygonRotation = useVisualizerStore(
    (s) => s.visualizerConfig.polygon.rotation,
  )
  const updatePolygon = useVisualizerStore((s) => s.updatePolygon)

  return (
    <div className="space-y-5">
      <PanelGroup title="Logo Overlay">
        <CoverArtUploaderSingle type="logo" />
      </PanelGroup>

      {logo && (
        <>
          <PanelGroup title="Crop Mode">
            <SegmentedGroup<CropMode>
              options={CROP_MODES}
              value={logoCropMode}
              onChange={(id) => setLogoCropMode(id)}
              cols={3}
            />
          </PanelGroup>

          <PanelGroup
            title="Fill Scale"
            hint={`${Math.round(logoSize * 100)}%`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] text-white/70">Auto sync</span>
              <button
                type="button"
                onClick={() => setAutoLogoSync(!autoLogoSync)}
                aria-pressed={autoLogoSync}
                className="rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-all"
                style={{
                  background: autoLogoSync
                    ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                    : '#1a1a1a',
                  border: autoLogoSync
                    ? '1px solid #3b82f6'
                    : '1px solid #2a2a2a',
                  color: autoLogoSync
                    ? '#fff'
                    : 'rgba(255,255,255,0.4)',
                  boxShadow: autoLogoSync
                    ? '0 0 8px rgba(59,130,246,0.5)'
                    : 'none',
                }}
              >
                Auto
              </button>
            </div>
            <div style={{ opacity: autoLogoSync ? 0.4 : 1 }}>
              <Slider
                value={logoSize * 100}
                min={10}
                max={100}
                step={1}
                onChange={(v) => {
                  setAutoLogoSync(false)
                  setLogoSize(v / 100)
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
