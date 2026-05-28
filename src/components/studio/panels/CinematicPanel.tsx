import { useLayerStore } from '@/store/useLayerStore'
import type { CinematicConfig } from '@/types/layer'
import {
  ColorRow,
  LockedLayerBanner,
  PanelGroup,
  SliderRow,
  Toggle,
} from './shared'

interface Props {
  layerId: string
}

export function CinematicPanel({ layerId }: Props) {
  // Draft OR committed — Cinematic is editable while still a draft.
  const layer = useLayerStore((s) => {
    if (
      s.draftLayer &&
      s.draftLayer.id === layerId &&
      s.draftLayer.type === 'cinematic'
    ) {
      return s.draftLayer
    }
    return s.layers.find((l) => l.id === layerId && l.type === 'cinematic')
  })
  const updateConfig = useLayerStore((s) => s.updateConfig)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a Cinematic layer in the sidebar.
      </div>
    )
  }

  const cfg = layer.config as CinematicConfig
  const isLocked = layer.locked
  const update = (partial: Partial<CinematicConfig>) =>
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

      <PanelGroup title="🎬 Vignette">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Enabled</span>
          <Toggle
            checked={cfg.vignetteEnabled}
            onChange={(v) => update({ vignetteEnabled: v })}
            ariaLabel="Vignette"
          />
        </div>
        <div
          style={{ opacity: cfg.vignetteEnabled ? 1 : 0.4 }}
          className="space-y-2"
        >
          <SliderRow
            label="Intensity"
            hint={`${Math.round(cfg.vignetteIntensity * 100)}%`}
            value={Math.round(cfg.vignetteIntensity * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ vignetteIntensity: v / 100 })}
            ariaLabel="Vignette intensity"
          />
          <SliderRow
            label="Size"
            hint={`${Math.round(cfg.vignetteSize * 100)}%`}
            value={Math.round(cfg.vignetteSize * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ vignetteSize: v / 100 })}
            ariaLabel="Vignette clear-centre size"
          />
          <SliderRow
            label="Softness"
            hint={`${Math.round(cfg.vignetteSoftness * 100)}%`}
            value={Math.round(cfg.vignetteSoftness * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ vignetteSoftness: v / 100 })}
            ariaLabel="Vignette softness"
          />
          <div>
            <p className="mb-1 text-[11px] text-white/70">Colour</p>
            <ColorRow
              value={cfg.vignetteColor}
              onChange={(v) => update({ vignetteColor: v })}
              ariaLabel="vignette colour"
            />
            <p className="mt-1 text-[9px] text-white/30">
              Tip: try deep blue (#0a0f2a) for a "magic hour" tint.
            </p>
          </div>
        </div>
      </PanelGroup>

      <PanelGroup title="🎞 Film Grain">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Enabled</span>
          <Toggle
            checked={cfg.grainEnabled}
            onChange={(v) => update({ grainEnabled: v })}
            ariaLabel="Film grain"
          />
        </div>
        <div
          style={{ opacity: cfg.grainEnabled ? 1 : 0.4 }}
          className="space-y-2"
        >
          {/* Intensity capped at 30 — beyond that the look reads as
              broken signal rather than filmic. Default 8 is barely
              perceptible but lifts the whole image. */}
          <SliderRow
            label="Intensity"
            hint={`${Math.round(cfg.grainIntensity * 100)}%`}
            value={Math.round(cfg.grainIntensity * 100)}
            min={0}
            max={30}
            step={1}
            onChange={(v) => update({ grainIntensity: v / 100 })}
            ariaLabel="Film grain intensity"
          />
          <SliderRow
            label="Size"
            hint={`${Math.round(cfg.grainSize * 100)}%`}
            value={Math.round(cfg.grainSize * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ grainSize: v / 100 })}
            ariaLabel="Grain block size"
          />
          <p className="mt-1 text-[9px] text-white/30">
            Fine (low) → 35mm. Coarse (high) → 16mm push.
          </p>
          <SliderRow
            label="Speed"
            hint={`${Math.round(cfg.grainSpeed * 100)}%`}
            value={Math.round(cfg.grainSpeed * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ grainSpeed: v / 100 })}
            ariaLabel="Grain animation speed"
          />
          <p className="mt-1 text-[9px] text-white/30">
            0 = static, 100 = every-frame shimmer.
          </p>
        </div>
      </PanelGroup>
    </div>
  )
}

export default CinematicPanel
