# Phase 3 — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> These contracts define the boundaries between parallel agents working on
> Phase 3 (Web Audio Analyzer Engine). Treat as frozen.

---

## AudioContext Manager

```ts
// src/lib/audioContext.ts
export function getAudioContext(): AudioContext
export function resumeAudioContext(): Promise<void>
export function connectMediaElement(
  element: HTMLAudioElement
): { source: MediaElementAudioSourceNode; analyser: AnalyserNode }
export function disconnectAll(): void
```

---

## Analyzer Config

```ts
// src/types/analyzer.ts
export interface AnalyzerConfig {
  fftSize: 2048 | 4096 | 8192        // default: 2048
  smoothingTimeConstant: number       // 0–1, default: 0.8
  minDecibels: number                 // default: -90
  maxDecibels: number                 // default: -10
}

export interface FrequencyData {
  raw: Uint8Array                     // full FFT bin array
  bass: number                        // 0–255, avg 20–250Hz
  mid: number                         // 0–255, avg 250–4000Hz
  treble: number                      // 0–255, avg 4000–20000Hz
  rms: number                         // 0–1, root mean square loudness
  peak: number                        // 0–255, highest bin value
  beatEnergy: number                  // 0–1, beat detection energy
  timeDomain: Uint8Array              // waveform data
}
```

---

## Hook Contract

```ts
// src/hooks/useAudioAnalyzer.ts
export function useAudioAnalyzer(): {
  frequencyData: FrequencyData | null
  isAnalyzing: boolean
  analyzerConfig: AnalyzerConfig
  updateConfig: (config: Partial<AnalyzerConfig>) => void
}
```

---

## Frequency Band Ranges

| Band | Range (Hz) |
|------|------------|
| Bass | 20 – 250 |
| Mid | 250 – 4000 |
| Treble | 4000 – 20000 |

---

## FFT Bin Calculation

```ts
// Given sampleRate (typically 44100) and fftSize:
const binCount = fftSize / 2
const binHz = sampleRate / fftSize
const bassEnd = Math.floor(250 / binHz)
const midEnd = Math.floor(4000 / binHz)
// treble = midEnd to binCount
```

---

## Performance Rules

- Animation loop uses `requestAnimationFrame` **only**
- **NO** `setInterval` or `setTimeout` in the render loop
- Cleanup on unmount: cancel animation frame **and** disconnect nodes
- Memory safe: **no** new `Uint8Array` allocations per frame — reuse buffers
