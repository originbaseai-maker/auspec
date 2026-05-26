import { useRef } from 'react'
import { PenTool, Trash2 } from 'lucide-react'
import { useLayerStore } from '@/store/useLayerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import type { ShapeLayerConfig } from '@/types/layer'
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

const FILL_TYPES = [
  { id: 'color' as const, label: 'Color' },
  { id: 'gradient' as const, label: 'Gradient' },
  { id: 'image' as const, label: 'Image' },
  { id: 'video' as const, label: 'Video' },
  { id: 'none' as const, label: 'None' },
]

const SYNC_MODES = [
  { id: 'loop' as const, label: 'Loop' },
  { id: 'music_sync' as const, label: 'Sync to Music' },
]

const FIT_MODES = [
  { id: 'cover' as const, label: 'Cover' },
  { id: 'contain' as const, label: 'Contain' },
  { id: 'fill' as const, label: 'Fill' },
]

export function CustomShapePanel({ layerId }: Props) {
  // Need layers + draft because the active shape could be either.
  const layer = useLayerStore((s) => {
    if (s.draftLayer && s.draftLayer.id === layerId && s.draftLayer.type === 'shape') {
      return s.draftLayer
    }
    return s.layers.find((l) => l.id === layerId && l.type === 'shape')
  })
  const updateConfig = useLayerStore((s) => s.updateConfig)
  const penToolActive = useLayerStore((s) => s.penToolActive)
  const setPenToolActive = useLayerStore((s) => s.setPenToolActive)
  const clearShapePoints = useLayerStore((s) => s.clearShapePoints)
  const videoAssets = useVideoAssetStore((s) => s.assets)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a shape layer in the sidebar.
      </div>
    )
  }

  const cfg = layer.config as ShapeLayerConfig
  const isLocked = layer.locked
  const update = (partial: Partial<ShapeLayerConfig>) =>
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
        update({ imageSrc: reader.result, fillType: 'image' })
      }
    }
    reader.readAsDataURL(file)
  }

  const pointCount = cfg.points.length

  return (
    <div
      className="space-y-5"
      style={{
        opacity: isLocked ? 0.5 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
      }}
    >
      {isLocked && <LockedLayerBanner />}

      <PanelGroup title="Pen Tool">
        <button
          type="button"
          onClick={() => setPenToolActive(!penToolActive)}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-[11px] font-medium text-white transition-colors"
          style={{
            background: penToolActive
              ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
              : '#1a1a1a',
            border: '1px solid',
            borderColor: penToolActive ? 'transparent' : '#2a2a2a',
            boxShadow: penToolActive
              ? '0 2px 8px rgba(59,130,246,0.3)'
              : 'none',
          }}
        >
          <PenTool className="h-3.5 w-3.5" />
          {penToolActive ? 'Pen Tool Active — click canvas to add' : 'Activate Pen Tool'}
        </button>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-white/60">
            Points: <span className="tabular-nums text-white">{pointCount}</span>
            {pointCount < 3 && pointCount > 0 && (
              <span className="ml-1 text-amber-400">· need ≥3</span>
            )}
          </span>
          {pointCount > 0 && (
            <button
              type="button"
              onClick={() => clearShapePoints(layerId)}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] text-white/60 hover:border-red-400/40 hover:text-red-400"
              style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
            >
              <Trash2 className="h-3 w-3" />
              Clear All
            </button>
          )}
        </div>
        {pointCount === 0 && (
          <p className="mt-2 rounded-md border px-2 py-1.5 text-[10px] text-white/50"
             style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}>
            Activate the pen and click anywhere on the canvas to drop a point.
            Add at least 3 points to see your shape.
          </p>
        )}
      </PanelGroup>

      <PanelGroup title="Path">
        <SliderRow
          label="Smoothness"
          hint={cfg.smoothness.toFixed(2)}
          value={cfg.smoothness}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update({ smoothness: v })}
          ariaLabel="Smoothness"
        />
        <p className="text-[9px] text-white/30">
          0 = straight edges · 1 = rounded curves
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Closed shape</span>
          <Toggle
            checked={cfg.closed}
            onChange={(v) => update({ closed: v })}
            ariaLabel="Closed shape"
          />
        </div>
      </PanelGroup>

      <PanelGroup title="Fill">
        <SegmentedGroup
          options={FILL_TYPES}
          value={cfg.fillType}
          onChange={(v) => update({ fillType: v })}
          cols={4}
        />

        {(cfg.fillType === 'color' || cfg.fillType === 'gradient') && (
          <div className="mt-2 space-y-2">
            <ColorRow
              value={cfg.fillColor}
              onChange={(v) => update({ fillColor: v })}
              ariaLabel="fill color"
            />
          </div>
        )}

        {cfg.fillType === 'gradient' && (
          <div className="mt-2 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              Second color
            </p>
            <ColorRow
              value={cfg.fillColor2}
              onChange={(v) => update({ fillColor2: v })}
              ariaLabel="gradient second color"
            />
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
          </div>
        )}

        {cfg.fillType === 'image' && (
          <div className="mt-2 space-y-2">
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
                className="w-full rounded-md border px-3 py-1.5 text-[10px] text-white/40 hover:text-red-400"
                style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
              >
                Remove image
              </button>
            )}
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              Fit
            </p>
            <SegmentedGroup
              options={FIT_MODES}
              value={cfg.imageFit}
              onChange={(v) => update({ imageFit: v })}
              cols={3}
            />
          </div>
        )}

        {cfg.fillType === 'video' && (
          <div className="mt-2 space-y-2">
            {videoAssets.length === 0 ? (
              <p
                className="rounded-md border px-3 py-2 text-[11px] text-white/60"
                style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}
              >
                No videos uploaded yet. Open the Videos modal (Film icon in
                the top bar) to add one.
              </p>
            ) : (
              <>
                <select
                  value={cfg.videoAssetId ?? ''}
                  onChange={(e) =>
                    update({ videoAssetId: e.target.value || null })
                  }
                  className="w-full rounded border bg-[#0f0f0f] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#3b82f6]"
                  style={{ borderColor: '#2a2a2a' }}
                  aria-label="Video fill source"
                >
                  <option value="">— Connect to video —</option>
                  {videoAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <SegmentedGroup
                  options={SYNC_MODES}
                  value={cfg.videoSyncMode ?? 'loop'}
                  onChange={(v) => update({ videoSyncMode: v })}
                  cols={2}
                />
                <p className="text-[10px] uppercase tracking-wider text-white/40">
                  Fit
                </p>
                <SegmentedGroup
                  options={FIT_MODES}
                  value={cfg.imageFit}
                  onChange={(v) => update({ imageFit: v })}
                  cols={3}
                />
              </>
            )}
          </div>
        )}

        {cfg.fillType !== 'none' && (
          <div className="mt-3">
            <SliderRow
              label="Fill opacity"
              hint={`${Math.round(cfg.fillOpacity * 100)}%`}
              value={cfg.fillOpacity * 100}
              min={0}
              max={100}
              step={1}
              onChange={(v) => update({ fillOpacity: v / 100 })}
              ariaLabel="Fill opacity"
            />
          </div>
        )}
      </PanelGroup>

      <PanelGroup title="Stroke">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Enabled</span>
          <Toggle
            checked={cfg.strokeEnabled}
            onChange={(v) => update({ strokeEnabled: v })}
            ariaLabel="Stroke"
          />
        </div>
        <div style={{ opacity: cfg.strokeEnabled ? 1 : 0.4 }}>
          <ColorRow
            value={cfg.strokeColor}
            onChange={(v) => update({ strokeColor: v })}
            ariaLabel="stroke color"
          />
          <div className="mt-2 space-y-2">
            <SliderRow
              label="Width"
              hint={`${cfg.strokeWidth}px`}
              value={cfg.strokeWidth}
              min={0.5}
              max={20}
              step={0.5}
              onChange={(v) => update({ strokeWidth: v })}
              ariaLabel="Stroke width"
            />
            <SliderRow
              label="Opacity"
              hint={`${Math.round(cfg.strokeOpacity * 100)}%`}
              value={cfg.strokeOpacity * 100}
              min={0}
              max={100}
              step={1}
              onChange={(v) => update({ strokeOpacity: v / 100 })}
              ariaLabel="Stroke opacity"
            />
          </div>
        </div>
      </PanelGroup>

      <PanelGroup title="Transform">
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
        <SliderRow
          label="Speed"
          hint={
            cfg.rotationSpeed === 0
              ? 'Static'
              : `${cfg.rotationSpeed > 0 ? '↻' : '↺'} ${Math.abs(cfg.rotationSpeed).toFixed(0)}°/s`
          }
          value={cfg.rotationSpeed}
          min={-180}
          max={180}
          step={1}
          onChange={(v) => update({ rotationSpeed: v })}
          ariaLabel="Rotation speed"
        />
      </PanelGroup>

      <PanelGroup title="Glow">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Enabled</span>
          <Toggle
            checked={cfg.glowEnabled}
            onChange={(v) => update({ glowEnabled: v })}
            ariaLabel="Glow"
          />
        </div>
        <div style={{ opacity: cfg.glowEnabled ? 1 : 0.4 }}>
          <SliderRow
            label="Intensity"
            hint={`${Math.round(cfg.glowIntensity)}%`}
            value={cfg.glowIntensity}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ glowIntensity: v })}
            ariaLabel="Glow intensity"
          />
        </div>
      </PanelGroup>

      <PanelGroup title="Audio Reactivity">
        <SliderRow
          label="Bass pulse"
          hint={`${Math.round(cfg.bassPulse * 100)}%`}
          value={cfg.bassPulse}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update({ bassPulse: v })}
          ariaLabel="Bass pulse"
        />
        <SliderRow
          label="Stroke pulse"
          hint={`${Math.round(cfg.strokePulse * 100)}%`}
          value={cfg.strokePulse}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update({ strokePulse: v })}
          ariaLabel="Stroke pulse"
        />
        <p className="text-[9px] text-white/30">
          Bass scales the whole shape · Mid widens the stroke
        </p>
      </PanelGroup>
    </div>
  )
}

export default CustomShapePanel
