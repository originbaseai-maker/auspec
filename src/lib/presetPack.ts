/**
 * Preset Pack — 8 curated one-tap looks that combine a Background
 * Library video + a waveform visualiser + effect layers + a colour
 * palette into something polished. These are the entry point for
 * brand-new users: open AuSpec, tap a preset, see something
 * impressive before configuring anything.
 *
 * Each entry references the BG video by its storage path inside the
 * `background-videos` bucket. At apply time:
 *   1. The path is resolved to a public URL synchronously via
 *      `resolveBackgroundVideoUrl`.
 *   2. The Background layer's `videoSrc` gets the URL, while the
 *      same layer's `color` / `color2` / `gradientAngle` are tuned
 *      to the preset palette as a graceful fallback. If the video
 *      is missing (catalog not seeded yet, URL 404s, slow load),
 *      the renderer paints the gradient instead — the preset still
 *      looks intentional, just less rich.
 *
 * Every preset ships placeholder Logo + Text layers, pre-positioned
 * and pre-styled. They render as subtle hints until the user uploads
 * a logo / edits the text — no dangling broken slots.
 */

import type {
  BackgroundLayerConfig,
  BloomConfig,
  CinematicConfig,
  HaloLayerConfig,
  Layer,
  LogoLayerConfig,
  TextLayerConfig,
} from '@/types/layer'
import type { LinearBarsConfig } from '@/lib/renderers/linearBars'
import type { CircularSpectrumConfig } from '@/lib/renderers/circularSpectrum'
import type { WaveConfig } from '@/lib/renderers/wave'
import type { ParticleConfig } from '@/store/useParticleStore'
import { resolveBackgroundVideoUrl } from '@/lib/backgroundLibrary'
import type { Preset } from '@/lib/presets'

type LayerStateOverrides = {
  id: string
  name: string
  zOrder: number
  opacity?: number
  enabled?: boolean
}

/**
 * Stamp the common LayerState fields on a layer config. createdAt
 * uses the preset id-based hash so apply order is stable across
 * reloads.
 */
function withState<T extends Layer['type']>(
  type: T,
  config: Extract<Layer, { type: T }>['config'],
  s: LayerStateOverrides,
): Layer {
  return {
    id: s.id,
    name: s.name,
    enabled: s.enabled ?? true,
    locked: false,
    zOrder: s.zOrder,
    createdAt: 0, // deterministic — replaceLayers preserves stack order
    opacity: s.opacity ?? 1,
    type,
    config,
    // The discriminated-union narrowing requires the literal `type`
    // string to match the config shape; cast at the boundary.
  } as Layer
}

/**
 * Background layer with a library video + gradient fallback bundled
 * into one config. The renderer paints the gradient any time the
 * video isn't ready (loading, missing, 404), so the preset always
 * has SOMETHING on the canvas matching the palette.
 */
function backgroundLayer(opts: {
  id: string
  name: string
  videoPath: string
  fallbackColorA: string
  fallbackColorB: string
  fallbackAngle: number
  videoReact: boolean
  videoReactIntensity?: number
}): Layer {
  const config: BackgroundLayerConfig = {
    bgType: 'video',
    color: opts.fallbackColorA,
    color2: opts.fallbackColorB,
    gradientAngle: opts.fallbackAngle,
    imageSrc: null,
    imageFit: 'cover',
    blur: 0,
    opacity: 1,
    videoSrc: resolveBackgroundVideoUrl(opts.videoPath),
    videoLibraryId: null,
    videoPosterSrc: null,
    videoReactEnabled: opts.videoReact,
    videoReactIntensity: opts.videoReactIntensity ?? 0.45,
  }
  return withState('background', config, {
    id: opts.id,
    name: opts.name,
    zOrder: 0,
  })
}

/**
 * Placeholder Logo layer — pre-positioned + pre-sized. The image is
 * null so the renderer falls back to a subtle ring outline (the
 * existing "logo empty" affordance), inviting the user to upload.
 * When they do, it inherits the position + size from the preset.
 */
function logoPlaceholder(opts: {
  id: string
  name: string
  zOrder: number
  position: { x: number; y: number }
  size: number
}): Layer {
  const config: LogoLayerConfig = {
    logoSize: opts.size,
    logoCropMode: 'square',
    position: { ...opts.position },
    autoLogoSync: false,
    imageSrc: null,
    videoAssetId: null,
    videoSyncMode: 'loop',
  }
  return withState('logo', config, {
    id: opts.id,
    name: opts.name,
    zOrder: opts.zOrder,
  })
}

function textPlaceholder(opts: {
  id: string
  name: string
  zOrder: number
  text: string
  font: TextLayerConfig['font']
  fontWeight: TextLayerConfig['fontWeight']
  fontSize: number
  color: string
  x: number
  y: number
  letterSpacing?: number
  shadowEnabled?: boolean
  shadowIntensity?: number
}): Layer {
  const config: TextLayerConfig = {
    text: opts.text,
    font: opts.font,
    fontWeight: opts.fontWeight,
    fontSize: opts.fontSize,
    color: opts.color,
    x: opts.x,
    y: opts.y,
    letterSpacing: opts.letterSpacing ?? 0,
    shadowEnabled: opts.shadowEnabled ?? true,
    shadowIntensity: opts.shadowIntensity ?? 65,
    shadowColor: '#000000',
  }
  return withState('text', config, {
    id: opts.id,
    name: opts.name,
    zOrder: opts.zOrder,
  })
}

function cinematicLayer(opts: {
  id: string
  zOrder: number
  vignetteIntensity?: number
  grainIntensity?: number
  vignetteColor?: string
}): Layer {
  const config: CinematicConfig = {
    vignetteEnabled: true,
    vignetteIntensity: opts.vignetteIntensity ?? 0.45,
    vignetteSize: 0.65,
    vignetteSoftness: 0.7,
    vignetteColor: opts.vignetteColor ?? '#000000',
    grainEnabled: true,
    grainIntensity: opts.grainIntensity ?? 0.06,
    grainSize: 0.5,
    grainSpeed: 0.45,
  }
  return withState('cinematic', config, {
    id: opts.id,
    name: 'Cinematic',
    zOrder: opts.zOrder,
  })
}

/**
 * Bars across the bottom — mirrorMode=false makes them grow upward
 * from the canvas baseline, matching the spec's "bars along the
 * bottom" feel.
 */
function bottomBarsLayer(opts: {
  id: string
  name: string
  zOrder: number
  colorStart: string
  colorEnd: string
  palette?: string[]
  barCount?: number
  barGap?: number
  glowIntensity?: number
}): Layer {
  const config: LinearBarsConfig = {
    barCount: opts.barCount ?? 80,
    barGap: opts.barGap ?? 2,
    minBarHeight: 2,
    colorStart: opts.colorStart,
    colorEnd: opts.colorEnd,
    palette: opts.palette,
    glowEnabled: true,
    glowIntensity: opts.glowIntensity ?? 14,
    mirrorMode: false,
    smoothing: 0.18,
    displayMode: 'digital',
    dotSize: 4,
    hueInterpolation: 0,
    startFrequency: 20,
    endFrequency: 20000,
    sideMode: 'both',
    bassSensitivity: 1.1,
    midSensitivity: 1,
    trebleSensitivity: 1,
  }
  return withState('bars', config, {
    id: opts.id,
    name: opts.name,
    zOrder: opts.zOrder,
  })
}

// =====================================================================
// THE 8 PRESETS
// =====================================================================

function synthwaveSunset(): Preset {
  const layers: Layer[] = [
    backgroundLayer({
      id: 'pp-synthwave-bg',
      name: 'Synthwave BG',
      videoPath: 'videos/synthwave/synthwave-grid.mp4',
      fallbackColorA: '#1a0033',
      fallbackColorB: '#ff2db4',
      fallbackAngle: 180,
      videoReact: true,
      videoReactIntensity: 0.35,
    }),
    bottomBarsLayer({
      id: 'pp-synthwave-bars',
      name: 'Synthwave Bars',
      zOrder: 1,
      colorStart: '#ff2db4',
      colorEnd: '#3bd4ff',
      palette: ['#ff2db4', '#a855f7', '#3bd4ff'],
      glowIntensity: 18,
    }),
    textPlaceholder({
      id: 'pp-synthwave-title',
      name: 'Title',
      zOrder: 2,
      text: 'YOUR TITLE',
      font: 'Bebas Neue',
      fontWeight: 700,
      fontSize: 72,
      color: '#ff2db4',
      x: 0.5,
      y: 0.22,
      letterSpacing: 6,
      shadowIntensity: 80,
    }),
    cinematicLayer({
      id: 'pp-synthwave-cine',
      zOrder: 3,
      vignetteIntensity: 0.4,
      grainIntensity: 0.05,
      vignetteColor: '#1a0033',
    }),
  ]
  return {
    id: 'pack-synthwave-sunset',
    name: 'Synthwave Sunset',
    description: 'Retro grid + magenta bars',
    visualType: 'bars',
    config: {},
    backgroundColor: '#1a0033',
    sensitivity: 80,
    layers,
    activeLayerId: 'pp-synthwave-bars',
  }
}

function cyberpunkAnthem(): Preset {
  const halo: HaloLayerConfig = {
    style: 'pulseFrame',
    offsetX: 0.5,
    offsetY: 0.48,
    lockToLogo: true,
    baseRadius: 180,
    palette: ['#00d4ff', '#ff2db4'],
    colorStart: '#00d4ff',
    colorEnd: '#ff2db4',
    bassSensitivity: 1.2,
    midSensitivity: 1,
    trebleSensitivity: 1,
    rotation: 0,
    glowEnabled: true,
    glowIntensity: 55,
    frameThickness: 10,
    frameShape: 'circle',
  }
  const layers: Layer[] = [
    backgroundLayer({
      id: 'pp-cyberpunk-bg',
      name: 'Cyberpunk BG',
      videoPath: 'videos/cyberpunk/neon-drive.mp4',
      fallbackColorA: '#020014',
      fallbackColorB: '#ff2db4',
      fallbackAngle: 200,
      videoReact: true,
      videoReactIntensity: 0.4,
    }),
    bottomBarsLayer({
      id: 'pp-cyberpunk-bars',
      name: 'Cyberpunk Bars',
      zOrder: 1,
      colorStart: '#00d4ff',
      colorEnd: '#ff2db4',
      palette: ['#00d4ff', '#a855f7', '#ff2db4'],
      glowIntensity: 18,
    }),
    withState('halo', halo, {
      id: 'pp-cyberpunk-halo',
      name: 'Cyberpunk Halo',
      zOrder: 2,
    }),
    logoPlaceholder({
      id: 'pp-cyberpunk-logo',
      name: 'Logo',
      zOrder: 3,
      position: { x: 0.5, y: 0.48 },
      size: 0.22,
    }),
    textPlaceholder({
      id: 'pp-cyberpunk-text',
      name: 'Title',
      zOrder: 4,
      text: 'YOUR TITLE',
      font: 'Bebas Neue',
      fontWeight: 700,
      fontSize: 48,
      color: '#00d4ff',
      x: 0.5,
      y: 0.72,
      letterSpacing: 4,
    }),
  ]
  return {
    id: 'pack-cyberpunk-anthem',
    name: 'Cyberpunk Anthem',
    description: 'Neon drive + halo logo',
    visualType: 'bars',
    config: {},
    backgroundColor: '#020014',
    sensitivity: 85,
    layers,
    activeLayerId: 'pp-cyberpunk-bars',
  }
}

function deepSpace(): Preset {
  const circular: CircularSpectrumConfig = {
    radius: 200,
    innerRadius: 95,
    barCount: 128,
    colorStart: '#4a90ff',
    colorEnd: '#e0eaff',
    palette: ['#4a90ff', '#90b8ff', '#e0eaff'],
    glowEnabled: true,
    glowIntensity: 16,
    rotation: 0,
    smoothing: 0.18,
    bassPulse: true,
    hueInterpolation: 0,
    startFrequency: 20,
    endFrequency: 20000,
    sideMode: 'both',
    offsetX: 0.5,
    offsetY: 0.5,
  }
  const layers: Layer[] = [
    backgroundLayer({
      id: 'pp-deepspace-bg',
      name: 'Space BG',
      videoPath: 'videos/space/asteroid-drift-cosmic-blue.mp4',
      fallbackColorA: '#02061a',
      fallbackColorB: '#0c1a4a',
      fallbackAngle: 135,
      videoReact: true,
      videoReactIntensity: 0.3,
    }),
    withState('circular', circular, {
      id: 'pp-deepspace-circ',
      name: 'Spectrum',
      zOrder: 1,
    }),
    logoPlaceholder({
      id: 'pp-deepspace-logo',
      name: 'Logo',
      zOrder: 2,
      position: { x: 0.5, y: 0.5 },
      size: 0.18,
    }),
    textPlaceholder({
      id: 'pp-deepspace-text',
      name: 'Title',
      zOrder: 3,
      text: 'Your Title',
      font: 'Playfair Display',
      fontWeight: 400,
      fontSize: 40,
      color: '#e0eaff',
      x: 0.5,
      y: 0.86,
      letterSpacing: 3,
      shadowIntensity: 50,
    }),
    cinematicLayer({
      id: 'pp-deepspace-cine',
      zOrder: 4,
      vignetteIntensity: 0.55,
      grainIntensity: 0.04,
    }),
  ]
  return {
    id: 'pack-deep-space',
    name: 'Deep Space',
    description: 'Cosmic blue + circular spectrum',
    visualType: 'circular',
    config: {},
    backgroundColor: '#02061a',
    sensitivity: 75,
    layers,
    activeLayerId: 'pp-deepspace-circ',
  }
}

function cosmicAurora(): Preset {
  const bloom: BloomConfig = {
    style: 'organic',
    baseRadius: 130,
    amplitudeScale: 1.8,
    pointCount: 160,
    smoothness: 0.85,
    echoCount: 3,
    echoSpacing: 28,
    echoFalloff: 0.65,
    echoMode: 'outward',
    echoRotationOffset: 6,
    rotation: 0,
    rotationSpeed: 4,
    lineWidth: 2,
    closedShape: true,
    colorStart: '#30dca0',
    colorEnd: '#80f0d0',
    palette: ['#30dca0', '#80f0d0', '#b0ffe8'],
    glowEnabled: true,
    glowIntensity: 70,
    bassPulse: 0.3,
    bassSensitivity: 1.1,
    midSensitivity: 1,
    trebleSensitivity: 1,
    offsetX: 0.5,
    offsetY: 0.5,
    startFrequency: 0,
    endFrequency: 80,
  }
  const particles: ParticleConfig = {
    enabled: true,
    shape: 'spark',
    motion: 'float',
    density: 60,
    size: 2,
    speed: 0.6,
    lifespan: 3.5,
    fadeOut: true,
    glowEnabled: true,
    glowIntensity: 60,
    palette: ['#30dca0', '#80f0d0', '#b0ffe8'],
    useVisualizerPalette: false,
    beatReactive: true,
    beatBurstAmount: 20,
    beatSizeMultiplier: 1.4,
    gravity: -0.05,
    friction: 0.98,
    spread: 60,
  }
  const layers: Layer[] = [
    backgroundLayer({
      id: 'pp-aurora-bg',
      name: 'Aurora BG',
      videoPath: 'videos/space/asteroid-drift-aurora-green.mp4',
      fallbackColorA: '#001a14',
      fallbackColorB: '#30dca0',
      fallbackAngle: 200,
      videoReact: true,
      videoReactIntensity: 0.3,
    }),
    withState('bloom', bloom, {
      id: 'pp-aurora-bloom',
      name: 'Aurora Bloom',
      zOrder: 1,
    }),
    withState('particles', particles, {
      id: 'pp-aurora-particles',
      name: 'Sparkles',
      zOrder: 2,
    }),
    textPlaceholder({
      id: 'pp-aurora-text',
      name: 'Title',
      zOrder: 3,
      text: 'Your Title',
      font: 'Playfair Display',
      fontWeight: 400,
      fontSize: 42,
      color: '#b0ffe8',
      x: 0.5,
      y: 0.86,
      letterSpacing: 3,
      shadowIntensity: 55,
    }),
  ]
  return {
    id: 'pack-cosmic-aurora',
    name: 'Cosmic Aurora',
    description: 'Aurora green organic bloom',
    visualType: 'circular',
    config: {},
    backgroundColor: '#001a14',
    sensitivity: 70,
    layers,
    activeLayerId: 'pp-aurora-bloom',
  }
}

function inferno(): Preset {
  const halo: HaloLayerConfig = {
    style: 'flame',
    offsetX: 0.5,
    offsetY: 0.48,
    lockToLogo: true,
    baseRadius: 150,
    palette: ['#ff7a30', '#ffcc40', '#ff3020'],
    colorStart: '#ff7a30',
    colorEnd: '#ff3020',
    bassSensitivity: 1.3,
    midSensitivity: 1,
    trebleSensitivity: 0.9,
    rotation: 0,
    glowEnabled: true,
    glowIntensity: 70,
    flameCount: 14,
    flameDirection: 'all',
  }
  const layers: Layer[] = [
    backgroundLayer({
      id: 'pp-inferno-bg',
      name: 'Inferno BG',
      videoPath: 'videos/fire/ember-drift.mp4',
      fallbackColorA: '#1a0500',
      fallbackColorB: '#ff3020',
      fallbackAngle: 0,
      videoReact: true,
      videoReactIntensity: 0.45,
    }),
    bottomBarsLayer({
      id: 'pp-inferno-bars',
      name: 'Inferno Bars',
      zOrder: 1,
      colorStart: '#ffcc40',
      colorEnd: '#ff3020',
      palette: ['#ffcc40', '#ff7a30', '#ff3020'],
      glowIntensity: 18,
      barCount: 72,
    }),
    withState('halo', halo, {
      id: 'pp-inferno-halo',
      name: 'Flame Halo',
      zOrder: 2,
    }),
    logoPlaceholder({
      id: 'pp-inferno-logo',
      name: 'Logo',
      zOrder: 3,
      position: { x: 0.5, y: 0.48 },
      size: 0.2,
    }),
    textPlaceholder({
      id: 'pp-inferno-text',
      name: 'Title',
      zOrder: 4,
      text: 'YOUR TITLE',
      font: 'Bebas Neue',
      fontWeight: 700,
      fontSize: 52,
      color: '#ffcc40',
      x: 0.5,
      y: 0.75,
      letterSpacing: 5,
    }),
    cinematicLayer({
      id: 'pp-inferno-cine',
      zOrder: 5,
      vignetteIntensity: 0.5,
      grainIntensity: 0.08,
      vignetteColor: '#1a0500',
    }),
  ]
  return {
    id: 'pack-inferno',
    name: 'Inferno',
    description: 'Embers + flame halo logo',
    visualType: 'bars',
    config: {},
    backgroundColor: '#1a0500',
    sensitivity: 85,
    layers,
    activeLayerId: 'pp-inferno-bars',
  }
}

function retroArcade(): Preset {
  const layers: Layer[] = [
    backgroundLayer({
      id: 'pp-arcade-bg',
      name: 'Arcade BG',
      videoPath: 'videos/retro/pixel-pursuit.mp4',
      fallbackColorA: '#000028',
      fallbackColorB: '#2121de',
      fallbackAngle: 180,
      videoReact: true,
      videoReactIntensity: 0.25,
    }),
    bottomBarsLayer({
      id: 'pp-arcade-bars',
      name: 'Arcade Bars',
      zOrder: 1,
      colorStart: '#ffe050',
      colorEnd: '#ffa020',
      palette: ['#ffe050', '#ffa020', '#ff4040'],
      // Chunky bars: large gaps, low count → blocky pixel feel
      barCount: 32,
      barGap: 8,
      glowIntensity: 10,
    }),
    textPlaceholder({
      id: 'pp-arcade-text',
      name: 'Title',
      zOrder: 2,
      text: 'INSERT COIN',
      font: 'Space Mono',
      fontWeight: 700,
      fontSize: 56,
      color: '#ffe050',
      x: 0.5,
      y: 0.2,
      letterSpacing: 4,
      shadowIntensity: 80,
    }),
  ]
  return {
    id: 'pack-retro-arcade',
    name: 'Retro Arcade',
    description: 'Pac-Man yellow + chunky bars',
    visualType: 'bars',
    config: {},
    backgroundColor: '#000028',
    sensitivity: 75,
    layers,
    activeLayerId: 'pp-arcade-bars',
  }
}

function winterDream(): Preset {
  const wave: WaveConfig = {
    colorStart: '#a0e0ff',
    colorEnd: '#80ffd0',
    palette: ['#a0e0ff', '#e0f4ff', '#80ffd0'],
    lineThickness: 3,
    glowEnabled: true,
    glowIntensity: 12,
    filled: true,
    smoothing: 0.4,
    mirrorMode: false,
    hueInterpolation: 0,
    startFrequency: 20,
    endFrequency: 20000,
  }
  const layers: Layer[] = [
    backgroundLayer({
      id: 'pp-winter-bg',
      name: 'Winter BG',
      videoPath: 'videos/nature/aurora-snowfall.mp4',
      fallbackColorA: '#0a1830',
      fallbackColorB: '#a0e0ff',
      fallbackAngle: 200,
      videoReact: true,
      videoReactIntensity: 0.25,
    }),
    withState('wave', wave, {
      id: 'pp-winter-wave',
      name: 'Winter Wave',
      zOrder: 1,
      opacity: 0.85,
    }),
    logoPlaceholder({
      id: 'pp-winter-logo',
      name: 'Logo',
      zOrder: 2,
      position: { x: 0.5, y: 0.42 },
      size: 0.18,
    }),
    textPlaceholder({
      id: 'pp-winter-text',
      name: 'Title',
      zOrder: 3,
      text: 'Your Title',
      font: 'Playfair Display',
      fontWeight: 400,
      fontSize: 42,
      color: '#e0f4ff',
      x: 0.5,
      y: 0.86,
      letterSpacing: 3,
      shadowIntensity: 45,
    }),
    cinematicLayer({
      id: 'pp-winter-cine',
      zOrder: 4,
      vignetteIntensity: 0.35,
      grainIntensity: 0.03,
      vignetteColor: '#0a1830',
    }),
  ]
  return {
    id: 'pack-winter-dream',
    name: 'Winter Dream',
    description: 'Aurora snowfall + soft wave',
    visualType: 'wave',
    config: {},
    backgroundColor: '#0a1830',
    sensitivity: 60,
    layers,
    activeLayerId: 'pp-winter-wave',
  }
}

function springMorning(): Preset {
  const wave: WaveConfig = {
    colorStart: '#ffd060',
    colorEnd: '#b0e080',
    palette: ['#ffd060', '#fff0c0', '#b0e080'],
    lineThickness: 3,
    glowEnabled: true,
    glowIntensity: 10,
    filled: true,
    smoothing: 0.45,
    mirrorMode: false,
    hueInterpolation: 0,
    startFrequency: 20,
    endFrequency: 20000,
  }
  const layers: Layer[] = [
    backgroundLayer({
      id: 'pp-spring-bg',
      name: 'Spring BG',
      videoPath: 'videos/nature/spring-pollen.mp4',
      fallbackColorA: '#fff0c0',
      fallbackColorB: '#b0e080',
      fallbackAngle: 200,
      videoReact: true,
      videoReactIntensity: 0.25,
    }),
    withState('wave', wave, {
      id: 'pp-spring-wave',
      name: 'Spring Wave',
      zOrder: 1,
      opacity: 0.85,
    }),
    textPlaceholder({
      id: 'pp-spring-text',
      name: 'Title',
      zOrder: 2,
      text: 'Your Title',
      font: 'Playfair Display',
      fontWeight: 400,
      fontSize: 44,
      color: '#3a2a10',
      x: 0.5,
      y: 0.22,
      letterSpacing: 2,
      shadowEnabled: false,
    }),
  ]
  return {
    id: 'pack-spring-morning',
    name: 'Spring Morning',
    description: 'Pollen drift + warm wave',
    visualType: 'wave',
    config: {},
    backgroundColor: '#fff0c0',
    sensitivity: 60,
    layers,
    activeLayerId: 'pp-spring-wave',
  }
}

/**
 * The 8-pack, in display order. Order matters — appears first in the
 * "All Presets" list and is what new users see at the top of the
 * curated picks.
 */
export const PRESET_PACK: Preset[] = [
  synthwaveSunset(),
  cyberpunkAnthem(),
  deepSpace(),
  cosmicAurora(),
  inferno(),
  retroArcade(),
  winterDream(),
  springMorning(),
]

/**
 * Lookup from preset id → the storage path of its background video.
 * The PresetDot uses this to fetch a thumbnail URL out of the
 * loaded catalog without re-walking the layer stack.
 */
export const PRESET_BG_VIDEO_PATH: Record<string, string> = {
  'pack-synthwave-sunset': 'videos/synthwave/synthwave-grid.mp4',
  'pack-cyberpunk-anthem': 'videos/cyberpunk/neon-drive.mp4',
  'pack-deep-space': 'videos/space/asteroid-drift-cosmic-blue.mp4',
  'pack-cosmic-aurora': 'videos/space/asteroid-drift-aurora-green.mp4',
  'pack-inferno': 'videos/fire/ember-drift.mp4',
  'pack-retro-arcade': 'videos/retro/pixel-pursuit.mp4',
  'pack-winter-dream': 'videos/nature/aurora-snowfall.mp4',
  'pack-spring-morning': 'videos/nature/spring-pollen.mp4',
}

/**
 * Two-stop palette for the dot fallback (used by PresetDot when no
 * thumbnail is available from the catalog). Sampled from each
 * preset's primary palette so the dot still reads as that preset.
 */
export const PRESET_PACK_DOT_PALETTE: Record<string, [string, string]> = {
  'pack-synthwave-sunset': ['#ff2db4', '#3bd4ff'],
  'pack-cyberpunk-anthem': ['#00d4ff', '#ff2db4'],
  'pack-deep-space': ['#4a90ff', '#e0eaff'],
  'pack-cosmic-aurora': ['#30dca0', '#80f0d0'],
  'pack-inferno': ['#ffcc40', '#ff3020'],
  'pack-retro-arcade': ['#ffe050', '#ffa020'],
  'pack-winter-dream': ['#a0e0ff', '#80ffd0'],
  'pack-spring-morning': ['#ffd060', '#b0e080'],
}
