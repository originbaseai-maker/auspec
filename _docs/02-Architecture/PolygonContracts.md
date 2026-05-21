# Polygon Spectrum — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> Polygon Spectrum is a new visual type sharing the Phase 5/6 renderer architecture.
> Treat as frozen.

---

## Polygon Shape Type

```ts
// src/types/polygon.ts (or co-located with the renderer)
export type PolygonShape =
  | 'triangle'    // 3 sides
  | 'square'      // 4 sides
  | 'pentagon'    // 5 sides
  | 'hexagon'     // 6 sides
  | 'star'        // 6-point star
  | 'diamond'     // rotated square
```

---

## Polygon Spectrum Config

```ts
export interface PolygonSpectrumConfig {
  shape: PolygonShape          // default: 'hexagon'
  radius: number               // base radius px, default 160
  barCount: number             // total bars distributed along perimeter, default 120
  colorStart: string           // default '#3b82f6'
  colorEnd: string             // default '#8b5cf6'
  glowEnabled: boolean         // default true
  glowIntensity: number        // 0–20, default 10
  rotation: number             // degrees, default 0
  smoothing: number            // 0–1, default 0.15
  fillShape: boolean           // fill polygon interior, default false
  fillOpacity: number          // 0–1, default 0.1
  barDirection: 'outward' | 'inward' | 'both'  // default 'outward'
}
```

---

## Renderer Contract

```ts
// src/lib/renderers/polygonSpectrum.ts
export function renderPolygonSpectrum(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: PolygonSpectrumConfig,
  width: number,
  height: number,
  previousHeights: Float32Array,
): void

// Returns polygon vertices for external use (Smart Logo Mode, hit-testing, etc.)
export function getPolygonVertices(
  shape: PolygonShape,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,    // degrees
): Array<{ x: number; y: number }>
```

Implementation requirements:

- `previousHeights` is allocated once by the caller and mutated in place — **no per-frame allocations**
- Bars are distributed evenly along the polygon perimeter (proportional to edge length, not vertex count)
- Each bar is drawn perpendicular to its edge segment
- `barDirection`:
  - `'outward'` — bars grow away from the centroid
  - `'inward'` — bars grow toward the centroid
  - `'both'` — bars extend in both directions (symmetric around the edge)
- `fillShape` paints the polygon interior with `colorStart` at `fillOpacity` **before** the bars
- `star` is rendered as 6 evenly-spaced outer points alternating with 6 inner points (12 vertices total)
- `diamond` is `square` with a 45° rotation baseline

---

## VisualizerConfig Extension

Add to the composite in `src/lib/visualizerConfig.ts`:

```ts
export interface VisualizerConfig {
  visualType: 'bars' | 'circular' | 'wave' | 'polygon' | 'particles'
  linearBars: LinearBarsConfig
  circularSpectrum: CircularSpectrumConfig
  wave: WaveConfig
  polygon: PolygonSpectrumConfig          // NEW
  framePulse: FramePulseConfig
}
```

`DEFAULT_VISUALIZER_CONFIG` must include `DEFAULT_POLYGON_SPECTRUM`. The `VisualType` union in `useVisualizerStore` must also gain `'polygon'`.

---

## Controls

New **Shape** section in `src/components/studio/ControlsSidebar.tsx` (visible only when `visualType === 'polygon'`):

- **Shape selector** — 6-icon grid (triangle, square, pentagon, hexagon, star, diamond), single-select, writes `updatePolygon({ shape })`
- **Radius** — slider, 40–400 px
- **Bar Count** — slider, 24–256 (existing Bar Count section can be reused; polygon uses the same slider)
- **Smoothing** — slider, 0–1 (reuses existing section)
- **Glow** — toggle + intensity (reuses existing section)
- **Rotation** — slider, 0–360° (reuses existing section)
- **Fill Shape** — toggle + opacity slider (polygon-specific)
- **Bar Direction** — 3-button segmented control (outward / inward / both), polygon-specific

All controls write to `useVisualizerStore.updatePolygon(partial: Partial<PolygonSpectrumConfig>)`.

---

## Smart Logo Mode

When `visualType === 'polygon'` and a logo is present, `getPolygonVertices` is used to compute the inner clearance: the renderer sets `effectiveInnerRadius = (min(w, h) * logoSize) / 2 + 8` and bars start from the perimeter outward only (`barDirection: 'outward'`), so the logo sits cleanly inside the polygon. Square / diamond crop modes pair best with `square` / `diamond` shapes; circle pairs with any.
