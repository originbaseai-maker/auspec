import type { LinearBarsConfig } from '@/lib/renderers/linearBars'
import type { CircularSpectrumConfig } from '@/lib/renderers/circularSpectrum'
import type { WaveConfig } from '@/lib/renderers/wave'
import type { PolygonSpectrumConfig } from '@/lib/renderers/polygonSpectrum'
import type { ParticleConfig } from '@/store/useParticleStore'
import type { FrameConfig } from '@/store/useFrameStore'
import type { CropMode } from '@/types/coverArt'
import type { VideoSyncMode } from '@/types/video'

export type LayerType =
  | 'bars'
  | 'circular'
  | 'wave'
  | 'polygon'
  | 'bloom'
  | 'particles'
  | 'logo'
  | 'frame'
  | 'background'
  | 'text'
  | 'shape'
  | 'video'

export type FontFamily =
  | 'Inter'
  | 'Bebas Neue'
  | 'Playfair Display'
  | 'Pacifico'
  | 'Space Mono'

export interface BarsLayer {
  type: 'bars'
  config: LinearBarsConfig
}
export interface CircularLayer {
  type: 'circular'
  config: CircularSpectrumConfig
}
export interface WaveLayer {
  type: 'wave'
  config: WaveConfig
}
export interface PolygonLayer {
  type: 'polygon'
  config: PolygonSpectrumConfig
}
export interface ParticlesLayer {
  type: 'particles'
  config: ParticleConfig
}

/**
 * Per-layer logo configuration. The IMAGE itself lives in
 * `useCoverArtStore.logo` (shared across all logo layers in V1 — users
 * upload one image, can show it in multiple places). Each LogoLayer
 * provides its own size / position / crop / sync setting.
 */
export interface LogoLayerConfig {
  /** Fraction of min(width, height). 0.1–1.0. */
  logoSize: number
  logoCropMode: CropMode
  /** Center position 0–1. */
  position: { x: number; y: number }
  /** Auto-sync to a circular/polygon layer's radius (V1: still global behavior). */
  autoLogoSync: boolean
  /**
   * Optional: when set, the renderer draws this video into the logo
   * slot instead of the cover-art image. Same crop / position semantics.
   */
  videoAssetId?: string | null
  videoSyncMode?: VideoSyncMode
}

export interface LogoLayer {
  type: 'logo'
  config: LogoLayerConfig
}

export interface FrameLayer {
  type: 'frame'
  config: FrameConfig
}

export interface BackgroundLayerConfig {
  bgType: 'color' | 'gradient' | 'image' | 'transparent'
  /** Solid color, or first gradient stop. */
  color: string
  /** Second gradient stop. */
  color2: string
  /** 0–360 degrees. */
  gradientAngle: number
  /** Data URL for 'image' bgType. null when not uploaded. */
  imageSrc: string | null
  imageFit: 'cover' | 'contain' | 'fill'
  /** CSS-filter blur in px applied to image. 0 disables. */
  blur: number
  /** 0–1 global alpha. */
  opacity: number
}

export interface BackgroundLayer {
  type: 'background'
  config: BackgroundLayerConfig
}

export interface TextLayerConfig {
  text: string
  font: FontFamily
  fontWeight: 400 | 600 | 700
  /** 12–120. */
  fontSize: number
  color: string
  /** 0–1 horizontal center. */
  x: number
  /** 0–1 vertical center. */
  y: number
  /** -2 to 10 px. */
  letterSpacing: number
  shadowEnabled: boolean
  /** 0–100. */
  shadowIntensity: number
  shadowColor: string
}

export interface TextLayer {
  type: 'text'
  config: TextLayerConfig
}

/**
 * The five visual variants Bloom layers can render. 'classic' is the
 * original radial-spectrum behaviour; the other five are Specterr-
 * inspired styles that share Bloom's palette / sensitivity / position
 * controls but draw completely different shapes.
 */
export type BloomStyle =
  | 'classic'
  | 'organic'
  | 'aura'
  | 'echo'
  | 'star'
  | 'multiRing'

/**
 * Bloom — organic radial wave visualizer. Frequency spectrum maps to
 * angle (0..360°), amplitude drives the radius from center, adjacent
 * points are connected with quadratic Bezier curves for the "organic"
 * feel. Multiple concentric echo rings layered with palette colors.
 */
export interface BloomConfig {
  /**
   * Visual variant. Defaults to 'classic' — preserves existing
   * behaviour for user-created layers that predate the variant system.
   */
  style?: BloomStyle
  /** 'star' variant: number of spikes (4–12). */
  starPoints?: number
  /** 'echo' variant: number of echo copies (2–6). */
  mirrorEchoCount?: number
  /** 'multiRing' variant: number of concentric rings (3–7). */
  ringCount?: number
  /** 'star' / 'echo' / 'multiRing' rotation speed in rev/sec (-2 to 2). */
  variantRotationSpeed?: number
  /** 'multiRing': rainbow hue spread instead of palette cycle. */
  rainbow?: boolean
  /** 'echo': base shape — 'circle' or 'polygon'. */
  echoShape?: 'circle' | 'polygon'
  /**
   * Set of BloomStyle values the user has manually tuned `echoCount`
   * for, so the panel's per-variant smart default only applies once
   * per (layer, style) pair. Serialised as a string array for
   * Zustand-friendliness; runtime treats it as a set.
   */
  echoCountTouchedFor?: BloomStyle[]

  // Shape
  /** Base radius in px at amplitude 0 (20–300). */
  baseRadius: number
  /** Audio amplitude → radial scale (0–3). */
  amplitudeScale: number
  /** Sample points around the circle (32–256). Higher = smoother. */
  pointCount: number
  /** 0 = polygon edges, 1 = fully smooth bezier curves. */
  smoothness: number

  // Echo (concentric rings)
  /** Number of layered rings (1–10). */
  echoCount: number
  /** Pixels between adjacent rings. */
  echoSpacing: number
  /** 0–1; ring N's opacity = falloff^N. */
  echoFalloff: number
  /** Rings grow outward or stack inward. */
  echoMode: 'outward' | 'inward'
  /**
   * Degrees of rotation added per echo step. 0 = stacked; non-zero
   * twists the echoes around so each ring is angularly offset from
   * the previous — gives the "fan" / "shutter" effect.
   */
  echoRotationOffset?: number

  // Rotation
  /** Static offset (deg, 0–360). */
  rotation: number
  /** Auto-rotate speed (deg/sec, -180..180). 0 = static. */
  rotationSpeed: number

  // Stroke
  lineWidth: number
  closedShape: boolean

  // Color
  colorStart: string
  colorEnd: string
  palette?: string[]

  // Glow
  glowEnabled: boolean
  /** 0–100 shadowBlur on the strokes. */
  glowIntensity: number

  // Reactivity
  /** 0–1; how much bass scales the whole shape. */
  bassPulse: number
  bassSensitivity?: number
  midSensitivity?: number
  trebleSensitivity?: number

  // Position (0–1 fraction of canvas)
  offsetX: number
  offsetY: number

  /** Start/end as % of full spectrum (0–100). */
  startFrequency: number
  endFrequency: number
}

export interface BloomLayer {
  type: 'bloom'
  config: BloomConfig
}

/**
 * Custom Shape — user-drawn polygon defined by a list of points, filled
 * with color/gradient/image. Points live in 0–1 canvas-fraction space so
 * the shape scales with the canvas. Audio drives an optional pulse on
 * scale and stroke width.
 */
export interface ShapePoint {
  /** 0–1 horizontal fraction of canvas. */
  x: number
  /** 0–1 vertical fraction of canvas. */
  y: number
}

export type ShapeFillType = 'color' | 'gradient' | 'image' | 'video' | 'none'
export type ShapeImageFit = 'cover' | 'contain' | 'fill'

export interface ShapeLayerConfig {
  /** Ordered list of vertices, fraction of canvas. */
  points: ShapePoint[]
  /** 0 = polygon edges, 1 = quadratic-bezier rounded curves. */
  smoothness: number
  /** Close the path back to point 0. */
  closed: boolean

  // Fill
  fillType: ShapeFillType
  /** Solid color, or first gradient stop. */
  fillColor: string
  /** Second gradient stop. */
  fillColor2: string
  /** 0–360 deg for linear gradient direction. */
  gradientAngle: number
  /** Data URL when fillType === 'image'. */
  imageSrc: string | null
  imageFit: ShapeImageFit
  /** 0–1 fill alpha. */
  fillOpacity: number
  /** When fillType === 'video', which asset to clip into the shape. */
  videoAssetId?: string | null
  videoSyncMode?: VideoSyncMode

  // Stroke
  strokeEnabled: boolean
  strokeColor: string
  /** 1–20 px. */
  strokeWidth: number
  /** 0–1 stroke alpha. */
  strokeOpacity: number

  // Transform
  /** Static rotation in degrees, 0–360. */
  rotation: number
  /** Auto-rotate speed deg/sec, -180..180. 0 = static. */
  rotationSpeed: number
  /** Multiplicative base scale, 0.1–3. */
  scale: number

  // Glow
  glowEnabled: boolean
  /** 0–100 shadowBlur for stroke + fill. */
  glowIntensity: number

  // Audio reactivity
  /** 0–1: bass adds to the scale on each beat. */
  bassPulse: number
  /** 0–1: mid energy adds to the stroke width. */
  strokePulse: number
}

export interface ShapeLayer {
  type: 'shape'
  config: ShapeLayerConfig
}

/**
 * Standalone Video Layer — draws a video to the canvas with fit /
 * transform controls. The asset itself lives in useVideoAssetStore; the
 * layer holds a pointer + per-layer playback settings.
 */
export type VideoFit = 'cover' | 'contain' | 'fill'

export interface VideoLayerConfig {
  videoAssetId: string | null
  syncMode: VideoSyncMode
  fit: VideoFit
  /** 0–1 — only used when fit !== 'fill'. */
  offsetX: number
  offsetY: number
  /** 0.1–3. */
  scale: number
  /** Degrees, 0–360. */
  rotation: number
  /** 0.25–2 — only used in 'loop' mode. */
  playbackRate: number
  /** Trim: seconds offset within source video. V1: simple start/end. */
  startTime: number
  endTime: number | null
}

export interface VideoLayer {
  type: 'video'
  config: VideoLayerConfig
}

export type LayerData =
  | BarsLayer
  | CircularLayer
  | WaveLayer
  | PolygonLayer
  | BloomLayer
  | ParticlesLayer
  | LogoLayer
  | FrameLayer
  | BackgroundLayer
  | TextLayer
  | ShapeLayer
  | VideoLayer

export interface LayerState {
  /** Unique across all layers. UUID in modern browsers, fallback for old. */
  id: string
  /** User-editable; auto-generated on add ("Circular", "Circular 2", …). */
  name: string
  enabled: boolean
  locked: boolean
  /** Lower = back, higher = front. */
  zOrder: number
  /** Wall-clock timestamp at creation, used as a stable tie-break for sort. */
  createdAt: number
  /**
   * 0–1 universal alpha multiplier applied via `ctx.globalAlpha` in the
   * render loop. Multiplies with any renderer-internal opacities
   * (Background.opacity, ShapeLayerConfig.fillOpacity, …) — so an
   * 80% layer carrying a 50% fill renders at 40% on-screen.
   */
  opacity: number
}

export type Layer = LayerData & LayerState

export const LAYER_LABELS: Record<LayerType, string> = {
  bars: 'Bars',
  circular: 'Circular',
  wave: 'Wave',
  polygon: 'Polygon',
  bloom: 'Bloom',
  particles: 'Particles',
  logo: 'Logo',
  frame: 'Frame',
  background: 'Background',
  text: 'Text',
  shape: 'Shape',
  video: 'Video',
}

export const LAYER_TYPES: readonly LayerType[] = [
  'background',
  'bars',
  'circular',
  'wave',
  'polygon',
  'bloom',
  'particles',
  'shape',
  'video',
  'logo',
  'text',
  'frame',
] as const

export const DEFAULT_LOGO_LAYER_CONFIG: LogoLayerConfig = {
  logoSize: 0.25,
  logoCropMode: 'square',
  position: { x: 0.5, y: 0.5 },
  autoLogoSync: true,
}

export const DEFAULT_BACKGROUND_CONFIG: BackgroundLayerConfig = {
  bgType: 'color',
  color: '#0a0a0a',
  color2: '#1a1a1a',
  gradientAngle: 135,
  imageSrc: null,
  imageFit: 'cover',
  blur: 0,
  opacity: 1,
}

export const DEFAULT_BLOOM_CONFIG: BloomConfig = {
  style: 'classic',
  baseRadius: 80,
  amplitudeScale: 1.5,
  pointCount: 128,
  smoothness: 0.6,
  echoCount: 4,
  echoSpacing: 25,
  echoFalloff: 0.7,
  echoMode: 'outward',
  echoRotationOffset: 0,
  rotation: 0,
  rotationSpeed: 0,
  lineWidth: 2,
  closedShape: true,
  colorStart: '#10b981',
  colorEnd: '#ec4899',
  palette: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
  glowEnabled: true,
  glowIntensity: 60,
  bassPulse: 0.25,
  bassSensitivity: 1,
  midSensitivity: 1,
  trebleSensitivity: 1,
  offsetX: 0.5,
  offsetY: 0.5,
  startFrequency: 0,
  endFrequency: 80,
  // Variant-specific defaults — only the matching variant reads them
  starPoints: 6,
  mirrorEchoCount: 4,
  ringCount: 5,
  variantRotationSpeed: 0.5,
  rainbow: false,
  echoShape: 'circle',
}

export const DEFAULT_VIDEO_CONFIG: VideoLayerConfig = {
  videoAssetId: null,
  syncMode: 'loop',
  fit: 'cover',
  offsetX: 0.5,
  offsetY: 0.5,
  scale: 1,
  rotation: 0,
  playbackRate: 1,
  startTime: 0,
  endTime: null,
}

export const DEFAULT_SHAPE_CONFIG: ShapeLayerConfig = {
  points: [],
  smoothness: 0,
  closed: true,
  fillType: 'color',
  fillColor: '#8b5cf6',
  fillColor2: '#3b82f6',
  gradientAngle: 135,
  imageSrc: null,
  imageFit: 'cover',
  fillOpacity: 1,
  strokeEnabled: true,
  strokeColor: '#ffffff',
  strokeWidth: 2,
  strokeOpacity: 1,
  rotation: 0,
  rotationSpeed: 0,
  scale: 1,
  glowEnabled: false,
  glowIntensity: 40,
  bassPulse: 0.15,
  strokePulse: 0,
}

export const DEFAULT_TEXT_CONFIG: TextLayerConfig = {
  text: '',
  font: 'Inter',
  fontWeight: 700,
  fontSize: 48,
  color: '#ffffff',
  x: 0.5,
  y: 0.5,
  letterSpacing: 0,
  shadowEnabled: true,
  shadowIntensity: 60,
  shadowColor: '#000000',
}

/**
 * Pick the next free name for a new layer of `type`. Uses the existing
 * names (case-insensitive) to avoid collisions so the first "Circular"
 * is just "Circular" and a second becomes "Circular 2".
 */
export function generateLayerName(
  type: LayerType,
  existingNames: string[],
): string {
  const base = LAYER_LABELS[type]
  const used = new Set(existingNames.map((n) => n.toLowerCase()))
  if (!used.has(base.toLowerCase())) return base
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base} ${i}`
    if (!used.has(candidate.toLowerCase())) return candidate
  }
  return `${base} ${Date.now()}`
}
