# Phase 2 — Audio Upload + Playback

## Goal
Users can upload and play audio files locally in the browser.

## Status
- [x] In Progress

## Tasks
- [ ] Drag and drop upload zone
- [ ] File picker fallback
- [ ] Accept: mp3, wav, m4a, flac
- [ ] Show filename after upload
- [ ] Audio player with:
  - [ ] Play / Pause
  - [ ] Seek bar
  - [ ] Current time display
  - [ ] Duration display

## Important
Audio stays local only. No cloud storage in this phase.

## Dependencies
- Phase 1 complete

## Implementation Notes

### Agent 1 (this PR) — Types + Audio Store
- `src/types/audio.ts` — `AudioFile` interface (matches Phase2-Contracts.md), `AudioFormat` union, format detection (`detectFormat`), validation (`isValidAudioFile`), human-readable size (`formatFileSize`), `MAX_FILE_SIZE = 200 MB`, `ACCEPTED_FORMATS`, `ACCEPTED_MIME_TYPES`.
- `src/store/useAudioStore.ts` — Zustand store with the locked shape (`audioFile`, `isPlaying`, `currentTime`, `duration`, `volume`, `audioElement` + setters). Adds `cleanup()` that revokes the current `objectUrl` to prevent memory leaks. `setAudioFile` also revokes the previous `objectUrl` when replacing a file, and resets playback state to a fresh start.
- `volume` is clamped to `[0, 1]` in the setter.

### Boundaries
- Format detection uses **both** file extension and MIME type — some browsers send empty/odd MIME types, so the extension fallback matters (e.g. `.m4a` often shows as `audio/mp4`).
- Object URL lifecycle is owned by the store. UI / hook code MUST go through `setAudioFile` or `cleanup` so we don't leak blobs.
- Store is intentionally decoupled from `HTMLAudioElement` mechanics. The element ref lives in the player hook (Agent 3); the store only holds a reference for components that need to subscribe to playback state.

### Open for later agents
- Agent 2: `AudioUploader` (drop zone + file picker, validates with `isValidAudioFile`, enforces `MAX_FILE_SIZE`, builds `AudioFile`, calls `setAudioFile`).
- Agent 3: `useAudioPlayer` hook + `AudioPlayer` component (wires `audioElement` events to store).
- Agent 4: Studio page integration / `AudioPlayerBar` slot.

## Notes
