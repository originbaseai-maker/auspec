# Phase 11 — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> Phase 11 (Export System). Treat as frozen.

---

## How It Works

1. User clicks the **Export** button in the TopBar (no longer disabled).
2. `ExportModal` opens — format selection (WebM/MP4), quality, duration.
3. User clicks **Start Recording**.
4. `MediaRecorder` captures the canvas stream via `canvas.captureStream(frameRate)`.
5. Recording runs for the selected duration (or until the user stops manually).
6. Video blob is finalized into an `objectUrl` and offered for download.

The export captures the **rendered visualizer canvas only** — not the surrounding UI. Audio is captured separately and muxed into the same MediaRecorder stream when an audio source is present.

---

## MediaRecorder Contract

```ts
// src/lib/recorder.ts
export interface RecordingOptions {
  duration: number              // seconds, 0 = manual stop only
  frameRate: number             // default 30
  videoBitsPerSecond: number    // default 5_000_000 (5 Mbps)
  mimeType: 'video/webm;codecs=vp9' | 'video/webm'
}

export interface RecordingState {
  status: 'idle' | 'recording' | 'processing' | 'done' | 'error'
  progress: number              // 0–100
  error: string | null
  blobUrl: string | null
}

export function startRecording(
  canvas: HTMLCanvasElement,
  options: RecordingOptions,
  onStateChange: (state: RecordingState) => void,
): () => void                    // returns stopRecording function
```

Behavior:

- The returned function is the **stop handle** — call it to end the recording early. Always returned synchronously so the caller can wire it to a stop button before the recorder transitions to `recording`.
- `onStateChange` is invoked on every status transition (`idle` → `recording` → `processing` → `done` / `error`) and at most ~10 Hz while recording for `progress` updates (not per frame).
- On `done`, `blobUrl` is an `URL.createObjectURL(blob)` ready for `<a download>`. The caller owns the lifecycle and must `URL.revokeObjectURL` after the user downloads or dismisses.
- On `error`, `error` is the user-readable message; `blobUrl` is null.
- If `duration > 0`, the function sets a `setTimeout` that calls stop internally. The stop handle is still safe to invoke before that timeout fires.

Capability detection:

```ts
export function pickSupportedMimeType(): RecordingOptions['mimeType'] {
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9'
  return 'video/webm'
}
```

Safari does not implement `MediaRecorder` for canvas streams. The UI must gate this with a feature check and surface a "Not supported in Safari — use Chrome/Edge/Firefox" message. Server-side rendering is Phase 15.

---

## Export Store

```ts
// src/store/useExportStore.ts
import type { RecordingOptions, RecordingState } from '@/lib/recorder'

export interface ExportStore {
  isOpen: boolean
  state: RecordingState
  options: RecordingOptions
  open: () => void
  close: () => void
  setOptions: (opts: Partial<RecordingOptions>) => void
  setState: (state: Partial<RecordingState>) => void
  reset: () => void
}
```

Defaults:

```ts
const DEFAULT_OPTIONS: RecordingOptions = {
  duration: 30,                          // 30 s default; 0 means manual
  frameRate: 30,
  videoBitsPerSecond: 5_000_000,
  mimeType: pickSupportedMimeType(),
}

const DEFAULT_STATE: RecordingState = {
  status: 'idle',
  progress: 0,
  error: null,
  blobUrl: null,
}
```

`close()` is a soft hide — it does **not** stop an in-progress recording. The user can reopen the modal to see progress / cancel. `reset()` clears state + revokes any existing `blobUrl`.

---

## Canvas Access Contract

The recorder needs the raw `HTMLCanvasElement` to call `captureStream()`. Refs don't cross the React → vanilla boundary cleanly, so use a tiny module-level registry:

```ts
// src/lib/canvasRegistry.ts
let _canvas: HTMLCanvasElement | null = null

export const canvasRegistry = {
  set: (canvas: HTMLCanvasElement | null) => {
    _canvas = canvas
  },
  get: (): HTMLCanvasElement | null => _canvas,
}
```

`VisualizerCanvas` must call `canvasRegistry.set(canvasRef.current)` after mount and `canvasRegistry.set(null)` on unmount:

```tsx
// inside VisualizerCanvas useEffect that already runs after mount:
useEffect(() => {
  canvasRegistry.set(canvasRef.current)
  return () => canvasRegistry.set(null)
}, [canvasRef])
```

The recorder reads via `canvasRegistry.get()` and surfaces a friendly error if it's null (e.g. user tried to export before loading audio).

---

## ExportModal UI

New component [src/components/export/ExportModal.tsx](src/components/export/ExportModal.tsx):

- **Format** — single-select segmented control: `WebM (VP9)` (default) / `WebM`
- **Quality** — single-select segmented control mapping to `videoBitsPerSecond`:
  - `Low` — 2 Mbps
  - `Medium` — 5 Mbps (default)
  - `High` — 10 Mbps
- **Duration** — segmented: `15s` / `30s` (default) / `60s` / `Manual`
- **Start Recording** button — full-width gradient. While recording, replaced by **Stop** + progress bar.
- **Download** button appears on `status === 'done'` — triggers `<a download="auspec-export.webm" href={blobUrl}>` click.
- Browser compatibility note: small "Recording works in Chrome / Edge / Firefox" footer.

---

## TopBar Wiring

In [src/pages/StudioPage.tsx](src/pages/StudioPage.tsx), the existing Export button (currently `disabled={!hasAudio}`) becomes:

- **Disabled when** `!hasAudio` — keeps the current "Upload audio first" tooltip
- **Click** → `useExportStore.getState().open()`

ExportModal mounts inside StudioPage (same pattern as AuthModal).

---

## File Naming

Default download filename:

```
auspec-{format.id}-{timestamp}.webm
```

Example: `auspec-youtube-20260521-143022.webm`. Implementation: `format` from `useFormatStore`, timestamp from `new Date().toISOString().replace(/[:.T-]/g, '').slice(0, 14)`.

---

## Browser Limits

| Browser | Status |
|---------|--------|
| Chrome / Edge | ✅ Full support (VP9) |
| Firefox | ✅ Full support (VP8/VP9) |
| Safari | ❌ `MediaRecorder` on canvas streams not supported — show fallback message |

`MAX_DURATION = 300` seconds (5 min) — guard rail to prevent runaway recordings eating memory. Anything longer needs server-side rendering (Phase 15).

---

## Performance

- The visualizer's existing rAF loop continues to run; `captureStream()` taps frames as they're painted. No double-rendering.
- `frameRate: 30` is a request; the actual capture rate matches the rAF cadence (~60 fps on capable machines). MediaRecorder downsamples if needed.
- Avoid `getImageData` / `toDataURL` calls during recording — they force CPU readback and stall the GPU pipeline.

---

## Future / Out of Scope

- MP4 export (requires ffmpeg.wasm or server-side render) — Phase 15
- Custom resolutions independent of the format (e.g. 4K export for Pro) — Phase 13
- Watermark overlay for free tier — Phase 13
- Audio-only / video-only modes — not planned
