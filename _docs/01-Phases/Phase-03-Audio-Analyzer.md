# Phase 3 — Web Audio Analyzer Engine

## Goal
Create the core audio analysis engine using the Web Audio API.

## Status
- [x] Complete

## Tasks
- [x] useAudioAnalyzer hook
- [x] Raw frequency data (Uint8Array)
- [x] Time domain data
- [x] Bass values (20–250 Hz)
- [x] Mid values (250–4000 Hz)
- [x] Treble values (4000–20000 Hz)
- [x] RMS loudness
- [x] Peak detection
- [x] Beat energy

## Completed
Phase 3 — Web Audio Analyzer Engine

## Files Created
- src/types/analyzer.ts — AnalyzerConfig, FrequencyData, DEFAULT_ANALYZER_CONFIG, FREQUENCY_BANDS, BEAT_HISTORY_FRAMES
- src/lib/audioContext.ts — singleton AudioContext, connectMediaElement (reuses node per element), disconnectAll, resumeAudioContext
- src/lib/frequencyUtils.ts — calcBinIndex, calcBandAverage, calcRMS, calcPeak, calcBeatEnergy (pure functions)
- src/lib/analyzerEngine.ts — AnalyzerEngine class, rAF loop, zero allocations in tick()
- src/hooks/useAudioAnalyzer.ts — React hook, starts/stops engine with isPlaying
- src/contexts/AnalyzerContext.tsx — AnalyzerProvider, useAnalyzer hook
- src/components/debug/AnalyzerDebugOverlay.tsx — Shift+D toggle, dev-only

## Files Modified
- src/App.tsx — wrapped with AnalyzerProvider
- src/components/studio/CanvasPlaceholder.tsx — live 32-bar mini preview when playing

## Architecture Notes
- AudioContext singleton — never closed, only suspended/resumed
- MediaElementSourceNode created ONCE per HTMLAudioElement (browser enforced)
- requestAnimationFrame only — no setInterval/setTimeout in render loop
- Uint8Array buffers allocated once in constructor, reused every frame
- Beat detection: 43-frame rolling average of bass energy
- Frame Pulse Effect noted for Phase 4/6 — canvas border glow reacts to beat

## Dependencies
- Phase 2 complete ✅
