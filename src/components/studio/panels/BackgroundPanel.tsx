import { useRef, useState } from 'react'
import { Film } from 'lucide-react'
import { useLayerStore } from '@/store/useLayerStore'
import type { BackgroundLayerConfig } from '@/types/layer'
import { BackgroundLibraryModal } from '../BackgroundLibraryModal'
import {
  ColorRow,
  LockedLayerBanner,
  PanelGroup,
  SegmentedGroup,
  SliderRow,
  Toggle,
} from './shared'

interface Props {
  layerId: string
}

const BG_TYPES = [
  { id: 'color' as const, label: 'Color' },
  { id: 'gradient' as const, label: 'Gradient' },
  { id: 'image' as const, label: 'Image' },
  { id: 'video' as const, label: 'Video' },
  { id: 'transparent' as const, label: 'None' },
]

const FIT_MODES = [
  { id: 'cover' as const, label: 'Cover' },
  { id: 'contain' as const, label: 'Contain' },
  { id: 'fill' as const, label: 'Fill' },
]

export function BackgroundPanel({ layerId }: Props) {
  const layer = useLayerStore((s) =>
    s.layers.find((l) => l.id === layerId && l.type === 'background'),
  )
  const updateConfig = useLayerStore((s) => s.updateConfig)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a layer in the Layers sidebar.
      </div>
    )
  }

  const cfg = layer.config as BackgroundLayerConfig
  const isLocked = layer.locked
  const update = (partial: Partial<BackgroundLayerConfig>) =>
    updateConfig(layerId, partial)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please pick an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large (max 10 MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        update({ imageSrc: reader.result, bgType: 'image' })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      className="space-y-5"
      style={{
        opacity: isLocked ? 0.5 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
      }}
    >
      {isLocked && <LockedLayerBanner />}

      <PanelGroup title="Type">
        <SegmentedGroup
          options={BG_TYPES}
          value={cfg.bgType}
          onChange={(v) => update({ bgType: v })}
          cols={4}
        />
      </PanelGroup>

      {(cfg.bgType === 'color' || cfg.bgType === 'gradient') && (
        <PanelGroup title="Color">
          <ColorRow
            value={cfg.color}
            onChange={(v) => update({ color: v })}
            ariaLabel="background color"
          />
        </PanelGroup>
      )}

      {cfg.bgType === 'gradient' && (
        <>
          <PanelGroup title="Second color">
            <ColorRow
              value={cfg.color2}
              onChange={(v) => update({ color2: v })}
              ariaLabel="background gradient second color"
            />
          </PanelGroup>
          <SliderRow
            label="Angle"
            hint={`${Math.round(cfg.gradientAngle)}°`}
            value={cfg.gradientAngle}
            min={0}
            max={360}
            step={1}
            onChange={(v) => update({ gradientAngle: v })}
            ariaLabel="Gradient angle"
          />
        </>
      )}

      {cfg.bgType === 'image' && (
        <>
          <PanelGroup title="Image">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="sr-only"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-md border px-3 py-2 text-[11px] text-white/80 hover:text-white"
              style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
            >
              {cfg.imageSrc ? 'Replace image…' : 'Upload image…'}
            </button>
            {cfg.imageSrc && (
              <button
                type="button"
                onClick={() => update({ imageSrc: null })}
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-[10px] text-white/40 hover:text-red-400"
                style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
              >
                Remove image
              </button>
            )}
          </PanelGroup>
          <PanelGroup title="Fit">
            <SegmentedGroup
              options={FIT_MODES}
              value={cfg.imageFit}
              onChange={(v) => update({ imageFit: v })}
              cols={3}
            />
          </PanelGroup>
          <SliderRow
            label="Blur"
            hint={`${Math.round(cfg.blur)}px`}
            value={cfg.blur}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ blur: v })}
            ariaLabel="Image blur"
          />
        </>
      )}

      {cfg.bgType === 'video' && (
        <>
          <PanelGroup title="Library">
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-medium text-white"
              style={{
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                boxShadow: '0 2px 8px rgba(59,130,246,0.2)',
              }}
            >
              <Film className="h-3.5 w-3.5" aria-hidden="true" />
              {cfg.videoSrc ? 'Browse Library' : 'Pick a background…'}
            </button>
            {cfg.videoSrc && (
              <button
                type="button"
                onClick={() =>
                  update({
                    videoSrc: null,
                    videoLibraryId: null,
                    videoPosterSrc: null,
                  })
                }
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-[10px] text-white/40 hover:text-red-400"
                style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
              >
                Remove video
              </button>
            )}
            <p className="mt-1 text-[9px] text-white/30">
              Curated stock loops. Plays muted + looping.
            </p>
          </PanelGroup>

          <PanelGroup title="🎵 React to audio">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] text-white/70">
                Subtle bass pulse
              </span>
              <Toggle
                checked={cfg.videoReactEnabled === true}
                onChange={(v) => update({ videoReactEnabled: v })}
                ariaLabel="React to audio"
              />
            </div>
            <div style={{ opacity: cfg.videoReactEnabled ? 1 : 0.4 }}>
              <SliderRow
                label="Intensity"
                hint={`${Math.round((cfg.videoReactIntensity ?? 0.5) * 100)}%`}
                value={Math.round((cfg.videoReactIntensity ?? 0.5) * 100)}
                min={0}
                max={100}
                step={1}
                onChange={(v) => update({ videoReactIntensity: v / 100 })}
                ariaLabel="React intensity"
              />
              <p className="mt-1 text-[9px] text-white/30">
                Opacity + tiny scale only. Loop stays in sync — safe
                for export.
              </p>
            </div>
          </PanelGroup>
        </>
      )}

      {cfg.bgType !== 'transparent' && (
        <SliderRow
          label="Opacity"
          hint={`${Math.round(cfg.opacity * 100)}%`}
          value={cfg.opacity * 100}
          min={0}
          max={100}
          step={1}
          onChange={(v) => update({ opacity: v / 100 })}
          ariaLabel="Background opacity"
        />
      )}

      <BackgroundLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPick={(video) =>
          update({
            bgType: 'video',
            videoSrc: video.videoUrl,
            videoLibraryId: video.id,
            videoPosterSrc: video.thumbnailUrl,
          })
        }
      />
    </div>
  )
}

export default BackgroundPanel
