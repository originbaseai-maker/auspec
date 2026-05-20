import {
  BarChart3,
  CircleDot,
  Waves,
  Hexagon,
  Sparkles,
  Download,
} from 'lucide-react'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { useCoverArtStore } from '@/store/useCoverArtStore'
import { useAudioStore } from '@/store/useAudioStore'
import type { CropMode } from '@/types/coverArt'
import CoverArtUploaderSingle from '@/components/coverart/CoverArtUploaderSingle'
import type { VisualType } from '@/lib/visualizerConfig'
import type { PolygonShape } from '@/lib/renderers/polygonSpectrum'

const CROP_MODES: CropMode[] = ['circle', 'square', 'none']

const VISUAL_TYPES: { id: VisualType; label: string; Icon: typeof BarChart3 }[] = [
  { id: 'bars', label: 'Bars', Icon: BarChart3 },
  { id: 'circular', label: 'Circular', Icon: CircleDot },
  { id: 'wave', label: 'Wave', Icon: Waves },
  { id: 'polygon', label: 'Polygon', Icon: Hexagon },
  { id: 'particles', label: 'Particles', Icon: Sparkles },
]

const POLYGON_SHAPES: { id: PolygonShape; label: string }[] = [
  { id: 'triangle', label: '△' },
  { id: 'square', label: '□' },
  { id: 'pentagon', label: '⬠' },
  { id: 'hexagon', label: '⬡' },
  { id: 'star', label: '✦' },
  { id: 'diamond', label: '◇' },
]

const POLYGON_BAR_DIRECTIONS = ['outward', 'inward', 'both'] as const

const COLOR_SWATCHES = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#a855f7',
  '#ec4899',
  '#f59e0b',
  '#14b8a6',
  '#ffffff',
]

const BG_SWATCHES = [
  '#000000',
  '#0a0a0f',
  '#0f172a',
  '#100805',
  '#052e2b',
  '#1a1a1a',
]

function SectionHeader({ title, comingSoon }: { title: string; comingSoon?: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/80">
        {title}
      </h3>
      {comingSoon && (
        <span
          className="text-[10px] font-medium uppercase tracking-wider text-white/40"
          aria-label="Coming soon"
        >
          Coming soon
        </span>
      )}
    </div>
  )
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  ariaLabel: string
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      aria-label={ariaLabel}
      className="auspec-slider w-full"
    />
  )
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full p-0.5 border transition-colors"
      style={{
        borderColor: '#2a2a2a',
        background: checked ? 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)' : '#1a1a1a',
      }}
    >
      <span
        className="block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}

function ColorSwatch({
  color,
  active,
  onClick,
}: {
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select color ${color}`}
      aria-pressed={active}
      className="h-6 w-6 rounded-full border transition-transform hover:scale-110"
      style={{
        background: color,
        borderColor: active ? '#ffffff' : '#2a2a2a',
        boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none',
      }}
    />
  )
}

export function ControlsSidebar() {
  const visualType = useVisualizerStore((s) => s.visualType)
  const setVisualType = useVisualizerStore((s) => s.setVisualType)
  const config = useVisualizerStore((s) => s.visualizerConfig)
  const updateLinearBars = useVisualizerStore((s) => s.updateLinearBars)
  const updateCircularSpectrum = useVisualizerStore((s) => s.updateCircularSpectrum)
  const updateWave = useVisualizerStore((s) => s.updateWave)
  const updatePolygon = useVisualizerStore((s) => s.updatePolygon)
  const updateFramePulse = useVisualizerStore((s) => s.updateFramePulse)
  const backgroundColor = useVisualizerStore((s) => s.backgroundColor)
  const setBackgroundColor = useVisualizerStore((s) => s.setBackgroundColor)
  const sensitivity = useVisualizerStore((s) => s.sensitivity)
  const setSensitivity = useVisualizerStore((s) => s.setSensitivity)

  // Pull colors from active visual type
  const primary =
    visualType === 'bars'
      ? config.linearBars.colorStart
      : visualType === 'circular'
        ? config.circularSpectrum.colorStart
        : visualType === 'polygon'
          ? config.polygon.colorStart
          : config.wave.colorStart
  const secondary =
    visualType === 'bars'
      ? config.linearBars.colorEnd
      : visualType === 'circular'
        ? config.circularSpectrum.colorEnd
        : visualType === 'polygon'
          ? config.polygon.colorEnd
          : config.wave.colorEnd

  const setPrimary = (color: string) => {
    if (visualType === 'bars') updateLinearBars({ colorStart: color })
    else if (visualType === 'circular') updateCircularSpectrum({ colorStart: color })
    else if (visualType === 'wave') updateWave({ colorStart: color })
    else if (visualType === 'polygon') updatePolygon({ colorStart: color })
  }
  const setSecondary = (color: string) => {
    if (visualType === 'bars') updateLinearBars({ colorEnd: color })
    else if (visualType === 'circular') updateCircularSpectrum({ colorEnd: color })
    else if (visualType === 'wave') updateWave({ colorEnd: color })
    else if (visualType === 'polygon') updatePolygon({ colorEnd: color })
  }

  const glowEnabled =
    visualType === 'bars'
      ? config.linearBars.glowEnabled
      : visualType === 'circular'
        ? config.circularSpectrum.glowEnabled
        : visualType === 'polygon'
          ? config.polygon.glowEnabled
          : config.wave.glowEnabled
  const glowIntensity =
    visualType === 'bars'
      ? config.linearBars.glowIntensity
      : visualType === 'circular'
        ? config.circularSpectrum.glowIntensity
        : visualType === 'polygon'
          ? config.polygon.glowIntensity
          : config.wave.glowIntensity

  const setGlowEnabled = (v: boolean) => {
    if (visualType === 'bars') updateLinearBars({ glowEnabled: v })
    else if (visualType === 'circular') updateCircularSpectrum({ glowEnabled: v })
    else if (visualType === 'wave') updateWave({ glowEnabled: v })
    else if (visualType === 'polygon') updatePolygon({ glowEnabled: v })
  }
  const setGlowIntensity = (v: number) => {
    if (visualType === 'bars') updateLinearBars({ glowIntensity: v })
    else if (visualType === 'circular') updateCircularSpectrum({ glowIntensity: v })
    else if (visualType === 'wave') updateWave({ glowIntensity: v })
    else if (visualType === 'polygon') updatePolygon({ glowIntensity: v })
  }

  const smoothing =
    visualType === 'bars'
      ? config.linearBars.smoothing
      : visualType === 'circular'
        ? config.circularSpectrum.smoothing
        : visualType === 'polygon'
          ? config.polygon.smoothing
          : config.wave.smoothing
  const setSmoothing = (v: number) => {
    if (visualType === 'bars') updateLinearBars({ smoothing: v })
    else if (visualType === 'circular') updateCircularSpectrum({ smoothing: v })
    else if (visualType === 'wave') updateWave({ smoothing: v })
    else if (visualType === 'polygon') updatePolygon({ smoothing: v })
  }

  const supportsMirror = visualType === 'bars' || visualType === 'wave'
  const mirrorMode =
    visualType === 'bars'
      ? config.linearBars.mirrorMode
      : visualType === 'wave'
        ? config.wave.mirrorMode
        : false
  const setMirrorMode = (v: boolean) => {
    if (visualType === 'bars') updateLinearBars({ mirrorMode: v })
    else if (visualType === 'wave') updateWave({ mirrorMode: v })
  }

  const supportsBarCount =
    visualType === 'bars' || visualType === 'circular' || visualType === 'polygon'
  const barCount =
    visualType === 'bars'
      ? config.linearBars.barCount
      : visualType === 'circular'
        ? config.circularSpectrum.barCount
        : visualType === 'polygon'
          ? config.polygon.barCount
          : 0
  const setBarCount = (v: number) => {
    const n = Math.round(v)
    if (visualType === 'bars') updateLinearBars({ barCount: n })
    else if (visualType === 'circular') updateCircularSpectrum({ barCount: n })
    else if (visualType === 'polygon') updatePolygon({ barCount: n })
  }

  const supportsRotation = visualType === 'circular' || visualType === 'polygon'
  const rotation =
    visualType === 'polygon' ? config.polygon.rotation : config.circularSpectrum.rotation
  const setRotation = (v: number) => {
    if (visualType === 'polygon') updatePolygon({ rotation: v })
    else if (visualType === 'circular') updateCircularSpectrum({ rotation: v })
  }

  const isParticles = visualType === 'particles'
  const isPolygon = visualType === 'polygon'
  const polygonConfig = config.polygon

  const audioFile = useAudioStore((s) => s.audioFile)
  const coverArt = useCoverArtStore((s) => s.coverArt)
  const logo = useCoverArtStore((s) => s.logo)
  const coverArtSize = useCoverArtStore((s) => s.coverArtSize)
  const logoSize = useCoverArtStore((s) => s.logoSize)
  const coverArtCropMode = useCoverArtStore((s) => s.coverArtCropMode)
  const logoCropMode = useCoverArtStore((s) => s.logoCropMode)
  const blurredBgEnabled = useCoverArtStore((s) => s.blurredBgEnabled)
  const blurredBgIntensity = useCoverArtStore((s) => s.blurredBgIntensity)
  const setCoverArtSize = useCoverArtStore((s) => s.setCoverArtSize)
  const setLogoSize = useCoverArtStore((s) => s.setLogoSize)
  const setCoverArtCropMode = useCoverArtStore((s) => s.setCoverArtCropMode)
  const setLogoCropMode = useCoverArtStore((s) => s.setLogoCropMode)
  const setBlurredBgEnabled = useCoverArtStore((s) => s.setBlurredBgEnabled)
  const setBlurredBgIntensity = useCoverArtStore((s) => s.setBlurredBgIntensity)

  return (
    <aside
      className="hidden lg:flex w-[260px] shrink-0 flex-col border-l bg-[#111111] overflow-y-auto"
      style={{ borderColor: '#2a2a2a' }}
      aria-label="Visualizer controls"
    >
      <div className="flex flex-col divide-y" style={{ borderColor: '#2a2a2a' }}>
        {/* 0. Media — quick uploads */}
        <section className="p-3" style={{ borderColor: '#2a2a2a' }}>
          <SectionHeader title="Media" />
          <div className="flex flex-col gap-2">
            <div
              className="flex items-center gap-2 rounded-md border bg-[#1a1a1a] px-3 py-2"
              style={{ borderColor: '#2a2a2a' }}
            >
              <span className="text-[10px] uppercase tracking-wider text-white/50">
                Audio
              </span>
              {audioFile ? (
                <span
                  className="flex-1 truncate text-[11px] text-white/80"
                  title={audioFile.name}
                >
                  {audioFile.name}
                </span>
              ) : (
                <span className="flex-1 text-[11px] text-white/40">
                  No audio loaded
                </span>
              )}
            </div>
            <CoverArtUploaderSingle type="coverart" />
            <CoverArtUploaderSingle type="logo" />
          </div>
        </section>

        {/* 1. Visual Type */}
        <section className="p-4" style={{ borderColor: '#2a2a2a' }}>
          <SectionHeader title="Visual Type" />
          <div className="grid grid-cols-3 gap-2">
            {VISUAL_TYPES.map(({ id, label, Icon }) => {
              const active = visualType === id
              const disabled = id === 'particles'
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setVisualType(id)}
                  aria-pressed={active}
                  className="flex flex-col items-center justify-center gap-1 rounded-md border py-3 text-[11px] transition-colors"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.18) 100%)'
                      : '#1a1a1a',
                    borderColor: active ? '#8b5cf6' : '#2a2a2a',
                    color: disabled ? 'rgba(255,255,255,0.35)' : '#fff',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{label}</span>
                  {disabled && (
                    <span className="text-[9px] text-white/40">Soon</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* 1.5 Polygon Shape (only when polygon is active) */}
        {isPolygon && (
          <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
            <SectionHeader title="Shape" />
            <div className="mb-3 grid grid-cols-3 gap-2">
              {POLYGON_SHAPES.map(({ id, label }) => {
                const active = polygonConfig.shape === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updatePolygon({ shape: id })}
                    aria-pressed={active}
                    className="flex flex-col items-center justify-center gap-0.5 rounded-md border py-2 transition-all"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.18) 100%)'
                        : '#1a1a1a',
                      borderColor: active ? '#8b5cf6' : '#2a2a2a',
                    }}
                  >
                    <span className="text-lg leading-none text-white">{label}</span>
                    <span className="text-[9px] capitalize text-white/50">{id}</span>
                  </button>
                )
              })}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-white/80">Fill Shape</span>
              <Toggle
                checked={polygonConfig.fillShape}
                onChange={(v) => updatePolygon({ fillShape: v })}
                ariaLabel="Fill shape"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/50">
                Bar Direction
              </label>
              <div className="grid grid-cols-3 gap-1">
                {POLYGON_BAR_DIRECTIONS.map((dir) => {
                  const active = polygonConfig.barDirection === dir
                  return (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => updatePolygon({ barDirection: dir })}
                      aria-pressed={active}
                      className="rounded border py-1 text-[10px] capitalize transition-colors"
                      style={{
                        borderColor: active ? '#3b82f6' : '#2a2a2a',
                        background: active ? 'rgba(59,130,246,0.15)' : '#1a1a1a',
                        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {dir}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-white/60">
                Radius ({Math.round(polygonConfig.radius)}px)
              </label>
              <Slider
                value={polygonConfig.radius}
                min={40}
                max={400}
                step={1}
                onChange={(v) => updatePolygon({ radius: v })}
                ariaLabel="Polygon radius"
              />
            </div>
          </section>
        )}

        {/* 2. Colors */}
        {!isParticles && (
          <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
            <SectionHeader title="Colors" />
            <div className="mb-3">
              <label className="mb-1 block text-[11px] text-white/60">Primary</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {COLOR_SWATCHES.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    active={primary.toLowerCase() === c.toLowerCase()}
                    onClick={() => setPrimary(c)}
                  />
                ))}
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  aria-label="Custom primary color"
                  className="h-6 w-6 rounded-full border border-[#2a2a2a] bg-transparent cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-white/60">Secondary</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {COLOR_SWATCHES.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    active={secondary.toLowerCase() === c.toLowerCase()}
                    onClick={() => setSecondary(c)}
                  />
                ))}
                <input
                  type="color"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  aria-label="Custom secondary color"
                  className="h-6 w-6 rounded-full border border-[#2a2a2a] bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </section>
        )}

        {/* Background */}
        <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
          <SectionHeader title="Background" />
          <div className="flex flex-wrap items-center gap-1.5">
            {BG_SWATCHES.map((c) => (
              <ColorSwatch
                key={c}
                color={c}
                active={backgroundColor.toLowerCase() === c.toLowerCase()}
                onClick={() => setBackgroundColor(c)}
              />
            ))}
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              aria-label="Custom background color"
              className="h-6 w-6 rounded-full border border-[#2a2a2a] bg-transparent cursor-pointer"
            />
          </div>
        </section>

        {/* 3. Sensitivity */}
        <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
          <SectionHeader title="Sensitivity" />
          <Slider
            value={sensitivity}
            min={0}
            max={100}
            step={1}
            onChange={setSensitivity}
            ariaLabel="Sensitivity"
          />
          <div className="mt-2 flex justify-between text-[10px] text-white/40">
            <span>Low</span>
            <span>{sensitivity}</span>
            <span>High</span>
          </div>
        </section>

        {/* 4. Effects */}
        {!isParticles && (
          <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
            <SectionHeader title="Effects" />
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm text-white/90">Glow</label>
              <Toggle
                checked={glowEnabled}
                onChange={setGlowEnabled}
                ariaLabel="Glow toggle"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-[11px] text-white/60">
                Glow Intensity ({Math.round(glowIntensity)})
              </label>
              <Slider
                value={glowIntensity}
                min={0}
                max={20}
                step={0.5}
                onChange={setGlowIntensity}
                ariaLabel="Glow intensity"
              />
            </div>
            {supportsRotation && (
              <div>
                <label className="mb-1 block text-[11px] text-white/60">
                  Rotation ({Math.round(rotation)}°)
                </label>
                <Slider
                  value={rotation}
                  min={0}
                  max={360}
                  step={1}
                  onChange={setRotation}
                  ariaLabel="Rotation"
                />
              </div>
            )}
          </section>
        )}

        {/* 5. Bar Count */}
        {supportsBarCount && (
          <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
            <SectionHeader title="Bar Count" />
            <Slider
              value={barCount}
              min={32}
              max={256}
              step={1}
              onChange={setBarCount}
              ariaLabel="Bar count"
            />
            <div className="mt-2 flex justify-between text-[10px] text-white/40">
              <span>32</span>
              <span>{barCount}</span>
              <span>256</span>
            </div>
          </section>
        )}

        {/* 6. Smoothing */}
        {!isParticles && (
          <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
            <SectionHeader title="Smoothing" />
            <Slider
              value={smoothing}
              min={0}
              max={1}
              step={0.01}
              onChange={setSmoothing}
              ariaLabel="Smoothing"
            />
            <div className="mt-2 flex justify-between text-[10px] text-white/40">
              <span>0</span>
              <span>{smoothing.toFixed(2)}</span>
              <span>1</span>
            </div>
          </section>
        )}

        {/* 7. Mirror Mode */}
        {supportsMirror && (
          <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
            <SectionHeader title="Mirror Mode" />
            <div className="flex items-center justify-between">
              <label className="text-sm text-white/90">Symmetric</label>
              <Toggle
                checked={mirrorMode}
                onChange={setMirrorMode}
                ariaLabel="Mirror mode"
              />
            </div>
          </section>
        )}

        {/* 8. Frame Pulse */}
        <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
          <SectionHeader title="Frame Pulse" />
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm text-white/90">Enabled</label>
            <Toggle
              checked={config.framePulse.enabled}
              onChange={(v) => updateFramePulse({ enabled: v })}
              ariaLabel="Frame pulse toggle"
            />
          </div>
          <div className="mb-2">
            <label className="mb-1 block text-[11px] text-white/60">Beat Color</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {COLOR_SWATCHES.map((c) => (
                <ColorSwatch
                  key={c}
                  color={c}
                  active={config.framePulse.beatColor.toLowerCase() === c.toLowerCase()}
                  onClick={() => updateFramePulse({ beatColor: c })}
                />
              ))}
              <input
                type="color"
                value={config.framePulse.beatColor}
                onChange={(e) => updateFramePulse({ beatColor: e.target.value })}
                aria-label="Custom beat color"
                className="h-6 w-6 rounded-full border border-[#2a2a2a] bg-transparent cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* 8.5 Cover Art */}
        <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
          <SectionHeader title="Cover Art" />

          {/* Background Image subsection */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Background Image
            </p>
            <CoverArtUploaderSingle type="coverart" />

            {coverArt && (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-white/60">
                    Crop Mode
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {CROP_MODES.map((mode) => {
                      const active = coverArtCropMode === mode
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setCoverArtCropMode(mode)}
                          aria-pressed={active}
                          className="rounded-md border py-1.5 text-xs capitalize transition-colors"
                          style={{
                            background: active
                              ? 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.18) 100%)'
                              : '#1a1a1a',
                            borderColor: active ? '#8b5cf6' : '#2a2a2a',
                            color: '#fff',
                          }}
                        >
                          {mode}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-white/60">
                    Size ({Math.round(coverArtSize * 100)}%)
                  </label>
                  <Slider
                    value={coverArtSize * 100}
                    min={10}
                    max={50}
                    step={1}
                    onChange={(v) => setCoverArtSize(v / 100)}
                    ariaLabel="Cover art size"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-white/90">Blurred Background</label>
                  <Toggle
                    checked={blurredBgEnabled}
                    onChange={setBlurredBgEnabled}
                    ariaLabel="Blurred background toggle"
                  />
                </div>

                {blurredBgEnabled && (
                  <div>
                    <label className="mb-1 block text-[11px] text-white/60">
                      Blur Intensity ({Math.round(blurredBgIntensity)})
                    </label>
                    <Slider
                      value={blurredBgIntensity}
                      min={0}
                      max={40}
                      step={1}
                      onChange={setBlurredBgIntensity}
                      ariaLabel="Blur intensity"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Logo Overlay subsection */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Logo Overlay
            </p>
            <CoverArtUploaderSingle type="logo" />

            {logo && (
              <>
                <div className="mt-3 flex items-center gap-2 rounded-md border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-3 py-2">
                  <span className="text-[10px] font-medium text-[#3b82f6]">✦ Smart Mode</span>
                  <span className="text-[10px] text-white/50">
                    Spectrum auto-wraps logo shape
                  </span>
                </div>
              </>
            )}

            {logo && (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-white/60">
                    Crop Mode
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {CROP_MODES.map((mode) => {
                      const active = logoCropMode === mode
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setLogoCropMode(mode)}
                          aria-pressed={active}
                          className="rounded-md border py-1.5 text-xs capitalize transition-colors"
                          style={{
                            background: active
                              ? 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.18) 100%)'
                              : '#1a1a1a',
                            borderColor: active ? '#8b5cf6' : '#2a2a2a',
                            color: '#fff',
                          }}
                        >
                          {mode}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-white/60">
                    Logo Size ({Math.round(logoSize * 100)}%)
                  </label>
                  <Slider
                    value={logoSize * 100}
                    min={10}
                    max={30}
                    step={1}
                    onChange={(v) => setLogoSize(v / 100)}
                    ariaLabel="Logo size"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 9. Export */}
        <section className="border-t p-4" style={{ borderColor: '#2a2a2a' }}>
          <SectionHeader title="Export" comingSoon />
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Export coming in Phase 11"
            className="flex w-full items-center justify-center gap-2 rounded-md border bg-[#1a1a1a] py-2 text-sm text-white/80 cursor-not-allowed opacity-60"
            style={{ borderColor: '#2a2a2a' }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Video
          </button>
        </section>
      </div>
    </aside>
  )
}

export default ControlsSidebar
