# Phase 3 — Web Audio Analyzer Engine

## Goal
Create the core audio analysis engine using the Web Audio API.

## Status
- [ ] Not Started

## Hook: `useAudioAnalyzer`
Must provide:
- Raw frequency data (Uint8Array)
- Time domain data
- Bass values (20–250 Hz)
- Mid values (250–4000 Hz)
- Treble values (4000–20000 Hz)
- RMS loudness
- Peak detection
- Beat energy

## Web Audio API Setup
- AudioContext
- MediaElementSource (from HTML audio element)
- AnalyserNode
- FFT size: configurable (default 2048)

## Performance Requirements
- Optimized render loop
- Memory-safe (cleanup on unmount)
- No memory leaks between track changes

## Dependencies
- Phase 2 complete

## Notes
