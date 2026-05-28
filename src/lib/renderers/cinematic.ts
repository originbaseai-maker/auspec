import type { CinematicConfig } from '@/types/layer'

/**
 * Number of pre-rendered noise tiles to cycle through. 8 gives the
 * grain enough variety that the eye reads it as continuous shimmer
 * (rather than a single static texture) without the memory cost of
 * a true random-every-frame approach. Each tile is 256×256 = 64 kB
 * of canvas; 8 tiles ≈ 512 kB total per layer. Cheap.
 */
const TILE_COUNT = 8
const TILE_SIZE = 256

interface RendererState {
  // Vignette cache — gradient creation costs ~0.1 ms but is rebuilt
  // ONLY when one of its inputs changes (size, softness, intensity,
  // colour, or canvas dims). The cache keys are stringified so a
  // numeric round-trip through React state doesn't bust them.
  vignetteKey: string
  vignetteGradient: CanvasGradient | null
  vignetteWidth: number
  vignetteHeight: number

  // Noise tiles — generated once on first render, regenerated only
  // when grainSize changes (different block size = different pixel
  // grouping). The tiles are reused across the layer's lifetime.
  grainKey: string
  tiles: HTMLCanvasElement[] | null

  // Frame counter for tile rotation. Independent of `time` so the
  // tile changes feel mechanical / film-projector-like rather than
  // sine-wave-smooth.
  frame: number
}

const stateByConfig = new WeakMap<CinematicConfig, RendererState>()

function getOrInitState(config: CinematicConfig): RendererState {
  let s = stateByConfig.get(config)
  if (!s) {
    s = {
      vignetteKey: '',
      vignetteGradient: null,
      vignetteWidth: 0,
      vignetteHeight: 0,
      grainKey: '',
      tiles: null,
      frame: 0,
    }
    stateByConfig.set(config, s)
  }
  return s
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return [0, 0, 0]
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

/**
 * Build the vignette radial gradient. Centred on the canvas; the
 * clear inner radius is set by `vignetteSize` (fraction of half-min-
 * dim) and the outer radius extends past the corners so the edges
 * are fully tinted even on extreme aspect ratios. `softness` shapes
 * the feather curve via an intermediate stop.
 */
function buildVignetteGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: CinematicConfig,
): CanvasGradient {
  const cx = width / 2
  const cy = height / 2
  const halfMin = Math.min(width, height) / 2
  const innerRadius = halfMin * config.vignetteSize
  // 1.42 ≈ sqrt(2), the corner distance on a square. Slight extra
  // (1.5) so wide aspect ratios still saturate corner darkness.
  const outerRadius = (Math.max(width, height) / 2) * 1.5

  const [r, g, b] = hexToRgb(config.vignetteColor)
  const peakAlpha = Math.max(0, Math.min(1, config.vignetteIntensity))
  // Softness 0 → step (mid-stop near outer). Softness 1 → smooth
  // feather (mid-stop near inner). Lerp the mid-stop position so the
  // user feels the slider direction matches the visual change.
  const midStop = 0.4 + (1 - config.vignetteSoftness) * 0.4
  const midAlpha = peakAlpha * 0.5

  const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius)
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
  grad.addColorStop(midStop, `rgba(${r},${g},${b},${midAlpha})`)
  grad.addColorStop(1, `rgba(${r},${g},${b},${peakAlpha})`)
  return grad
}

/**
 * Generate an offscreen canvas containing a single noise tile.
 * `blockSize` quantises the noise — bigger blocks = coarser grain.
 * Output is grayscale so the composite-op-driven blend ends up
 * tinting whatever colour is underneath, not adding its own colour.
 */
function buildNoiseTile(blockSize: number): HTMLCanvasElement {
  const tile = document.createElement('canvas')
  tile.width = TILE_SIZE
  tile.height = TILE_SIZE
  const tctx = tile.getContext('2d')
  if (!tctx) return tile
  const imageData = tctx.createImageData(TILE_SIZE, TILE_SIZE)
  const data = imageData.data
  // For block-quantised noise we generate one random per block and
  // splat it to every pixel inside the block. Coarse blocks render
  // faster than per-pixel noise AND look like real film grain.
  const blocks = Math.max(1, Math.floor(TILE_SIZE / blockSize))
  const blockPx = Math.ceil(TILE_SIZE / blocks)
  for (let by = 0; by < blocks; by++) {
    for (let bx = 0; bx < blocks; bx++) {
      const v = Math.floor(Math.random() * 256)
      const y0 = by * blockPx
      const x0 = bx * blockPx
      const y1 = Math.min(TILE_SIZE, y0 + blockPx)
      const x1 = Math.min(TILE_SIZE, x0 + blockPx)
      for (let y = y0; y < y1; y++) {
        const row = y * TILE_SIZE * 4
        for (let x = x0; x < x1; x++) {
          const i = row + x * 4
          data[i] = v
          data[i + 1] = v
          data[i + 2] = v
          data[i + 3] = 255
        }
      }
    }
  }
  tctx.putImageData(imageData, 0, 0)
  return tile
}

/**
 * Respects prefers-reduced-motion: when set, the grain tile pointer
 * never advances. Vignette stays as-is (it's static anyway).
 */
let reducedMotion = false
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion = mql.matches
  // Subscribe so toggling the OS setting mid-session is honoured.
  // No removeListener — the layer is page-lifetime anyway.
  mql.addEventListener?.('change', (e) => {
    reducedMotion = e.matches
  })
}

export function drawCinematic(
  ctx: CanvasRenderingContext2D,
  config: CinematicConfig,
  width: number,
  height: number,
): void {
  if (!config.vignetteEnabled && !config.grainEnabled) return
  if (width <= 0 || height <= 0) return

  const state = getOrInitState(config)
  state.frame++

  // Vignette — cached gradient. Cheap rebuild on first frame after
  // any tuning. The cache key includes the canvas dims so a format
  // switch (mobile portrait → desktop landscape) triggers a rebuild
  // even when the config is unchanged.
  if (config.vignetteEnabled) {
    const key = `${width}x${height}|${config.vignetteSize}|${config.vignetteSoftness}|${config.vignetteIntensity}|${config.vignetteColor}`
    if (
      key !== state.vignetteKey ||
      state.vignetteGradient === null ||
      state.vignetteWidth !== width ||
      state.vignetteHeight !== height
    ) {
      state.vignetteGradient = buildVignetteGradient(ctx, width, height, config)
      state.vignetteKey = key
      state.vignetteWidth = width
      state.vignetteHeight = height
    }
    ctx.save()
    ctx.fillStyle = state.vignetteGradient
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  // Film grain — pre-rendered tiles cycled by frame counter. The
  // tile pool is rebuilt only when grainSize changes.
  if (config.grainEnabled && config.grainIntensity > 0) {
    // grainSize 0 → tiny pixels (block 1), grainSize 1 → chunky
    // (block 8). 0.5 default lands at block 4 which photographs
    // (subjectively) like ISO 800 stock.
    const blockSize = Math.max(1, Math.round(1 + config.grainSize * 7))
    const grainKey = `block${blockSize}`
    if (state.tiles === null || state.grainKey !== grainKey) {
      const tiles: HTMLCanvasElement[] = []
      for (let i = 0; i < TILE_COUNT; i++) tiles.push(buildNoiseTile(blockSize))
      state.tiles = tiles
      state.grainKey = grainKey
    }
    // Tile rotation: grainSpeed 0 → static (no rotation), 1 →
    // every frame. Mid-range cycles every few frames for a "film
    // running through projector" shimmer. Reduced-motion freezes
    // the rotation entirely.
    const stride = reducedMotion
      ? 0
      : Math.max(1, Math.round(8 - config.grainSpeed * 7))
    const tileIndex = stride === 0
      ? 0
      : Math.floor(state.frame / stride) % TILE_COUNT
    const tile = state.tiles[tileIndex]
    if (tile) {
      ctx.save()
      // 'overlay' mid-grays preserve underlying colour while pulling
      // brights brighter and darks darker — the "filmic" look. The
      // intensity slider is alpha rather than a per-pixel multiplier
      // so a low value still reads correctly with overlay's curve.
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = Math.max(
        0,
        Math.min(1, config.grainIntensity),
      )
      // Small random offset per frame so the same tile doesn't
      // perfectly align on consecutive frames at low stride — kills
      // a faint "staircase" pattern visible on uniform backgrounds.
      const ox = reducedMotion ? 0 : (state.frame * 17) % TILE_SIZE
      const oy = reducedMotion ? 0 : (state.frame * 31) % TILE_SIZE
      // Tile across the whole canvas. drawImage with positive offset
      // beyond the tile dimensions handles the wrap implicitly when
      // we draw multiple times — explicit tiling avoids relying on
      // canvas pattern (which can't be alpha-blended with overlay
      // independently of the fill).
      for (let y = -oy; y < height; y += TILE_SIZE) {
        for (let x = -ox; x < width; x += TILE_SIZE) {
          ctx.drawImage(tile, x, y)
        }
      }
      ctx.restore()
    }
  }
}
