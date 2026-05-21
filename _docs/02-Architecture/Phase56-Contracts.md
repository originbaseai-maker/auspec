# Phase 5 + 6 — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> Phase 5 (Circular Spectrum) and Phase 6 (Design Controls) are bundled because they
> share the same `VisualizerConfig` extension. Treat as frozen.

---

## Circular Spectrum Renderer

```ts
// src/lib/renderers/circularSpectrum.ts
export interface CircularSpectrumConfig {
  radius: number              // base radius px, default 180
  innerRadius: number         // inner circle radius, default 60
  barCount: number            // radial bars, default 128
  colorStart: string          // default '#3b82f6'
  colorEnd: string            // default '#8b5cf6'
  glowEnabled: boolean        // default true
  glowIntensity: number       // 0–20, default 10
  rotation: number            // degrees offset, default 0
  smoothing: number           // 0–1 lerp, default 0.15
  bassPulse: boolean          // inner circle pulses with bass, default true
}

export function renderCircularSpectrum(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: CircularSpectrumConfig,
  width: number,
  height: number,
  previousHeights: Float32Array,
): void
```

---

## Wave Renderer

```ts
// src/lib/renderers/wave.ts
export interface WaveConfig {
  colorStart: string          // default '#3b82f6'
  colorEnd: string            // default '#8b5cf6'
  lineThickness: number       // default 3
  glowEnabled: boolean        // default true
  glowIntensity: number       // default 8
  filled: boolean             // fill under wave, default true
  smoothing: number           // default 0.3
  mirrorMode: boolean         // default false
}

export function renderWave(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: WaveConfig,
  width: number,
  height: number,
): void
```

---

## Updated VisualizerConfig

Extends the existing composite in `src/lib/visualizerConfig.ts`:

```ts
export interface VisualizerConfig {
  visualType: 'bars' | 'circular' | 'wave' | 'particles'
  linearBars: LinearBarsConfig
  circularSpectrum: CircularSpectrumConfig
  wave: WaveConfig
  framePulse: FramePulseConfig
}
```

`DEFAULT_VISUALIZER_CONFIG` must include `visualType: 'bars'`, `DEFAULT_CIRCULAR_SPECTRUM`, and `DEFAULT_WAVE` alongside the existing `DEFAULT_LINEAR_BARS` and `DEFAULT_FRAME_PULSE`.

---

## Controls Panel Sections

```ts
// src/components/studio/ControlsSidebar.tsx — replace disabled placeholders with live controls
```

| # | Section | Control |
|---|---------|---------|
| 1 | Visual Type | 4 buttons (bars / circular / wave / particles) |
| 2 | Colors | primary + secondary color pickers |
| 3 | Sensitivity | slider 0–100 |
| 4 | Effects | glow toggle + glow intensity + rotation |
| 5 | Bar Count | slider 32–256 |
| 6 | Smoothing | slider 0–1 |
| 7 | Mirror Mode | toggle |
| 8 | Frame Pulse | toggle + color |
| 9 | Export | button (still disabled) |

All controls write to `useVisualizerStore`.

---

## Presets System

```ts
// src/lib/presets.ts
export interface Preset {
  id: string
  name: string
  visualType: 'bars' | 'circular' | 'wave'
  config: Partial<VisualizerConfig>
}

export const BUILT_IN_PRESETS: Preset[] = [
  { id: 'dark-neon-circle',   name: 'Dark Neon Circle',   visualType: 'circular', /* ... */ },
  { id: 'minimal-white-wave', name: 'Minimal White Wave', visualType: 'wave',     /* ... */ },
  { id: 'cyberpunk-pulse',    name: 'Cyberpunk Pulse',    visualType: 'bars',     /* ... */ },
  { id: 'golden-yoga-flow',   name: 'Golden Yoga Flow',   visualType: 'circular', /* ... */ },
  { id: 'podcast-clean',      name: 'Podcast Clean',      visualType: 'wave',     /* ... */ },
  { id: 'tropical-bars',      name: 'Tropical Bars',      visualType: 'bars',     /* ... */ },
]
```

Clicking a preset calls `setVisualizerConfig({ ...preset.config, visualType: preset.visualType })` so every field listed in `preset.config` is applied atomically.
