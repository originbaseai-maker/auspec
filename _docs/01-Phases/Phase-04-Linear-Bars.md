# Phase 4 — First Visualizer: Linear Bars

## Goal
Render the first live visualization: animated frequency bars on canvas.

## Status
- [x] Complete

## Tasks
- [x] Responsive canvas
- [x] High DPI / retina support (devicePixelRatio)
- [x] 64–128 animated bars (default 80)
- [x] Live frequency response from analyzer
- [x] Smooth interpolation between frames (lerp 0.15)
- [x] Color customizable (gradient colorStart → colorEnd)

## Bonus Feature — Frame Pulse Effect
- [x] Canvas border glows and reacts to beat energy
- [x] Color lerps blue→violet based on beatEnergy
- [x] Flash burst on beat (beatEnergy > threshold)
- [x] Bass-driven glow intensity (8–40px blur)

## Completed
Phase 4 — Linear Bars Visualizer + Frame Pulse Effect

## Files Created
- src/hooks/useVisualizerCanvas.ts — high-DPI canvas hook, ResizeObserver
- src/lib/renderers/linearBars.ts — renderLinearBars(), LinearBarsConfig, lerp smoothing, glow, mirror mode
- src/lib/renderers/framePulse.ts — renderFramePulse(), FramePulseConfig, beat-reactive border glow
- src/lib/renderers/index.ts — barrel export
- src/lib/visualizerConfig.ts — VisualizerConfig (composite), DEFAULT_LINEAR_BARS, DEFAULT_FRAME_PULSE, DEFAULT_VISUALIZER_CONFIG
- src/components/studio/VisualizerCanvas.tsx — rAF render loop, wires renderers + context

## Files Modified
- src/store/useVisualizerStore.ts — added visualizerConfig, updateLinearBars, updateFramePulse
- src/pages/StudioPage.tsx — 3-way canvas switch: VisualizerCanvas / CanvasPlaceholder / AudioUploader

## Architecture Notes
- rAF loop driven by VisualizerCanvas, not React renders
- config and frequencyData accessed via refs inside rAF to avoid loop restarts
- previousHeights is Float32Array(256), mutated in place — zero allocations per frame
- framePulse renders AFTER linearBars (on top layer)
- ResizeObserver uses setTransform not scale to avoid compound DPI scaling on resize
- Renderer configs (LinearBarsConfig, FramePulseConfig) live next to their renderers — single source of truth
- Composite VisualizerConfig + defaults live in @/lib/visualizerConfig

## Extensions
- **Circular Spectrum** (Phase 5) — radial bars around a center, optional logo-aware inner radius
- **Wave** (Phase 6) — line waveform with optional mirror + fill
- **Polygon Spectrum** (bonus) — bars distributed along the perimeter of triangle / square / pentagon / hexagon / star / diamond. See [[PolygonContracts]].
