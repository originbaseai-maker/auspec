# Phase 6 Extended — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> After Effects-style audio spectrum features extending the Phase 4/5/6 renderers.
> Treat as frozen.

---

## 1. Analog Dots Display Mode

```ts
// src/types/visualizer.ts (or co-located with each renderer)
export type DisplayMode = 'digital' | 'analog_lines' | 'analog_dots'
```

Extend the existing renderer configs:

```ts
// LinearBarsConfig (src/lib/renderers/linearBars.ts)
displayMode: DisplayMode  // default: 'digital'
dotSize: number           // 2–8 px, default 4

// WaveConfig (src/lib/renderers/wave.ts)
displayMode: DisplayMode  // default: 'analog_lines'
dotSize: number           // 2–8 px, default 3
```

Rendering semantics:

- `digital` — solid rectangles (linear bars) / continuous filled curve (wave) — current behavior
- `analog_lines` — bar/wave drawn as a 1–2 px stroked outline only, no fill
- `analog_dots` — bar/wave sampled as a series of circles of radius `dotSize/2`, evenly spaced along the bar height or wave path

Polygon and circular renderers are **not** required to implement `displayMode` in this phase.

---

## 2. Hue Interpolation (Rainbow Gradient)

Extend **all four** spectrum renderer configs:

```ts
// LinearBarsConfig, CircularSpectrumConfig, WaveConfig, PolygonSpectrumConfig
hueInterpolation: number  // 0–360 degrees, default 0 (disabled)
```

Semantics:

| Value | Behavior |
|-------|----------|
| `0` | Uses `colorStart` → `colorEnd` gradient (existing behavior) |
| `180` | Half-wheel rainbow spread across all bars |
| `360` | Full color-wheel cycle across all bars |

Implementation guidance — each bar `i` of `barCount` (or sample `i` of the wave path) gets:

```ts
// When hueInterpolation > 0
const baseHue = parseHueFromHex(colorStart)
const hue = (baseHue + (i / barCount) * hueInterpolation) % 360
const fillColor = hslToHex(hue, saturation, lightness)
```

When `hueInterpolation === 0`, the existing `colorStart`/`colorEnd` gradient code path is used unchanged.

---

## 3. Start / End Frequency (Hz Range)

Extend **all four** spectrum renderer configs:

```ts
// LinearBarsConfig, CircularSpectrumConfig, WaveConfig, PolygonSpectrumConfig
startFrequency: number  // Hz, default 20
endFrequency: number    // Hz, default 20000
```

Only FFT bins within `[startFrequency, endFrequency]` are sampled for rendering. Bin selection uses the new shared utility (below). When the range is narrower than the full spectrum, the available bins are stretched across `barCount` so visuals stay full-width.

---

## 4. Side A / Side B Controls

```ts
// LinearBarsConfig
sideMode: 'both' | 'side_a' | 'side_b'  // default: 'both'
```

| `sideMode` | LinearBars | Circular / Polygon |
|------------|------------|---------------------|
| `both` | current mirror behavior (symmetric around center) | bars extend outward + inward (current `barDirection: 'both'`) |
| `side_a` | bars grow **upward** only | bars grow **outward** only |
| `side_b` | bars grow **downward** only | bars grow **inward** only |

```ts
// CircularSpectrumConfig and PolygonSpectrumConfig
sideMode: 'both' | 'side_a' | 'side_b'  // default: 'both'
```

For Polygon: `sideMode` supersedes the existing `barDirection` field — both should map to the same internal direction logic to avoid double-control. Migration: when `sideMode === 'both'`, fall back to whatever `barDirection` says; otherwise `sideMode` wins.

`sideMode === 'both'` is the default for backwards compatibility with existing presets.

---

## Shared Utility

```ts
// src/lib/frequencyUtils.ts — new export
export function getFrequencyBinRange(
  fftSize: number,
  sampleRate: number,
  startHz: number,
  endHz: number,
): { startBin: number; endBin: number }
```

Implementation:

```ts
const binHz = sampleRate / fftSize
const binCount = fftSize / 2
const startBin = clamp(Math.floor(startHz / binHz), 0, binCount - 1)
const endBin = clamp(Math.ceil(endHz / binHz), startBin + 1, binCount)
return { startBin, endBin }
```

Used by every renderer that supports `startFrequency` / `endFrequency`. **No new per-frame allocations**: callers should compute the bin range once per frame from `frequencyData.raw.length * 2` (= `fftSize`) and `audioContext.sampleRate`, then iterate `data.raw[startBin..endBin]` directly.

---

## ControlsSidebar Additions

Per-visual-type sections in [src/components/studio/ControlsSidebar.tsx](src/components/studio/ControlsSidebar.tsx):

- **Display Mode** (linear bars + wave) — 3-button segmented control: `Digital` / `Lines` / `Dots`
- **Dot Size** (when `displayMode === 'analog_dots'`) — slider 2–8 px
- **Hue Spread** — slider 0–360°, label "Off" at 0, "Rainbow" at 360
- **Frequency Range** — dual-thumb range or two stacked sliders, 20–20000 Hz, log scale on the thumbs
- **Side Mode** — 3-button segmented control: `Both` / `Side A` / `Side B`

When `hueInterpolation > 0`, the existing primary/secondary color pickers may be visually de-emphasized (opacity 0.5) since they only seed the base hue.

---

## Backwards Compatibility

- Every new field has a default that reproduces the **current** behavior:
  - `displayMode: 'digital'` (linear bars) / `'analog_lines'` (wave) — existing rendering
  - `dotSize: 4` / `3` — unused unless `displayMode === 'analog_dots'`
  - `hueInterpolation: 0` — existing `colorStart`→`colorEnd` gradient
  - `startFrequency: 20`, `endFrequency: 20000` — full audible range, equivalent to no filtering
  - `sideMode: 'both'` — current mirror / two-way behavior
- Built-in presets in [src/lib/presets.ts](src/lib/presets.ts) **must** be updated to spell out the new defaults so older saved user presets (without these fields) merge cleanly through `applyPreset`'s spread chain. The visualizer store's `applyPreset` already merges per-renderer config slices, so missing fields fall through to `DEFAULT_*_CONFIG`.
