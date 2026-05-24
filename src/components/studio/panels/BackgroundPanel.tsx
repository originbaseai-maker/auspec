import { useVisualizerStore } from '@/store/useVisualizerStore'
import { useCoverArtStore } from '@/store/useCoverArtStore'
import CoverArtUploaderSingle from '@/components/coverart/CoverArtUploaderSingle'
import {
  BG_SWATCHES,
  ColorRow,
  PanelGroup,
  Slider,
  Toggle,
} from './shared'

export function BackgroundPanel() {
  const backgroundColor = useVisualizerStore((s) => s.backgroundColor)
  const setBackgroundColor = useVisualizerStore((s) => s.setBackgroundColor)

  const coverArt = useCoverArtStore((s) => s.coverArt)
  const blurredBgEnabled = useCoverArtStore((s) => s.blurredBgEnabled)
  const blurredBgIntensity = useCoverArtStore((s) => s.blurredBgIntensity)
  const setBlurredBgEnabled = useCoverArtStore((s) => s.setBlurredBgEnabled)
  const setBlurredBgIntensity = useCoverArtStore((s) => s.setBlurredBgIntensity)

  return (
    <div className="space-y-5">
      <PanelGroup title="Background Color">
        <ColorRow
          value={backgroundColor}
          onChange={setBackgroundColor}
          ariaLabel="background color"
          swatches={BG_SWATCHES}
        />
      </PanelGroup>

      <PanelGroup title="Background Image">
        <CoverArtUploaderSingle type="coverart" />
        <p className="mt-2 text-[10px] leading-relaxed text-white/40">
          Upload an image to use as the canvas background.
        </p>
      </PanelGroup>

      {coverArt && (
        <PanelGroup title="Blurred Background">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">Enabled</span>
            <Toggle
              checked={blurredBgEnabled}
              onChange={setBlurredBgEnabled}
              ariaLabel="Blurred background"
            />
          </div>
          <div style={{ opacity: blurredBgEnabled ? 1 : 0.4 }}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] text-white/70">Blur intensity</span>
              <span className="text-[10px] tabular-nums text-white/40">
                {Math.round(blurredBgIntensity)}px
              </span>
            </div>
            <Slider
              value={blurredBgIntensity}
              min={0}
              max={40}
              step={1}
              onChange={setBlurredBgIntensity}
              ariaLabel="Blur intensity"
            />
          </div>
        </PanelGroup>
      )}
    </div>
  )
}

export default BackgroundPanel
