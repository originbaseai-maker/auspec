# Phase 2 — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> These contracts define the boundaries between parallel agents working on
> Phase 2 (Audio Upload + Playback). Treat as frozen.

---

## Audio File Type

```ts
// src/types/audio.ts
export interface AudioFile {
  file: File
  name: string
  duration: number        // seconds
  size: number            // bytes
  format: 'mp3' | 'wav' | 'm4a' | 'flac' | 'unknown'
  objectUrl: string       // URL.createObjectURL result
}
```

---

## Audio Store Shape (Zustand)

```ts
// src/store/useAudioStore.ts
interface AudioStore {
  audioFile: AudioFile | null
  isPlaying: boolean
  currentTime: number       // seconds
  duration: number          // seconds
  volume: number            // 0–1, default 1
  audioElement: HTMLAudioElement | null

  setAudioFile: (file: AudioFile | null) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setAudioElement: (el: HTMLAudioElement | null) => void
}
```

---

## Hook Contract

```ts
// src/hooks/useAudioPlayer.ts
export function useAudioPlayer(): {
  audioRef: React.RefObject<HTMLAudioElement>
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  formatTime: (seconds: number) => string  // "3:45"
}
```

---

## Upload Component Contract

```ts
// src/components/audio/AudioUploader.tsx
export default function AudioUploader(): JSX.Element
```

- Accepts: `mp3`, `wav`, `m4a`, `flac`
- Drag & drop **plus** click to upload
- On valid file → calls `useAudioStore.setAudioFile()`
- On invalid file → shows error toast / inline message

---

## Player Component Contract

```ts
// src/components/audio/AudioPlayer.tsx
export default function AudioPlayer(): JSX.Element
```

- Renders inside the existing `AudioPlayerBar` slot (Phase 1 layout)
- Shows: play / pause, seek bar, current time, duration, volume, filename
- Hidden when there is no `audioFile` in the store

---

## Accepted Formats

| Extension | MIME type |
|-----------|-----------|
| `.mp3` | `audio/mpeg` |
| `.wav` | `audio/wav` |
| `.m4a` | `audio/mp4` |
| `.flac` | `audio/flac` |

---

## Max File Size

- **200 MB** client-side limit (no backend yet — file stays in memory / object URL)
