# Phase 6 — Design Controls Panel

## Goal
Users can customize all visual parameters in real time.

## Status
- [x] Complete

## Controls Shipped
- Visual Type selector (bars / circular / wave; particles disabled, marked "Soon")
- Primary + Secondary color pickers (swatches + custom HTML color input)
- Background color picker
- Sensitivity slider (0–100)
- Glow toggle + Glow intensity slider (0–20)
- Rotation slider (circular only)
- Bar Count slider (32–256) — bars + circular
- Smoothing slider (0–1)
- Mirror Mode toggle (bars + wave)
- Frame Pulse toggle + beat color picker
- Wave renderer (`renderWave`) added as third visual type
- Export button preserved as disabled placeholder

## State Management
- All settings stored in Zustand (`useVisualizerStore`)
- New actions: `setBackgroundColor`, `setSecondaryColor`, `updateCircularSpectrum`, `updateWave`, `applyPreset`
- Changing any control clears `activePresetId` so the preset chip de-highlights
- Background color paints the canvas every frame, independent of the renderer

## Files Created
- `src/lib/renderers/wave.ts` — `renderWave()` + `WaveConfig` + `DEFAULT_WAVE_CONFIG`
- `src/lib/presets.ts` — `Preset` type + `BUILT_IN_PRESETS` (6 presets)

## Files Modified
- `src/components/studio/ControlsSidebar.tsx` — replaced disabled placeholders with live controls
- `src/components/studio/PresetsSidebar.tsx` — preset list now applies on click
- `src/components/studio/VisualizerCanvas.tsx` — multi-renderer dispatch via `cfg.visualType`, background fill
- `src/lib/visualizerConfig.ts` — adds `visualType`, `wave`, `circularSpectrum`
- `src/store/useVisualizerStore.ts` — new actions + `activePresetId` + `applyPreset`
- `src/index.css` — `.auspec-slider` styling

## Dependencies
- Phase 5 complete (bundled in the same branch)

## Notes
- Phase 5 + 6 were merged into a single agent sprint because they share the `VisualizerConfig` extension. See [[Phase56-Contracts]].
- Presets are read-only (built-in only) — user-saved presets land in Phase 7.
