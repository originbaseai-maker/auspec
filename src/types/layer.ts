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
  | 'halo'
  | 'cinematic'
  | 'lyrics'

export type FontFamily =
  // Sans
  | 'Inter'
  | 'Montserrat'
  | 'Poppins'
  // Serif
  | 'Playfair Display'
  | 'Lora'
  // Display
  | 'Bebas Neue'
  | 'Anton'
  // Handwritten
  | 'Pacifico'
  | 'Caveat'
  // Mono
  | 'Space Mono'
  | 'JetBrains Mono'
  // Retro / Pixel
  | 'Press Start 2P'

/**
 * Categorisation used by the font picker. Order in each bucket is
 * the order the picker renders them. The picker reads this constant
 * directly; adding a new FontFamily member also needs an entry here.
 */
export const FONT_CATEGORIES: { label: string; fonts: FontFamily[] }[] = [
  { label: 'Sans', fonts: ['Inter', 'Montserrat', 'Poppins'] },
  { label: 'Serif', fonts: ['Playfair Display', 'Lora'] },
  { label: 'Display', fonts: ['Bebas Neue', 'Anton'] },
  { label: 'Handwritten', fonts: ['Pacifico', 'Caveat'] },
  { label: 'Mono', fonts: ['Space Mono', 'JetBrains Mono'] },
  { label: 'Retro', fonts: ['Press Start 2P'] },
]

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
   * Optional per-layer image. When set, the renderer prefers this
   * over `useCoverArtStore.logo` (the global shared logo). This is
   * what makes dropped-image-as-Logo per-preset: the layer config
   * snapshots with the preset, while the global cover-art store does
   * not. Object URL or data URL — either works for canvas drawImage.
   */
  imageSrc?: string | null
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
  bgType: 'color' | 'gradient' | 'image' | 'video' | 'transparent'
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
  /**
   * Public URL of a library video for 'video' bgType. Unlike
   * blob-URL uploads, library videos are hosted on Supabase Storage,
   * so the URL is STABLE across reloads and survives autosave — the
   * preset literally remembers which background was chosen.
   */
  videoSrc?: string | null
  /**
   * Catalog id of the chosen library video (background_videos.id).
   * Stored alongside the URL for reference / dedup / future "show
   * me the original title" UI. Optional — the renderer only needs
   * `videoSrc`.
   */
  videoLibraryId?: string | null
  /**
   * Optional poster image URL for the chosen video. Used as a
   * placeholder while the video loads so users don't stare at a
   * black canvas on first paint.
   */
  videoPosterSrc?: string | null
  /**
   * Toggle for the subtle bass-driven opacity + scale pulse. Off by
   * default — backgrounds that pump too hard fight the foreground
   * visualiser.
   */
  videoReactEnabled?: boolean
  /**
   * 0..1 strength multiplier on the pulse. The renderer scales the
   * default pulse range by this number, so 0 = no pulse, 1 = full
   * (still subtle — caps at ~4% scale and ~10% alpha swing).
   */
  videoReactIntensity?: number
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

  /**
   * Audio-reactive pulse — same bass-energy signal the visualisers
   * use (no parallel analyser). Off by default so existing presets
   * stay pixel-identical until the user opts in.
   */
  audioReactiveEnabled?: boolean
  /** 0..1. Default 0.5. Caps the visual scale swing at ~6%. */
  audioReactiveIntensity?: number

  /**
   * Outer glow — rendered via the shared `drawGlow` helper
   * ([src/lib/renderers/glow.ts](../lib/renderers/glow.ts)) using
   * an offscreen + GPU filter-blur, NOT ctx.shadowBlur. (shadowBlur
   * was just removed from Wave / Bloom Organic for performance —
   * reintroducing it on text would bring back the same stutter.)
   */
  glowEnabled?: boolean
  /** Visual blur radius in px. 0..60 typical. */
  glowIntensity?: number
  glowColor?: string

  /** Stroke / outline drawn around the glyphs. */
  outlineEnabled?: boolean
  outlineColor?: string
  /** 0–20 px. */
  outlineWidth?: number

  /**
   * Two-stop linear gradient fill. When enabled, replaces the solid
   * `color` fill. `color` is the first stop; `gradientColor2` is the
   * second.
   */
  gradientEnabled?: boolean
  gradientColor2?: string
  /** 0–360°. */
  gradientAngle?: number
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

  /**
   * Inner fill — only honoured on closed-area styles (Classic,
   * Organic, Aura, Star). Echo and MultiRing have no enclosed area
   * and the renderer skips fill regardless of these flags. Fields
   * are kept on the config across style switches so the user's fill
   * setup isn't lost when they hop to a non-fillable variant and
   * back. Mirrors the Circular/Polygon naming exactly.
   */
  videoFillEnabled?: boolean
  videoFillAssetId?: string | null
  videoFillSyncMode?: VideoSyncMode
  videoFillFit?: VideoFit
  imageFillEnabled?: boolean
  imageFillSrc?: string | null
  imageFillLogoLayerId?: string | null
  imageFillFit?: VideoFit
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

/**
 * Universal fill-source contract. Read-only view computed from each
 * container's specific fields (Shape uses `fillType`/`videoAssetId`/
 * `imageSrc`; Circular/Polygon use parallel `videoFill*` / `imageFill*`
 * fields). The discriminated union is the unifying surface — UI code
 * and bidirectional connection lookup branch on `kind` without
 * needing per-container knowledge.
 *
 * `none` covers the visual-only (stroke-only) case where no fill
 * pixels are drawn.
 */
export type FillKind = 'none' | 'color' | 'gradient' | 'video' | 'image'
export type FillFit = 'cover' | 'contain' | 'fill'

export type FillSource =
  | { kind: 'none' }
  | { kind: 'color'; color: string; opacity: number }
  | {
      kind: 'gradient'
      color: string
      color2: string
      angle: number
      opacity: number
    }
  | {
      kind: 'video'
      assetId: string
      fit: FillFit
      opacity: number
    }
  | {
      kind: 'image'
      /** Inline data-URL when no logoLayerId is set. */
      imageSrc: string | null
      /** Optional reference to a Logo layer — enables bidirectional connections. */
      logoLayerId: string | null
      fit: FillFit
      opacity: number
    }

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

/**
 * Halo — logo-centered, dramatic audio-reactive frame designed to
 * wrap around a Logo layer. Unlike Bloom, Halo has a "lockToLogo"
 * mode that auto-syncs position to the active Logo layer in real
 * time, so dragging the Logo on canvas drags the Halo with it.
 * Five visual styles (radial burst, spectrum crown, pulse frame,
 * flame, orbit) all share Halo's palette + sensitivity controls.
 */
export type HaloStyle =
  | 'radialBurst'
  | 'spectrumCrown'
  | 'pulseFrame'
  | 'flame'
  | 'orbit'

export type HaloFrameShape = 'circle' | 'roundedRect' | 'square'
export type HaloFlameDirection = 'up' | 'all'

export interface HaloLayerConfig {
  style: HaloStyle
  /** Center position 0–1 (used when lockToLogo is false). */
  offsetX: number
  offsetY: number
  /** When true, draw-frame reads the Logo layer position instead of
   *  offsetX/Y. Falls back to offsetX/Y when no Logo exists. */
  lockToLogo: boolean
  /** Base radius in px from the center. */
  baseRadius: number
  /** Colour palette. Resolved through colorStart/colorEnd if unset. */
  palette?: string[]
  colorStart: string
  colorEnd: string
  /** Per-band sensitivity multipliers, 0–2 (slider shows 0–200%). */
  bassSensitivity: number
  midSensitivity: number
  trebleSensitivity: number
  /** Static rotation offset in degrees. */
  rotation: number
  /** Outer shadow blur in px, 0–100. */
  glowEnabled: boolean
  glowIntensity: number
  // Style-specific (only the matching style's renderer reads each):
  /** 'radialBurst' — number of rays, 12–48. */
  rayCount?: number
  /** 'spectrumCrown' — number of spectrum bars, 32–128. */
  barCount?: number
  /** 'pulseFrame' — stroke width baseline px, 2–30. */
  frameThickness?: number
  /** 'pulseFrame' — geometry of the frame. */
  frameShape?: HaloFrameShape
  /** 'flame' — number of flame tongues, 6–24. */
  flameCount?: number
  /** 'flame' — tongues all radiate outward or all point up. */
  flameDirection?: HaloFlameDirection
  /** 'orbit' — particles on the orbital path, 6–30. */
  orbitCount?: number
  /** 'orbit' — orbit speed in rev/sec, -2..2. */
  orbitSpeed?: number

  /**
   * Inner fill — only honoured on closed-area styles (PulseFrame).
   * The other styles (RadialBurst, SpectrumCrown, Flame, Orbit) are
   * open shapes — rays / bars / particles — and the renderer skips
   * fill regardless of these flags. Fields persist across style
   * switches so the user's fill setup survives style hopping.
   */
  videoFillEnabled?: boolean
  videoFillAssetId?: string | null
  videoFillSyncMode?: VideoSyncMode
  videoFillFit?: VideoFit
  imageFillEnabled?: boolean
  imageFillSrc?: string | null
  imageFillLogoLayerId?: string | null
  imageFillFit?: VideoFit
}

export interface HaloLayer {
  type: 'halo'
  config: HaloLayerConfig
}

/**
 * Cinematic — post-processing overlay applied LAST in the layer
 * loop. Two effects combine to break the "flat digital" look:
 *   - Vignette: radial-gradient darkening at the edges
 *   - Film grain: animated noise via pre-rendered tiles
 *
 * Sensible defaults are intentionally subtle so a one-tap add reads
 * as "cinematic depth," not "broken TV." Tuning is in CinematicPanel.
 */
export interface CinematicConfig {
  // Vignette
  vignetteEnabled: boolean
  /** 0..1; alpha of the gradient's outer stop (how dark the corners go). */
  vignetteIntensity: number
  /** 0..1; how far the clear centre extends, as fraction of half-min-dim. */
  vignetteSize: number
  /** 0..1; feather between clear centre and full darkness. */
  vignetteSoftness: number
  /** Tint colour for the vignette darkening (default '#000000'). */
  vignetteColor: string

  // Film Grain
  grainEnabled: boolean
  /** 0..0.3 typical; alpha at which the grain tile composites. */
  grainIntensity: number
  /** 0..1; fine ↔ coarse (drives pixel block size in the noise tiles). */
  grainSize: number
  /** 0..1; how often the active tile rotates (still ↔ fast shimmer). */
  grainSpeed: number
}

export interface CinematicLayer {
  type: 'cinematic'
  config: CinematicConfig
}

/**
 * One karaoke line. `time` is seconds on the master clock at which
 * the line becomes the "active" line; null means the line hasn't
 * been synced yet. `text` is the line as the user typed it; an
 * empty string is allowed and represents an explicit instrumental
 * gap (renders nothing for that interval but still consumes a
 * timestamp slot so the user can sync the gap explicitly).
 */
export interface LyricsLine {
  time: number | null
  text: string
}

/**
 * Karaoke / synced-lyrics layer. The data is a list of timed lines;
 * styling reuses the Text layer's vocabulary (font, glow, outline,
 * gradient, audio-reactive pulse) via the shared drawStyledText
 * helper so karaoke text honours the same effects.
 *
 * Two display modes:
 *   - 'spotlight': one or three lines centred on the canvas, the
 *     "current" line large + bright, optional dimmed previous /
 *     next around it. The classic music-video lyric look.
 *   - 'scroll': a vertical stack of lines that scrolls so the
 *     current line sits at the layer's anchor. Older / newer
 *     lines fade out by distance.
 */
export type LyricsDisplayMode = 'spotlight' | 'scroll'

/**
 * Per-line entrance animation. All variants share the same window
 * (driven by `fadeSec`) so the animation always finishes by the
 * time the cross-fade hands over to the next line. Drives off the
 * master clock — identical timing in preview and export.
 *
 *   - 'none' — no extra animation; only the existing cross-fade
 *     opacity ramp. Default for every new and migrated project.
 *   - 'fade' — explicit fade-in (visually equivalent to 'none' at
 *     the same fadeSec; semantic choice for users who want the
 *     setting to read as a deliberate effect).
 *   - 'slide-up' — line starts ~0.5×fontSize below the anchor and
 *     rises into position over the window.
 *   - 'scale' — line starts at 85 % of its target font size and
 *     grows to 100 %.
 *   - 'blur' — line starts ~6 px gaussian-blurred and sharpens to
 *     focus. Uses ctx.filter (GPU) so it composites over the existing
 *     drawGlow halo without a second offscreen pass.
 */
export type LyricsEntrance = 'none' | 'fade' | 'slide-up' | 'scale' | 'blur'

export interface LyricsLayerConfig {
  /** Ordered list of timed lines. time=null = not yet synced. */
  lines: LyricsLine[]
  displayMode: LyricsDisplayMode

  // ----- Typography (shared vocabulary with TextLayerConfig) -----
  font: FontFamily
  fontWeight: 400 | 600 | 700
  /** 12–120. */
  fontSize: number
  color: string
  /** 0–1 horizontal centre — where the "current" line lands. */
  x: number
  /** 0–1 vertical centre — where the "current" line lands. */
  y: number
  /** -2 to 10 px. */
  letterSpacing: number
  shadowEnabled: boolean
  shadowIntensity: number
  shadowColor: string

  // ----- Effects (parallels TextLayerConfig) -----
  glowEnabled?: boolean
  glowIntensity?: number
  glowColor?: string
  outlineEnabled?: boolean
  outlineColor?: string
  outlineWidth?: number
  gradientEnabled?: boolean
  gradientColor2?: string
  gradientAngle?: number

  /** Pulse the active line with bass energy. */
  audioReactiveEnabled?: boolean
  audioReactiveIntensity?: number

  // ----- Karaoke-specific -----
  /**
   * Legacy combined toggle: show BOTH the previous and the next line
   * around the active one. Superseded by `showPrevLine` /
   * `showNextLine` (independent) — kept on the type for migration so
   * old saves with `spotlightContext: false` still hide both
   * neighbours after reload. New writes go to the split fields only;
   * the renderer's `resolveShowPrev` / `resolveShowNext` derive from
   * either source.
   */
  spotlightContext?: boolean
  /** Show the previously-sung line above the active one. Default true. */
  showPrevLine?: boolean
  /** Show the upcoming line below the active one. Default true. */
  showNextLine?: boolean
  /**
   * Number of lines visible above and below the active line in
   * 'scroll' mode. Higher = more karaoke-prompter feel, lower =
   * more cinematic single-line emphasis.
   */
  scrollVisibleLines?: number
  /**
   * Seconds of cross-fade between adjacent lines. 0 = hard cut;
   * 0.2 (default) reads as a gentle hand-off without feeling slow.
   * Also drives the per-line entrance animation window.
   */
  fadeSec?: number

  /**
   * Per-line entrance animation. Default 'none' — projects created
   * before this field existed render identically.
   */
  entrance?: LyricsEntrance
}

export interface LyricsLayer {
  type: 'lyrics'
  config: LyricsLayerConfig
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
  | HaloLayer
  | CinematicLayer
  | LyricsLayer

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
  halo: 'Halo',
  cinematic: 'Cinematic',
  lyrics: 'Lyrics',
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
  'lyrics',
  'frame',
  'halo',
  'cinematic',
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

export const DEFAULT_HALO_CONFIG: HaloLayerConfig = {
  style: 'radialBurst',
  offsetX: 0.5,
  offsetY: 0.5,
  lockToLogo: true,
  baseRadius: 140,
  palette: ['#a855f7', '#ec4899', '#f97316'],
  colorStart: '#a855f7',
  colorEnd: '#f97316',
  bassSensitivity: 1,
  midSensitivity: 1,
  trebleSensitivity: 1,
  rotation: 0,
  glowEnabled: true,
  glowIntensity: 40,
  rayCount: 24,
  barCount: 64,
  frameThickness: 8,
  frameShape: 'circle',
  flameCount: 12,
  flameDirection: 'all',
  orbitCount: 16,
  orbitSpeed: 0.4,
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

/**
 * Defaults aim for "instant cinematic depth on a flat scene." Vignette
 * is moderate-but-visible; grain is deliberately barely-there so the
 * one-tap addition reads as filmic, not as TV static.
 */
export const DEFAULT_CINEMATIC_CONFIG: CinematicConfig = {
  vignetteEnabled: true,
  vignetteIntensity: 0.5,
  vignetteSize: 0.6,
  vignetteSoftness: 0.7,
  vignetteColor: '#000000',
  grainEnabled: true,
  grainIntensity: 0.08,
  grainSize: 0.5,
  grainSpeed: 0.5,
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

  // New effect / reactivity fields — all OFF by default so the look
  // of every existing preset is preserved exactly.
  audioReactiveEnabled: false,
  audioReactiveIntensity: 0.5,
  glowEnabled: false,
  glowIntensity: 24,
  glowColor: '#ffffff',
  outlineEnabled: false,
  outlineColor: '#000000',
  outlineWidth: 2,
  gradientEnabled: false,
  gradientColor2: '#3b82f6',
  gradientAngle: 90,
}

/**
 * Lyrics default. Empty `lines` so the panel opens with a friendly
 * paste textarea instead of a stale demo. Effects OFF so the layer
 * adds cleanly to existing projects without changing their look.
 * fontSize 56 and y=0.78 land the spotlight in the bottom third —
 * the music-video convention.
 */
export const DEFAULT_LYRICS_CONFIG: LyricsLayerConfig = {
  lines: [],
  displayMode: 'spotlight',

  font: 'Inter',
  fontWeight: 700,
  fontSize: 56,
  color: '#ffffff',
  x: 0.5,
  y: 0.78,
  letterSpacing: 0,
  shadowEnabled: true,
  shadowIntensity: 70,
  shadowColor: '#000000',

  glowEnabled: false,
  glowIntensity: 24,
  glowColor: '#ffffff',
  outlineEnabled: false,
  outlineColor: '#000000',
  outlineWidth: 2,
  gradientEnabled: false,
  gradientColor2: '#3b82f6',
  gradientAngle: 90,

  audioReactiveEnabled: false,
  audioReactiveIntensity: 0.4,

  spotlightContext: true,
  showPrevLine: true,
  showNextLine: true,
  scrollVisibleLines: 2,
  fadeSec: 0.2,
  entrance: 'none',
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
