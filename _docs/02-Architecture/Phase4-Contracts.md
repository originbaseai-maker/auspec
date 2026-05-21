# Phase 4 — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> These contracts define the boundaries between parallel agents working on
> Phase 4 (First Visualizer: Linear Bars + Frame Pulse Effect). Treat as frozen.

---

## Canvas Manager Hook

```ts
// src/hooks/useVisualizerCanvas.ts
export function useVisualizerCanvas(containerRef: React.RefObject<HTMLDivElement>): {
  canvasRef: React.RefObject<HTMLCanvasElement>
  ctx: CanvasRenderingContext2D | null
  width: number
  height: number
  dpr: number
}
```

- Handles canvas creation, sizing, high-DPI (`devicePixelRatio`), and `ResizeObserver`
- Canvas fills container **100% width and height**
- On resize: re-scales canvas and updates `width` / `height`

---

## Linear Bars Renderer

```ts
// src/lib/renderers/linearBars.ts
export interface LinearBarsConfig {
  barCount: number          // 64–128, default 80
  barGap: number            // px between bars, default 2
  minBarHeight: number      // minimum bar height px, default 2
  colorStart: string        // gradient start color, default '#3b82f6'
  colorEnd: string          // gradient end color, default '#8b5cf6'
  glowEnabled: boolean      // default true
  glowIntensity: number     // 0–20, default 8
  mirrorMode: boolean       // default false
  smoothing: number         // 0–1 lerp factor, default 0.15
}

export function renderLinearBars(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: LinearBarsConfig,
  width: number,
  height: number,
  previousHeights: Float32Array,  // mutated in place for smoothing
): void
```

---

## Frame Pulse Renderer

```ts
// src/lib/renderers/framePulse.ts
export interface FramePulseConfig {
  enabled: boolean           // default true
  baseColor: string          // default '#3b82f6'
  beatColor: string          // default '#8b5cf6'
  intensity: number          // 0–1, default 0.6
  thickness: number          // px, default 2
  beatThreshold: number      // 0–1, beatEnergy threshold, default 0.7
}

export function renderFramePulse(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: FramePulseConfig,
  width: number,
  height: number,
): void
```

- Draws a glowing border around the canvas
- Color lerps from `baseColor` to `beatColor` based on `beatEnergy`
- Glow intensity scales with `bass` value
- On beat (`beatEnergy > beatThreshold`): flash effect

---

## Visualizer Canvas Component

```ts
// src/components/studio/VisualizerCanvas.tsx
export default function VisualizerCanvas(): JSX.Element
```

- Uses `useVisualizerCanvas` + `useAnalyzer`
- Runs `requestAnimationFrame` render loop
- Renders: `linearBars` **then** `framePulse` each frame
- Replaces `CanvasPlaceholder` when audio is playing

---

## Smoothing Algorithm

Per-frame lerp for each bar:

```ts
previousHeights[i] = previousHeights[i] + (targetHeight - previousHeights[i]) * smoothing
```

- `smoothing = 0.15` → 15% of the way to target each frame
- Tuned for **fast attack, slow decay** feel
- `previousHeights` is allocated once by the caller and mutated in place — **no per-frame allocations**
