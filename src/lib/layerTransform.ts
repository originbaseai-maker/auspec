import type {
  HaloLayerConfig,
  Layer,
  LayerType,
  LogoLayerConfig,
  ShapeLayerConfig,
  VideoLayerConfig,
  BloomConfig,
} from '@/types/layer'
import type { CircularSpectrumConfig } from '@/lib/renderers/circularSpectrum'
import type { PolygonSpectrumConfig } from '@/lib/renderers/polygonSpectrum'

/**
 * Universal transform contract for the canvas drag/resize overlay.
 *
 * Each positionable layer kind maps its own fields onto a shared
 * `{ x, y, size }` shape so the overlay component can drive every
 * layer with one set of handlers. Layers that aren't positionable —
 * full-canvas backgrounds, frames, bars/wave/particles spectrum
 * fillers — return null from `getLayerBounds` and the overlay
 * declines to render handles for them.
 *
 * Convention:
 *   - x, y are normalised 0..1 fractions of the canvas
 *   - size is the **CSS-pixel half-extent** (radius for round shapes,
 *     half-width for square / scale-driven shapes). The overlay only
 *     ever shows a centred bounding box, so a single dimension is
 *     enough; we pick the dominant one per layer kind.
 *
 * setLayerBoundsPatch returns a Partial<config> — the caller (overlay)
 * passes it straight to `useLayerStore.updateConfig(id, patch)`. Going
 * through the store is what gives the panel sliders live bidirectional
 * sync for free: the same field that drives the overlay drives the
 * sliders.
 */
export interface LayerBounds {
  /** 0..1 horizontal centre. */
  x: number
  /** 0..1 vertical centre. */
  y: number
  /** CSS-pixel half-extent (radius / half-side). */
  sizePx: number
}

/**
 * Constraints used when the overlay rewrites bounds. Clamping happens
 * in the contract module so each layer kind keeps its existing slider
 * range and there's no risk of the overlay producing a value the
 * panel can't display.
 */
export interface LayerSizeRange {
  min: number
  max: number
}

/**
 * Read the current bounds of a layer in overlay-friendly form, or
 * return null for non-positionable layers. The overlay treats null as
 * "no handles for this kind."
 *
 * `minDimPx` is the wrapper's min(width, height) in CSS pixels — used
 * by layer kinds whose size is stored as a fraction of the canvas
 * (logo) or a multiplicative scale (shape/video) so the bounds come
 * back in actual pixels.
 */
export function getLayerBounds(
  layer: Layer,
  minDimPx: number,
): LayerBounds | null {
  switch (layer.type) {
    case 'circular': {
      const cfg = layer.config as CircularSpectrumConfig
      return {
        x: cfg.offsetX ?? 0.5,
        y: cfg.offsetY ?? 0.5,
        sizePx: Math.max(20, cfg.radius ?? 100),
      }
    }
    case 'polygon': {
      const cfg = layer.config as PolygonSpectrumConfig
      return {
        x: cfg.offsetX ?? 0.5,
        y: cfg.offsetY ?? 0.5,
        sizePx: Math.max(20, cfg.radius ?? 100),
      }
    }
    case 'bloom': {
      const cfg = layer.config as BloomConfig
      return {
        x: cfg.offsetX ?? 0.5,
        y: cfg.offsetY ?? 0.5,
        sizePx: Math.max(20, cfg.baseRadius ?? 80),
      }
    }
    case 'halo': {
      const cfg = layer.config as HaloLayerConfig
      return {
        x: cfg.offsetX,
        y: cfg.offsetY,
        sizePx: Math.max(20, cfg.baseRadius),
      }
    }
    case 'logo': {
      const cfg = layer.config as LogoLayerConfig
      // logoSize is fraction of minDim → translate to absolute px so
      // the overlay outline matches the actual rendered logo.
      return {
        x: cfg.position.x,
        y: cfg.position.y,
        sizePx: Math.max(20, (minDimPx * cfg.logoSize) / 2),
      }
    }
    case 'shape': {
      const cfg = layer.config as ShapeLayerConfig
      // Shape doesn't store its own position — the bounds come from
      // the points themselves. We compute the points' centroid + the
      // half-diagonal of their bounding box as a sensible drag/resize
      // target. The drag delta is then folded into every point.
      if (cfg.points.length === 0) return null
      let minX = 1
      let maxX = 0
      let minY = 1
      let maxY = 0
      for (const p of cfg.points) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      }
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const halfW = ((maxX - minX) / 2) * minDimPx
      const halfH = ((maxY - minY) / 2) * minDimPx
      return {
        x: cx,
        y: cy,
        sizePx: Math.max(20, Math.max(halfW, halfH) * (cfg.scale ?? 1)),
      }
    }
    case 'video': {
      const cfg = layer.config as VideoLayerConfig
      // Video at 'fill' covers the whole canvas — no meaningful drag
      // bounds. Other fits use the scale-driven box.
      if (cfg.fit === 'fill') return null
      return {
        x: cfg.offsetX,
        y: cfg.offsetY,
        sizePx: Math.max(20, (minDimPx * cfg.scale) / 2),
      }
    }
    case 'text':
      // Text drag/edit is handled by TextInteractive (it owns the
      // double-click-to-edit affordance). Returning null here keeps
      // the canvas overlay from drawing competing handles on top.
      // Future callers that want text bounds for non-overlay reasons
      // can branch on type directly.
      return null
    case 'lyrics':
      // Lyrics position is panel-controlled (x/y sliders in the
      // future + drag via the same TextInteractive path eventually).
      // For phase 1, no canvas-overlay handles.
      return null
    // Full-canvas / non-positionable kinds. Listed explicitly so
    // adding a new layer type forces a compile-time decision.
    case 'bars':
    case 'wave':
    case 'particles':
    case 'background':
    case 'frame':
    case 'cinematic':
      return null
  }
}

/**
 * Convert a new {x, y} or sizePx back into a partial config patch.
 * Caller picks which fields to set — pass only the ones that changed.
 * Returns null when the layer kind is non-positionable (mirrors
 * getLayerBounds; never called by the overlay in that case but safe
 * for direct consumers).
 */
export function setLayerBoundsPatch(
  layer: Layer,
  patch: Partial<LayerBounds>,
  minDimPx: number,
): object | null {
  switch (layer.type) {
    case 'circular':
    case 'polygon': {
      const out: { offsetX?: number; offsetY?: number; radius?: number } = {}
      if (patch.x !== undefined) out.offsetX = patch.x
      if (patch.y !== undefined) out.offsetY = patch.y
      if (patch.sizePx !== undefined) out.radius = patch.sizePx
      return out
    }
    case 'bloom':
    case 'halo': {
      const out: { offsetX?: number; offsetY?: number; baseRadius?: number } = {}
      if (patch.x !== undefined) out.offsetX = patch.x
      if (patch.y !== undefined) out.offsetY = patch.y
      if (patch.sizePx !== undefined) out.baseRadius = patch.sizePx
      return out
    }
    case 'logo': {
      const out: {
        position?: { x: number; y: number }
        logoSize?: number
      } = {}
      if (patch.x !== undefined || patch.y !== undefined) {
        const cfg = layer.config as LogoLayerConfig
        out.position = {
          x: patch.x ?? cfg.position.x,
          y: patch.y ?? cfg.position.y,
        }
      }
      if (patch.sizePx !== undefined && minDimPx > 0) {
        // Invert getLayerBounds: sizePx = (minDim * logoSize) / 2.
        out.logoSize = (patch.sizePx * 2) / minDimPx
      }
      return out
    }
    case 'video': {
      const out: { offsetX?: number; offsetY?: number; scale?: number } = {}
      if (patch.x !== undefined) out.offsetX = patch.x
      if (patch.y !== undefined) out.offsetY = patch.y
      if (patch.sizePx !== undefined && minDimPx > 0) {
        out.scale = (patch.sizePx * 2) / minDimPx
      }
      return out
    }
    case 'shape': {
      const cfg = layer.config as ShapeLayerConfig
      if (cfg.points.length === 0) return null
      const out: {
        points?: { x: number; y: number }[]
        scale?: number
      } = {}
      if (patch.x !== undefined || patch.y !== undefined) {
        // Translate every point by (dx, dy) so the centroid lands at
        // patch.x / patch.y. The existing bounds gives the old
        // centroid; the delta is what we apply.
        const old = getLayerBounds(layer, minDimPx)
        if (!old) return null
        const dx = (patch.x ?? old.x) - old.x
        const dy = (patch.y ?? old.y) - old.y
        out.points = cfg.points.map((p) => ({
          x: Math.max(0, Math.min(1, p.x + dx)),
          y: Math.max(0, Math.min(1, p.y + dy)),
        }))
      }
      if (patch.sizePx !== undefined && minDimPx > 0) {
        const old = getLayerBounds(layer, minDimPx)
        if (!old || old.sizePx === 0) return out
        // Scale relative to the current visible size — preserves the
        // shape's own internal proportions.
        const ratio = patch.sizePx / old.sizePx
        out.scale = Math.max(0.1, Math.min(3, (cfg.scale ?? 1) * ratio))
      }
      return out
    }
    case 'text':
    case 'lyrics':
    case 'bars':
    case 'wave':
    case 'particles':
    case 'background':
    case 'frame':
    case 'cinematic':
      return null
  }
}

/**
 * Per-layer-kind clamp range for the size handle. Mirrors the slider
 * bounds in each panel so the overlay can't drive size outside the
 * range the panel will display.
 */
export function getLayerSizeRange(type: LayerType): LayerSizeRange {
  switch (type) {
    case 'circular':
    case 'polygon':
      return { min: 20, max: 500 }
    case 'bloom':
      return { min: 20, max: 300 }
    case 'halo':
      return { min: 40, max: 400 }
    case 'logo':
      // Logo stores fraction-of-minDim; px conversion is handled in
      // setLayerBoundsPatch. The pixel min/max here is purely
      // overlay-side — fraction range 0.1–1.0 × minDim / 2 yields
      // ~0.05·minDim to 0.5·minDim. The overlay clamps with min(20)
      // as a UX floor so the handle never disappears.
      return { min: 20, max: 1500 }
    case 'shape':
      // Shape uses scale 0.1–3; the px range is generous so any
      // canvas size accommodates it.
      return { min: 20, max: 2000 }
    case 'video':
      return { min: 20, max: 1500 }
    default:
      // Non-positionable — never invoked from the overlay path, but
      // returns a benign default so direct callers don't crash.
      return { min: 20, max: 500 }
  }
}
